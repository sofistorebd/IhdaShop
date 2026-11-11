import { authorizeAdminRequest } from "@/lib/admin-request";
import { runGoogleDriveBackup } from "@/lib/backup-service";

export async function POST(req) {
  const denied = await authorizeAdminRequest(req, { mutation: true });
  if (denied) return denied;
  try {
    const result = await runGoogleDriveBackup({ force: true });
    return Response.json(result);
  } catch (error) {
    return Response.json({ ok: false, error: error?.message || "Backup failed" }, { status: 500 });
  }
}
