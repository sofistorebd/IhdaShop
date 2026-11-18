import { createHash } from "node:crypto";
import { sql } from "./db";

export const ADMIN_COOKIE = "store_admin";
export const SESSION_SECONDS = 7 * 24 * 60 * 60;

export function sessionHash(token) {
  return createHash("sha256").update(token).digest("hex");
}

export async function validSession(token) {
  if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token)) return false;
  try {
    const rows = await sql`SELECT 1 FROM admin_sessions WHERE token_hash = ${sessionHash(token)} AND expires_at > now()`;
    return rows.length > 0;
  } catch { return false; }
}

export async function revokeSession(token) {
  if (token) await sql`DELETE FROM admin_sessions WHERE token_hash = ${sessionHash(token)}`;
}
