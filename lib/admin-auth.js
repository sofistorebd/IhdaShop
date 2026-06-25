// অ্যাডমিন পাসওয়ার্ড যাচাই/পরিবর্তন (Node side, DB ব্যবহার করে)
import crypto from "crypto";
import { sql, hasDb } from "./db";

function hashPw(p) {
  const key =
    process.env.ENCRYPTION_KEY ||
    process.env.ADMIN_PASSWORD ||
    "ihda-shop-default";
  return crypto.createHash("sha256").update("pw:" + key + ":" + p).digest("hex");
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
  if (sh) return hashPw(input) === sh; // DB তে সেট করা পাসওয়ার্ড
  const envp = process.env.ADMIN_PASSWORD || ""; // fallback env
  return Boolean(envp) && input === envp;
}

export async function setAdminPassword(next) {
  await ensure();
  const h = hashPw(next);
  await sql`
    INSERT INTO settings (key, value) VALUES ('adminPasswordHash', ${h})
    ON CONFLICT (key) DO UPDATE SET value = ${h}
  `;
}

export async function adminPasswordIsCustom() {
  return Boolean(await storedHash());
}
