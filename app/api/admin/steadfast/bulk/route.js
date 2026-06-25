// একাধিক অর্ডার এক ক্লিকে Steadfast এ পাঠানো
import { getOrder, setCourierInfo } from "@/lib/db";
import { createConsignment, steadfastReady } from "@/lib/steadfast";

export async function POST(req) {
  if (!(await steadfastReady())) {
    return Response.json(
      { ok: false, error: "Steadfast API key সেট করা নেই" },
      { status: 400 }
    );
  }
  const { ids } = await req.json().catch(() => ({}));
  if (!Array.isArray(ids) || !ids.length) {
    return Response.json({ ok: false, error: "অর্ডার নির্বাচন করো" }, { status: 400 });
  }

  const results = [];
  for (const id of ids) {
    try {
      const order = await getOrder(id);
      if (!order) {
        results.push({ id, ok: false, error: "পাওয়া যায়নি" });
        continue;
      }
      if (order.consignment_id) {
        results.push({
          id,
          ok: true,
          skipped: true,
          consignment_id: order.consignment_id,
          tracking_code: order.tracking_code,
        });
        continue;
      }
      const c = await createConsignment(order);
      await setCourierInfo(id, String(c.consignment_id), c.tracking_code);
      results.push({
        id,
        ok: true,
        consignment_id: String(c.consignment_id),
        tracking_code: c.tracking_code,
      });
    } catch (err) {
      results.push({ id, ok: false, error: err?.message || "ব্যর্থ" });
    }
  }

  const sent = results.filter((r) => r.ok && !r.skipped).length;
  const failed = results.filter((r) => !r.ok).length;
  return Response.json({ ok: true, sent, failed, results });
}
