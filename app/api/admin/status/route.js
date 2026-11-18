// অর্ডার স্ট্যাটাস ম্যানুয়ালি বদলানো (confirmed / cancelled ইত্যাদি)
import { after } from "next/server";
import { changeReviewedOrderStatus } from "@/lib/checkout-db";
import { authorizeAdminRequest } from "@/lib/admin-request";
import { flushPurchases } from "@/lib/purchase-outbox";

const ALLOWED = ["inreview", "pending", "confirmed", "sent_to_courier", "delivered", "cancelled"];

export async function POST(req) {
  const denied = await authorizeAdminRequest(req, { mutation: true, action: "change-order-status" });
  if (denied) return denied;
  const { id, status } = await req.json().catch(() => ({}));
  if (!Number.isSafeInteger(Number(id)) || Number(id) < 1 || Number(id) > 2147483647 || !ALLOWED.includes(status)) {
    return Response.json({ ok: false, error: "invalid" }, { status: 400 });
  }
  try {
    const order = await changeReviewedOrderStatus(Number(id), status);
    if (!order) return Response.json({ ok: false, error: "অর্ডার পাওয়া যায়নি।" }, { status: 404 });
    // Queue is committed atomically with verification; Meta outage cannot undo it.
    try {
      after(async () => { try { await flushPurchases(); } catch { /* scheduler retries */ } });
    } catch { /* Status is already committed; the scheduler will drain the queue. */ }
    return Response.json({ ok: true });
  } catch (err) {
    if (err?.code === "order_locked") return Response.json({ ok: false, error: err.message }, { status: 409 });
    return Response.json({ ok: false, error: "স্ট্যাটাস সেভ হয়নি।" }, { status: 503 });
  }
}
