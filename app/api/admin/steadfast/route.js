// এক ক্লিকে Steadfast এ অর্ডার পাঠানো
import { getOrder, setCourierInfo } from "@/lib/db";
import { createConsignment, steadfastReady } from "@/lib/steadfast";

export async function POST(req) {
  if (!steadfastReady()) {
    return Response.json(
      { ok: false, error: "Steadfast API key সেট করা নেই" },
      { status: 400 }
    );
  }

  const { id } = await req.json().catch(() => ({}));
  if (!id) {
    return Response.json({ ok: false, error: "id দরকার" }, { status: 400 });
  }

  const order = await getOrder(id);
  if (!order) {
    return Response.json({ ok: false, error: "অর্ডার পাওয়া যায়নি" }, { status: 404 });
  }
  if (order.consignment_id) {
    return Response.json(
      { ok: false, error: "এই অর্ডার আগেই পাঠানো হয়েছে" },
      { status: 409 }
    );
  }

  try {
    const c = await createConsignment(order);
    await setCourierInfo(id, String(c.consignment_id), c.tracking_code);
    return Response.json({
      ok: true,
      consignment_id: c.consignment_id,
      tracking_code: c.tracking_code,
    });
  } catch (err) {
    return Response.json(
      { ok: false, error: err.message || "ব্যর্থ" },
      { status: 500 }
    );
  }
}
