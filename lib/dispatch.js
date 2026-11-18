import { ensureSchema, sql } from "./db";
import { createConsignment } from "./steadfast";

export async function dispatchOrder(id) {
  await ensureSchema();
  const [order] = await sql`
    UPDATE orders SET dispatch_started_at = now()
    WHERE id = ${id} AND status IN ('pending', 'confirmed')
      AND NULLIF(consignment_id, '') IS NULL AND NULLIF(tracking_code, '') IS NULL
      AND dispatch_started_at IS NULL
    RETURNING *
  `;
  if (!order) throw new Error("অর্ডারটি বুকিংয়ের উপযুক্ত নয় অথবা ইতিমধ্যে পাঠানো হয়েছে।");
  try {
    const c = await createConsignment(order);
    if (!c?.consignment_id) throw new Error("Missing consignment");
    const [saved] = await sql`
      UPDATE orders SET consignment_id = ${String(c.consignment_id)}, tracking_code = ${c.tracking_code || null},
        status = 'sent_to_courier', dispatch_started_at = NULL
      WHERE id = ${id} AND dispatch_started_at IS NOT NULL RETURNING consignment_id, tracking_code
    `;
    if (!saved) throw new Error("Dispatch changed");
    return saved;
  } catch {
    throw new Error(`ORD-${id} বুকিংয়ের ফল যাচাই প্রয়োজন। Steadfast পোর্টালে ইনভয়েস মিলিয়ে নিন।`);
  }
}

// Allow the operator to resolve an interrupted booking after checking the courier portal.
export async function reconcileDispatch(id, consignmentId, trackingCode) {
  await ensureSchema();
  const rows = await sql`
    UPDATE orders SET dispatch_started_at = NULL, consignment_id = ${consignmentId},
      tracking_code = ${trackingCode}, status = CASE WHEN ${consignmentId}::text IS NULL THEN status ELSE 'sent_to_courier' END
    WHERE id = ${id} AND dispatch_started_at < now() - interval '5 minutes'
      AND NULLIF(consignment_id, '') IS NULL RETURNING id
  `;
  return rows.length > 0;
}
