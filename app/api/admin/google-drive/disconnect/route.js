import { authorizeAdminRequest } from "@/lib/admin-request";
import { disconnectGoogleDrive } from "@/lib/backup-db";

export async function DELETE(req) {
  const denied = await authorizeAdminRequest(req, { mutation: true });
  if (denied) return denied;
  try {
    await disconnectGoogleDrive();
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ ok: false, error: error?.message || "Disconnect failed" }, { status: 500 });
  }
}
