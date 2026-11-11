import { authorizeAdminRequest } from "@/lib/admin-request";
import { getBackupStatus } from "@/lib/backup-db";

export async function GET(req) {
  const denied = await authorizeAdminRequest(req);
  if (denied) return denied;
  try {
    return Response.json({ ok: true, status: await getBackupStatus() });
  } catch (error) {
    return Response.json({ ok: false, error: error?.message || "Backup status unavailable" }, { status: 500 });
  }
}
