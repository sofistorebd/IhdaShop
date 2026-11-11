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

export async function authorizeAdminRequest(req, { mutation = false } = {}) {
  if (!await adminSessionIsValid(req)) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  if (mutation) {
    const origin = req.headers.get("origin");
    const expectedOrigin = new URL(req.url).origin;
    const actionHeader = req.headers.get("x-admin-action");
    if (origin !== expectedOrigin || actionHeader !== "google-drive-backup") {
      return Response.json({ ok: false, error: "invalid request origin" }, { status: 403 });
    }
  }
  return null;
}
