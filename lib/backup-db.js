import { decrypt, encrypt } from "./crypto";
import { hasDb, sql } from "./db";

let ready = null;

export function backupServerConfig() {
  return {
    database: hasDb(),
    googleOAuth: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    encryption: Boolean(process.env.BACKUP_ENCRYPTION_KEY || process.env.ENCRYPTION_KEY),
  };
}

export async function ensureBackupSchema() {
  if (ready) return ready;
  ready = (async () => {
    await sql`
      CREATE TABLE IF NOT EXISTS backup_config (
        id                    SMALLINT PRIMARY KEY CHECK (id = 1),
        google_refresh_token  TEXT,
        google_email          TEXT,
        drive_folder_id       TEXT,
        enabled               BOOLEAN NOT NULL DEFAULT false,
        connected_at          TIMESTAMPTZ,
        oauth_state_hash      TEXT,
        oauth_state_expires   TIMESTAMPTZ,
        running_since         TIMESTAMPTZ,
        last_attempt_at       TIMESTAMPTZ,
        last_success_at       TIMESTAMPTZ,
        last_file_id          TEXT,
        last_file_name        TEXT,
        last_file_size        BIGINT,
        last_checksum         TEXT,
        retained_count        INTEGER NOT NULL DEFAULT 0,
        last_error            TEXT
      )
    `;
    await sql`INSERT INTO backup_config (id) VALUES (1) ON CONFLICT (id) DO NOTHING`;
  })().catch((error) => {
    ready = null;
    throw error;
  });
  return ready;
}

function publicStatus(row = {}) {
  const server = backupServerConfig();
  return {
    connected: Boolean(row.enabled && row.google_refresh_token),
    email: row.google_email || "",
    folderId: row.drive_folder_id || "",
    lastAttemptAt: row.last_attempt_at || null,
    lastSuccessAt: row.last_success_at || null,
    lastFileName: row.last_file_name || "",
    lastFileSize: Number(row.last_file_size) || 0,
    lastChecksum: row.last_checksum || "",
    retainedCount: Number(row.retained_count) || 0,
    running: Boolean(row.running_since && Date.now() - new Date(row.running_since).getTime() < 2 * 60 * 60 * 1000),
    lastError: row.last_error || "",
    server,
    ready: server.database && server.googleOAuth && server.encryption,
  };
}

export async function getBackupStatus() {
  if (!hasDb()) return publicStatus();
  await ensureBackupSchema();
  const rows = await sql`SELECT * FROM backup_config WHERE id = 1`;
  return publicStatus(rows[0]);
}

export async function saveOAuthState(stateHash) {
  await ensureBackupSchema();
  await sql`
    UPDATE backup_config
    SET oauth_state_hash = ${stateHash},
        oauth_state_expires = now() + interval '10 minutes'
    WHERE id = 1
  `;
}

export async function consumeOAuthState(stateHash) {
  await ensureBackupSchema();
  const rows = await sql`
    UPDATE backup_config
    SET oauth_state_hash = NULL, oauth_state_expires = NULL
    WHERE id = 1
      AND oauth_state_hash = ${stateHash}
      AND oauth_state_expires > now()
    RETURNING id
  `;
  return Boolean(rows[0]);
}

export async function saveGoogleConnection({ refreshToken, email }) {
  await ensureBackupSchema();
  const token = encrypt(refreshToken);
  await sql`
    UPDATE backup_config
    SET google_refresh_token = ${token},
        google_email = ${email || ""},
        drive_folder_id = NULL,
        enabled = true,
        connected_at = now(),
        running_since = NULL,
        last_attempt_at = NULL,
        last_success_at = NULL,
        last_file_id = NULL,
        last_file_name = NULL,
        last_file_size = NULL,
        last_checksum = NULL,
        retained_count = 0,
        last_error = NULL
    WHERE id = 1
  `;
}

export async function disconnectGoogleDrive() {
  await ensureBackupSchema();
  await sql`
    UPDATE backup_config
    SET google_refresh_token = NULL,
        google_email = NULL,
        drive_folder_id = NULL,
        enabled = false,
        running_since = NULL,
        oauth_state_hash = NULL,
        oauth_state_expires = NULL,
        last_error = NULL
    WHERE id = 1
  `;
}

export async function claimBackup({ force = false } = {}) {
  await ensureBackupSchema();
  const rows = force
    ? await sql`
        UPDATE backup_config
        SET running_since = now(), last_attempt_at = now(), last_error = NULL
        WHERE id = 1 AND enabled = true AND google_refresh_token IS NOT NULL
          AND (running_since IS NULL OR running_since < now() - interval '2 hours')
        RETURNING *
      `
    : await sql`
        UPDATE backup_config
        SET running_since = now(), last_attempt_at = now(), last_error = NULL
        WHERE id = 1 AND enabled = true AND google_refresh_token IS NOT NULL
          AND (running_since IS NULL OR running_since < now() - interval '2 hours')
          AND (last_success_at IS NULL OR last_success_at < now() - interval '24 hours')
        RETURNING *
      `;
  if (!rows[0]) return null;
  return {
    refreshToken: decrypt(rows[0].google_refresh_token),
    folderId: rows[0].drive_folder_id || "",
    email: rows[0].google_email || "",
  };
}

export async function finishBackupSuccess({ folderId, file, retainedCount, warning = "" }) {
  await ensureBackupSchema();
  await sql`
    UPDATE backup_config
    SET drive_folder_id = ${folderId},
        running_since = NULL,
        last_success_at = now(),
        last_file_id = ${file.id},
        last_file_name = ${file.name},
        last_file_size = ${Number(file.size) || 0},
        last_checksum = ${file.md5Checksum || ""},
        retained_count = ${retainedCount},
        last_error = ${warning}
    WHERE id = 1
  `;
}

export async function finishBackupFailure(error) {
  await ensureBackupSchema();
  const message = String(error?.message || error || "Backup failed").slice(0, 1000);
  await sql`
    UPDATE backup_config
    SET running_since = NULL, last_error = ${message}
    WHERE id = 1
  `;
}
