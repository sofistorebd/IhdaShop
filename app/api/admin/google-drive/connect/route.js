import crypto from "crypto";
import { authorizeAdminRequest } from "@/lib/admin-request";
import { backupServerConfig, saveOAuthState } from "@/lib/backup-db";
import { googleAuthorizationUrl, googleRedirectUri } from "@/lib/google-drive";

export async function GET(req) {
  const denied = await authorizeAdminRequest(req);
  if (denied) return denied;
  const config = backupServerConfig();
  if (!config.database || !config.googleOAuth || !config.encryption) {
    return Response.redirect(new URL("/admin/backups?error=server_config", req.url), 302);
  }
  const state = crypto.randomBytes(32).toString("hex");
  const stateHash = crypto.createHash("sha256").update(state).digest("hex");
  await saveOAuthState(stateHash);
  const redirectUri = googleRedirectUri(req.url);
  return Response.redirect(googleAuthorizationUrl({ state, redirectUri }), 302);
}
