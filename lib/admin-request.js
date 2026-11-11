import crypto from "crypto";
import { ADMIN_COOKIE, sessionToken } from "./auth";

function equalSecret(a, b) {
  const left = Buffer.from(String(a || ""));
  const right = Buffer.from(String(b || ""));
  return left.length === right.length && left.length > 0 && crypto.timingSafeEqual(left, right);
}

export async function adminSessionIsValid(req) {
  const expected = await sessionToken();
  const cookie = req.cookies?.get(ADMIN_COOKIE)?.value || "";
  return Boolean(expected) && equalSecret(cookie, expected);
}

function backupRequestOrigin(req) {
  // Coolify can expose an internal HTTP address in req.url. Prefer the
  // configured public callback; never trust client-supplied forwarded headers.
  const env = process.env;
  const configuredUrl = env.GOOGLE_OAUTH_REDIRECT_URI || env.NEXT_PUBLIC_SITE_URL;
  try {
    const url = new URL(configuredUrl || req.url);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) return null;
    return url.origin;
  } catch {
    return null;
  }
}

export async function authorizeAdminRequest(req, { mutation = false } = {}) {
  if (!await adminSessionIsValid(req)) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  if (mutation) {
    const origin = req.headers.get("origin");
    const expectedOrigin = backupRequestOrigin(req);
    const actionHeader = req.headers.get("x-admin-action");
    if (!expectedOrigin || origin !== expectedOrigin || actionHeader !== "google-drive-backup") {
      return Response.json({ ok: false, error: "invalid request origin" }, { status: 403 });
    }
  }
  return null;
}
