import crypto from "crypto";
import { createReadStream } from "fs";
import { stat } from "fs/promises";
import { Readable } from "stream";

const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";
const GOOGLE_SCOPES = `openid email ${DRIVE_SCOPE}`;

function credentials() {
  const clientId = process.env.GOOGLE_CLIENT_ID || "";
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || "";
  if (!clientId || !clientSecret) throw new Error("Google OAuth credentials are not configured");
  return { clientId, clientSecret };
}

export function googleRedirectUri(requestUrl) {
  return process.env.GOOGLE_OAUTH_REDIRECT_URI || new URL(
    "/api/admin/google-drive/callback",
    requestUrl
  ).toString();
}

export function googleAuthorizationUrl({ state, redirectUri }) {
  const { clientId } = credentials();
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: GOOGLE_SCOPES,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  }).toString();
  return url.toString();
}

async function tokenRequest(params) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params),
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || "Google token request failed");
  }
  return data;
}

export async function exchangeGoogleCode({ code, redirectUri }) {
  const { clientId, clientSecret } = credentials();
  return tokenRequest({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });
}

export async function refreshGoogleAccessToken(refreshToken) {
  const { clientId, clientSecret } = credentials();
  const data = await tokenRequest({
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "refresh_token",
  });
  return data.access_token;
}

export async function googleAccountEmail(accessToken) {
  const response = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error("Connected Google account could not be read");
  return data.email || "";
}

async function driveJson(url, accessToken, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
    cache: "no-store",
  });
  const data = response.status === 204 ? null : await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = data?.error?.message || data?.error_description || `Google Drive error ${response.status}`;
    throw new Error(detail);
  }
  return data;
}

function clientIdentity() {
  const source = process.env.BACKUP_CLIENT_KEY || process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.GOOGLE_OAUTH_REDIRECT_URI || "ihdashop-client";
  return crypto.createHash("sha256").update(source).digest("hex").slice(0, 24);
}

function folderName() {
  const raw = process.env.BACKUP_CLIENT_NAME || process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.GOOGLE_OAUTH_REDIRECT_URI || "IhdaShop";
  let name = raw;
  try { name = new URL(raw).hostname; } catch { /* use configured name */ }
  return `IhdaShop Backups - ${String(name).replace(/[^a-zA-Z0-9._ -]/g, "_").slice(0, 80)}`;
}

function quoteQuery(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

export async function ensureBackupFolder(accessToken, storedFolderId = "") {
  if (storedFolderId) {
    try {
      const file = await driveJson(
        `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(storedFolderId)}?fields=id,name,mimeType,trashed`,
        accessToken
      );
      if (!file.trashed && file.mimeType === "application/vnd.google-apps.folder") return file.id;
    } catch {
      // Folder may have been deleted or the account may have been reconnected.
    }
  }

  const identity = clientIdentity();
  const query = `mimeType='application/vnd.google-apps.folder' and trashed=false and appProperties has { key='ihdaBackupClient' and value='${identity}' }`;
  const found = await driveJson(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&spaces=drive&pageSize=10&fields=files(id,name)`,
    accessToken
  );
  if (found.files?.[0]?.id) return found.files[0].id;

  const created = await driveJson(
    "https://www.googleapis.com/drive/v3/files?fields=id,name",
    accessToken,
    {
      method: "POST",
      body: JSON.stringify({
        name: folderName(),
        mimeType: "application/vnd.google-apps.folder",
        appProperties: { ihdaBackupClient: identity },
      }),
    }
  );
  return created.id;
}

export async function uploadBackupFile({ accessToken, folderId, filePath, fileName }) {
  const info = await stat(filePath);
  const metadata = {
    name: fileName,
    parents: [folderId],
    mimeType: "application/octet-stream",
    appProperties: { ihdaBackup: "daily", format: "encrypted-v1" },
  };
  const init = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,name,size,md5Checksum,createdTime",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Type": "application/octet-stream",
        "X-Upload-Content-Length": String(info.size),
      },
      body: JSON.stringify(metadata),
    }
  );
  if (!init.ok) {
    const data = await init.json().catch(() => ({}));
    throw new Error(data?.error?.message || "Google Drive upload could not start");
  }
  const sessionUrl = init.headers.get("location");
  if (!sessionUrl) throw new Error("Google Drive did not return an upload session");

  const body = Readable.toWeb(createReadStream(filePath));
  const uploaded = await fetch(sessionUrl, {
    method: "PUT",
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Length": String(info.size),
    },
    body,
    duplex: "half",
  });
  const data = await uploaded.json().catch(() => ({}));
  if (!uploaded.ok || !data.id) {
    throw new Error(data?.error?.message || "Google Drive upload failed");
  }
  return data;
}

export async function verifyDriveFile({ accessToken, fileId, expectedSize, expectedMd5 }) {
  const file = await driveJson(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?fields=id,name,size,md5Checksum,createdTime,trashed`,
    accessToken
  );
  if (file.trashed || Number(file.size) !== Number(expectedSize) || file.md5Checksum !== expectedMd5) {
    throw new Error("Uploaded backup verification failed");
  }
  return file;
}

export async function enforceSevenBackupRetention({ accessToken, folderId }) {
  const query = `'${quoteQuery(folderId)}' in parents and trashed=false and appProperties has { key='ihdaBackup' and value='daily' }`;
  const data = await driveJson(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&spaces=drive&orderBy=createdTime%20desc&pageSize=100&fields=files(id,name,createdTime,size,md5Checksum)`,
    accessToken
  );
  const files = data.files || [];
  const expired = files.slice(7);
  for (const file of expired) {
    await driveJson(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(file.id)}`,
      accessToken,
      { method: "DELETE" }
    );
  }
  return { retainedCount: Math.min(files.length, 7), deleted: expired.length };
}
