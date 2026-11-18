import { dispatchOrder } from "@/lib/dispatch";
import { steadfastReady } from "@/lib/steadfast";

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
      const result = await dispatchOrder(id);
      results.push({ id, ok: true, ...result });
    } catch (err) {
      results.push({ id, ok: false, error: err?.message || "ব্যর্থ" });
    }
  }

  const sent = results.filter((r) => r.ok && !r.skipped).length;
  const failed = results.filter((r) => !r.ok).length;
  return Response.json({ ok: true, sent, failed, results });
}
