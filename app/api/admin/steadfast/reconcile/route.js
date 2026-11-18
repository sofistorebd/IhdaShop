import { authorizeAdminRequest } from "@/lib/admin-request";
import { reconcileDispatch } from "@/lib/dispatch";

export async function POST(req) {
  const denied = await authorizeAdminRequest(req, { mutation: true, action: "reconcile-dispatch" });
  if (denied) return denied;
  const { id, result, tracking } = await req.json().catch(() => ({}));
  if (!Number.isSafeInteger(id) || id <= 0 || !(result === "NONE" || /^[1-9]\d{0,19}$/.test(result || "")) ||
      typeof tracking !== "string" || tracking.length > 120) {
    return Response.json({ error: "সঠিক কুরিয়ার তথ্য দিন।" }, { status: 400 });
  }
  const ok = await reconcileDispatch(id, result === "NONE" ? null : String(result), result === "NONE" ? null : tracking || null);
  return ok ? Response.json({ ok }) : Response.json({ error: "বুকিং শুরুর পাঁচ মিনিট পর তালিকা রিফ্রেশ করে যাচাই করুন।" }, { status: 409 });
}
