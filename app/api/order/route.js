// অর্ডার গ্রহণ → DB তে সেভ → Telegram এ নোটিফিকেশন
import { createOrder, hasDb } from "@/lib/db";
import { sendTelegram, formatOrder } from "@/lib/telegram";

export async function POST(req) {
  let data;
  try {
    data = await req.json();
  } catch {
    return Response.json({ ok: false, error: "invalid json" }, { status: 400 });
  }

  if (!data?.name || !data?.phone || !data?.address) {
    return Response.json(
      { ok: false, error: "missing fields" },
      { status: 400 }
    );
  }

  let saved = data;
  try {
    if (hasDb()) {
      saved = await createOrder(data); // DB row (id সহ)
    } else {
      console.log("📦 নতুন অর্ডার (DB সেট করা নেই):", data);
    }
  } catch (err) {
    console.error("DB সেভ ব্যর্থ:", err);
    // DB ব্যর্থ হলেও Telegram পাঠানোর চেষ্টা করি
  }

  // Telegram নোটিফিকেশন
  try {
    await sendTelegram(formatOrder({ ...data, ...saved }));
  } catch (err) {
    console.error("Telegram ব্যর্থ:", err);
  }

  return Response.json({ ok: true, id: saved?.id ?? null });
}
