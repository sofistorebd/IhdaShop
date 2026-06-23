// অর্ডার স্ট্যাটাস ম্যানুয়ালি বদলানো (confirmed / cancelled ইত্যাদি)
import { updateOrderStatus } from "@/lib/db";

const ALLOWED = ["pending", "confirmed", "sent_to_courier", "delivered", "cancelled"];

export async function POST(req) {
  const { id, status } = await req.json().catch(() => ({}));
  if (!id || !ALLOWED.includes(status)) {
    return Response.json({ ok: false, error: "invalid" }, { status: 400 });
  }
  await updateOrderStatus(id, status);
  return Response.json({ ok: true });
}
