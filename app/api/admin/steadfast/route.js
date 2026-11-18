import { dispatchOrder } from "@/lib/dispatch";
import { steadfastReady } from "@/lib/steadfast";

export async function POST(req) {
  if (!(await steadfastReady())) {
    return Response.json(
      { ok: false, error: "Steadfast API key সেট করা নেই" },
      { status: 400 }
    );
  }

  const { id } = await req.json().catch(() => ({}));
  if (!id) {
    return Response.json({ ok: false, error: "id দরকার" }, { status: 400 });
  }

  try {
    const result = await dispatchOrder(id);
    return Response.json({ ok: true, ...result });
  } catch (err) {
    return Response.json(
      { ok: false, error: err.message || "ব্যর্থ" },
      { status: 409 }
    );
  }
}
