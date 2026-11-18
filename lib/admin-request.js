import { ADMIN_COOKIE, validSession } from "./auth";

export function adminSessionIsValid(req) {
  return validSession(req.cookies?.get(ADMIN_COOKIE)?.value);
}

function adminRequestOrigin(req, action) {
  // Coolify can expose an internal HTTP address in req.url. Prefer the
  // configured public callback; never trust client-supplied forwarded headers.
  const env = process.env;
  const configuredUrl = action === "google-drive-backup"
    ? env.GOOGLE_OAUTH_REDIRECT_URI || env.NEXT_PUBLIC_SITE_URL
    : env.NEXT_PUBLIC_SITE_URL || env.GOOGLE_OAUTH_REDIRECT_URI;
  try {
    const url = new URL(configuredUrl || req.url);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) return null;
    return url.origin;
  } catch {
    return null;
  }
}

export async function authorizeAdminRequest(req, { mutation = false, action = "google-drive-backup" } = {}) {
  if (!await adminSessionIsValid(req)) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  if (mutation) {
    const origin = req.headers.get("origin");
    const expectedOrigin = adminRequestOrigin(req, action);
    const actionHeader = req.headers.get("x-admin-action");
    if (!expectedOrigin || origin !== expectedOrigin || actionHeader !== action) {
      return Response.json({ ok: false, error: "invalid request origin" }, { status: 403 });
    }
  }
  return null;
}
