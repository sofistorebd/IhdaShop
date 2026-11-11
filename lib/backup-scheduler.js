import { runGoogleDriveBackup } from "./backup-service";

const SCHEDULER_KEY = Symbol.for("ihdashop.google-drive-backup-scheduler");

export function startBackupScheduler() {
  if (process.env.NODE_ENV !== "production" || process.env.BACKUP_SCHEDULER_ENABLED === "false") return;
  if (globalThis[SCHEDULER_KEY]) return;
  globalThis[SCHEDULER_KEY] = true;

  const check = async () => {
    try {
      await runGoogleDriveBackup();
    } catch (error) {
      console.error("Automatic Google Drive backup failed:", error?.message || error);
    }
  };

  const first = setTimeout(check, 75 * 1000);
  first.unref?.();
  const hourly = setInterval(check, 60 * 60 * 1000);
  hourly.unref?.();
}
