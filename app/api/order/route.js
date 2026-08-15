// অর্ডার গ্রহণ → DB তে সেভ → Telegram এ নোটিফিকেশন
import { createOrder, hasDb } from "@/lib/db";
import { sendTelegram, formatOrder } from "@/lib/telegram";
import { sendPurchase } from "@/lib/fb-capi";

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

  // ফোন যাচাই — বাংলাদেশি ১১ ডিজিট (01XXXXXXXXX), +880/880 থাকলেও ঠিক
  const phoneDigits = String(data.phone).replace(/\D/g, "").replace(/^88/, "");
  if (!/^01\d{9}$/.test(phoneDigits)) {
    return Response.json(
      { ok: false, error: "invalid phone" },
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

  // Meta Conversions API — server-side Purchase (browser pixel-এর সাথে dedup)
  try {
    const xff = req.headers.get("x-forwarded-for") || "";
    await sendPurchase({
      order: { ...data, ...saved },
      eventId: data.eventId, // browser pixel-এর একই event_id
      clientIp: xff.split(",")[0].trim(),
      userAgent: req.headers.get("user-agent") || "",
      fbp: req.cookies.get("_fbp")?.value,
      fbc: req.cookies.get("_fbc")?.value,
      sourceUrl: req.headers.get("referer") || "",
    });
  } catch (err) {
    console.error("CAPI ব্যর্থ:", err);
  }

  return Response.json({ ok: true, id: saved?.id ?? null });
}
