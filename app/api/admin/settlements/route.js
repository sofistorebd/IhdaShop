import { authorizeAdminRequest } from "@/lib/admin-request";
import { ensureSchema, sql } from "@/lib/db";

export async function POST(req) {
  const denied = await authorizeAdminRequest(req, { mutation: true, action: "record-settlement" });
  if (denied) return denied;
  const { id, amount, reference } = await req.json().catch(() => ({}));
  if (!Number.isSafeInteger(id) || id < 1 || !Number.isSafeInteger(amount) || amount < 0 || amount > 2147483647 ||
      typeof reference !== "string" || !reference.trim() || reference.length > 120) {
    return Response.json({ error: "টাকার পরিমাণ ও পেমেন্ট রেফারেন্স যাচাই করুন।" }, { status: 400 });
  }
  await ensureSchema();
  const rows = await sql`
    UPDATE orders SET settled_amount = ${amount}, settlement_ref = ${reference.trim()}
    WHERE id = ${id} AND status = 'delivered' AND settled_amount IS NULL
    RETURNING id
  `;
  return rows.length ? Response.json({ ok: true }) : Response.json({ error: "অর্ডারের বর্তমান পেমেন্ট তথ্য রিফ্রেশ করুন।" }, { status: 409 });
}
