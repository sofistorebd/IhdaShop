// অ্যাডমিন পাসওয়ার্ড যাচাই/পরিবর্তন (Node side, DB ব্যবহার করে)
import crypto from "crypto";
import { sql, hasDb } from "./db";

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

async function storedHash() {
  if (!hasDb()) return null;
  try {
    await ensure();
    const r = await sql`SELECT value FROM settings WHERE key = 'adminPasswordHash'`;
    return r[0]?.value || null;
  } catch {
    return null;
  }
}

export async function verifyAdminPassword(input) {
  if (!input) return false;
  const sh = await storedHash();
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

export async function setAdminPassword(next) {
  await ensure();
  const salt = crypto.randomBytes(8).toString("hex");
  const h = `v2:${salt}:${hashPwV2(next, salt)}`;
  await sql`
    INSERT INTO settings (key, value) VALUES ('adminPasswordHash', ${h})
    ON CONFLICT (key) DO UPDATE SET value = ${h}
  `;
}

export async function adminPasswordIsCustom() {
  return Boolean(await storedHash());
}
