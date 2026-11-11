import crypto from "crypto";
import { authorizeAdminRequest } from "@/lib/admin-request";
import { consumeOAuthState, saveGoogleConnection } from "@/lib/backup-db";
import { exchangeGoogleCode, googleAccountEmail, googleRedirectUri } from "@/lib/google-drive";

function back(req, result) {
  return Response.redirect(new URL(`/admin/backups?${result}`, req.url), 302);
}

export async function GET(req) {
  const denied = await authorizeAdminRequest(req);
  if (denied) return denied;
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (url.searchParams.get("error")) return back(req, "error=google_denied");
  if (!code || !state) return back(req, "error=invalid_callback");

  const stateHash = crypto.createHash("sha256").update(state).digest("hex");
  if (!await consumeOAuthState(stateHash)) return back(req, "error=invalid_state");

  try {
    const tokens = await exchangeGoogleCode({ code, redirectUri: googleRedirectUri(req.url) });
    if (!tokens.refresh_token) throw new Error("Google did not provide offline access");
    const email = await googleAccountEmail(tokens.access_token);
    await saveGoogleConnection({ refreshToken: tokens.refresh_token, email });
    return back(req, "connected=1");
  } catch (error) {
    console.error("Google Drive connection failed:", error?.message || error);
    return back(req, "error=connection_failed");
  }
}
