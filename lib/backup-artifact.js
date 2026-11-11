import crypto from "crypto";
import { execFile } from "child_process";
import { createReadStream, createWriteStream } from "fs";
import { access, appendFile, cp, mkdir, mkdtemp, open, readFile, rm, stat, writeFile } from "fs/promises";
import os from "os";
import path from "path";
import { pipeline } from "stream/promises";
import { promisify } from "util";
import { getConnectionString } from "./db";

const runFile = promisify(execFile);
const MAGIC = Buffer.from("IHDA-BACKUP-V1\0", "ascii");
const IV_BYTES = 12;
const TAG_BYTES = 16;

function backupKey() {
  const secret = process.env.BACKUP_ENCRYPTION_KEY || process.env.ENCRYPTION_KEY;
  if (!secret) throw new Error("BACKUP_ENCRYPTION_KEY or ENCRYPTION_KEY is not configured");
  return crypto.createHash("sha256").update(secret).digest();
}

async function command(command, args, options = {}) {
  try {
    return await runFile(command, args, {
      timeout: 30 * 60 * 1000,
      maxBuffer: 16 * 1024 * 1024,
      windowsHide: true,
      ...options,
    });
  } catch (error) {
    const detail = String(error?.stderr || error?.message || error).trim().slice(0, 700);
    throw new Error(`${path.basename(command)} failed: ${detail}`);
  }
}

function postgresEnvironment(connectionString) {
  const url = new URL(connectionString);
  const sslMode = url.searchParams.get("sslmode") ||
    (process.env.PGSSL === "true" ? "require" : process.env.PGSSL === "false" ? "disable" : "prefer");
  return {
    ...process.env,
    PGHOST: url.hostname,
    PGPORT: url.port || "5432",
    PGUSER: decodeURIComponent(url.username),
    PGPASSWORD: decodeURIComponent(url.password),
    PGDATABASE: decodeURIComponent(url.pathname.replace(/^\//, "")),
    PGSSLMODE: sslMode,
  };
}

async function hashFile(file, algorithm = "sha256") {
  const hash = crypto.createHash(algorithm);
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest("hex");
}

async function directoryStats(dir) {
  const fs = await import("fs/promises");
  let files = 0;
  let bytes = 0;
  async function walk(current) {
    for (const entry of await fs.readdir(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (entry.isFile()) {
        files += 1;
        bytes += (await fs.stat(full)).size;
      }
    }
  }
  try { await walk(dir); } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  return { files, bytes };
}

export async function encryptBackupFile(source, destination) {
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv("aes-256-gcm", backupKey(), iv);
  await writeFile(destination, Buffer.concat([MAGIC, iv]));
  await pipeline(createReadStream(source), cipher, createWriteStream(destination, { flags: "a" }));
  await appendFile(destination, cipher.getAuthTag());
}

export async function decryptBackupFile(source, destination) {
  const info = await stat(source);
  const headerLength = MAGIC.length + IV_BYTES;
  if (info.size <= headerLength + TAG_BYTES) throw new Error("Encrypted backup is incomplete");
  const handle = await open(source, "r");
  try {
    const header = Buffer.alloc(headerLength);
    const tag = Buffer.alloc(TAG_BYTES);
    await handle.read(header, 0, header.length, 0);
    await handle.read(tag, 0, tag.length, info.size - TAG_BYTES);
    if (!header.subarray(0, MAGIC.length).equals(MAGIC)) throw new Error("Unknown backup format");
    const iv = header.subarray(MAGIC.length);
    const decipher = crypto.createDecipheriv("aes-256-gcm", backupKey(), iv);
    decipher.setAuthTag(tag);
    await pipeline(
      createReadStream(source, { start: headerLength, end: info.size - TAG_BYTES - 1 }),
      decipher,
      createWriteStream(destination)
    );
  } finally {
    await handle.close();
  }
}

async function verifyEncryptedBackup(encryptedFile, verifyRoot) {
  const archive = path.join(verifyRoot, "verify.tar.gz");
  const extracted = path.join(verifyRoot, "extracted");
  await mkdir(extracted, { recursive: true });
  await decryptBackupFile(encryptedFile, archive);
  await command(process.env.TAR_BIN || "tar", ["-xzf", archive, "-C", extracted]);
  const manifest = JSON.parse(await readFile(path.join(extracted, "manifest.json"), "utf8"));
  const databaseFile = path.join(extracted, "database.dump");
  if (manifest.databaseSha256 !== await hashFile(databaseFile)) {
    throw new Error("Local backup checksum verification failed");
  }
  await command(process.env.PG_RESTORE_BIN || "pg_restore", ["--list", databaseFile]);
  return manifest;
}

function backupFileName(date = new Date()) {
  return `ihdashop-${date.toISOString().replace(/[:.]/g, "-")}.tar.gz.enc`;
}

export async function createBackupArtifact() {
  const connectionString = getConnectionString();
  if (!connectionString) throw new Error("DATABASE_URL is not configured");
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "ihdashop-backup-"));
  const contentRoot = path.join(tempRoot, "content");
  const verifyRoot = path.join(tempRoot, "verify");
  const databaseFile = path.join(contentRoot, "database.dump");
  const uploadCopy = path.join(contentRoot, "uploads");
  const plainArchive = path.join(tempRoot, "backup.tar.gz");
  const fileName = backupFileName();
  const encryptedFile = path.join(tempRoot, fileName);

  try {
    await mkdir(contentRoot, { recursive: true });
    await command(process.env.PG_DUMP_BIN || "pg_dump", [
      "--format=custom",
      "--no-owner",
      "--no-acl",
      "--file",
      databaseFile,
    ], { env: postgresEnvironment(connectionString) });

    const uploadDir = process.env.UPLOAD_DIR || "/app/storage/uploads";
    try {
      await access(uploadDir);
      await cp(uploadDir, uploadCopy, { recursive: true, force: false, errorOnExist: true });
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
      await mkdir(uploadCopy, { recursive: true });
    }

    const uploads = await directoryStats(uploadCopy);
    const manifest = {
      format: "ihdashop-backup-v1",
      createdAt: new Date().toISOString(),
      databaseFormat: "PostgreSQL custom dump",
      databaseSha256: await hashFile(databaseFile),
      uploads,
      encrypted: true,
    };
    await writeFile(path.join(contentRoot, "manifest.json"), JSON.stringify(manifest, null, 2));
    await command(process.env.TAR_BIN || "tar", ["-czf", plainArchive, "-C", contentRoot, "."]);
    await encryptBackupFile(plainArchive, encryptedFile);
    await mkdir(verifyRoot, { recursive: true });
    await verifyEncryptedBackup(encryptedFile, verifyRoot);

    const info = await stat(encryptedFile);
    return {
      filePath: encryptedFile,
      fileName,
      size: info.size,
      md5: await hashFile(encryptedFile, "md5"),
      manifest,
      cleanup: () => rm(tempRoot, { recursive: true, force: true }),
    };
  } catch (error) {
    await rm(tempRoot, { recursive: true, force: true }).catch(() => {});
    throw error;
  }
}
