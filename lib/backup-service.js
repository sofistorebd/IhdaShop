import { createBackupArtifact } from "./backup-artifact";
import {
  backupServerConfig,
  claimBackup,
  finishBackupFailure,
  finishBackupSuccess,
} from "./backup-db";
import {
  enforceSevenBackupRetention,
  ensureBackupFolder,
  refreshGoogleAccessToken,
  uploadBackupFile,
  verifyDriveFile,
} from "./google-drive";

export async function runGoogleDriveBackup({ force = false } = {}) {
  const server = backupServerConfig();
  if (!server.database) throw new Error("DATABASE_URL is not configured");
  if (!server.googleOAuth) throw new Error("Google OAuth credentials are not configured");
  if (!server.encryption) throw new Error("Backup encryption key is not configured");

  const connection = await claimBackup({ force });
  if (!connection) return { ok: true, skipped: true, reason: "not-due-or-not-connected" };
  if (!connection.refreshToken) {
    const error = new Error("Google Drive refresh token could not be decrypted");
    await finishBackupFailure(error);
    throw error;
  }

  let artifact;
  try {
    artifact = await createBackupArtifact();
    const accessToken = await refreshGoogleAccessToken(connection.refreshToken);
    const folderId = await ensureBackupFolder(accessToken, connection.folderId);
    const uploaded = await uploadBackupFile({
      accessToken,
      folderId,
      filePath: artifact.filePath,
      fileName: artifact.fileName,
    });
    const verified = await verifyDriveFile({
      accessToken,
      fileId: uploaded.id,
      expectedSize: artifact.size,
      expectedMd5: artifact.md5,
    });

    let retainedCount = 0;
    let warning = "";
    try {
      const retention = await enforceSevenBackupRetention({ accessToken, folderId });
      retainedCount = retention.retainedCount;
    } catch (error) {
      warning = `Backup uploaded and verified, but old backup cleanup failed: ${error.message}`.slice(0, 1000);
    }

    await finishBackupSuccess({ folderId, file: verified, retainedCount, warning });
    return {
      ok: true,
      skipped: false,
      fileName: verified.name,
      size: Number(verified.size) || artifact.size,
      retainedCount,
      warning,
    };
  } catch (error) {
    await finishBackupFailure(error).catch(() => {});
    throw error;
  } finally {
    if (artifact) await artifact.cleanup().catch(() => {});
  }
}
