// অ্যাডমিন পাসওয়ার্ড যাচাই/পরিবর্তন (Node side, DB ব্যবহার করে)
import crypto from "crypto";
import { sql, hasDb, withTransaction } from "./db";

import { sessionHash } from "./auth";

// v1 (পুরোনো): ENCRYPTION_KEY-নির্ভর — key বদলালে lockout হতো
function hashPwV1(p) {
  const key =
    process.env.ENCRYPTION_KEY ||
    process.env.ADMIN_PASSWORD ||
    "store-default";
  return crypto.createHash("sha256").update("pw:" + key + ":" + p).digest("hex");
}

// v2: নিজস্ব random salt — env key বদলালেও পাসওয়ার্ড টিকে থাকে
function hashPwV2(p, salt) {
  return crypto
    .createHash("sha256")
    .update("pw2:" + salt + ":" + p)
    .digest("hex");
}

async function ensure() {
  await sql`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)`;
}

async function storedHash(db = sql) {
  const rows = await db`SELECT value FROM settings WHERE key = 'adminPasswordHash'`;
  return rows[0]?.value || null;
}

function matches(input, sh) {
  if (typeof input !== "string" || !input) return false;
  if (sh) {
    // v2: "v2:<salt>:<hash>" — env-নিরপেক্ষ
    if (sh.startsWith("v2:")) {
      const [, salt, hash] = sh.split(":");
      return hashPwV2(input, salt) === hash;
    }
    return hashPwV1(input) === sh; // পুরোনো ফরম্যাট
  }
  const envp = process.env.ADMIN_PASSWORD || ""; // fallback env
  return Boolean(envp) && input === envp;
}

async function withCredentials(callback) {
  await ensure();
  return withTransaction(async (tx) => {
    await tx`SELECT pg_advisory_xact_lock(734528961)`;
    await tx`CREATE TABLE IF NOT EXISTS admin_sessions (token_hash TEXT PRIMARY KEY, expires_at TIMESTAMPTZ NOT NULL)`;
    return callback(tx, await storedHash(tx));
  });
}

export function loginAdmin(password) {
  return withCredentials(async (tx, current) => {
    if (!matches(password, current)) return null;
    const token = crypto.randomBytes(32).toString("hex");
    await tx`DELETE FROM admin_sessions WHERE expires_at <= now()`;
    await tx`INSERT INTO admin_sessions VALUES (${sessionHash(token)}, now() + interval '7 days')`;
    return token;
  });
}

export function changePassword(current, next) {
  return withCredentials(async (tx, saved) => {
    if (!matches(current, saved)) return false;
    const salt = crypto.randomBytes(16).toString("hex");
    const hash = `v2:${salt}:${hashPwV2(next, salt)}`;
    await tx`INSERT INTO settings (key, value) VALUES ('adminPasswordHash', ${hash})
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`;
    await tx`DELETE FROM admin_sessions`;
    return true;
  });
}

export async function adminPasswordIsCustom() {
  if (!hasDb()) return false;
  await ensure();
  return Boolean(await storedHash());
}
