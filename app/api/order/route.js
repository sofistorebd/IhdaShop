// অর্ডার গ্রহণ → DB তে সেভ → Telegram এ নোটিফিকেশন
import { createOrder, hasDb } from "@/lib/db";
import { sendTelegram, formatOrder } from "@/lib/telegram";
import { sendPurchase } from "@/lib/fb-capi";
import { getProductBySlug } from "@/lib/products-db";
import { getSettings } from "@/lib/settings";

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

  // Rebuild financial fields from trusted server-side data.
  const qty = Number(data.qty);
  if (!Number.isInteger(qty) || qty < 1 || qty > 20 || !data.slug) {
    return Response.json({ ok: false, error: "invalid order" }, { status: 400 });
  }
  let product;
  let site;
  try {
    [product, site] = await Promise.all([
      getProductBySlug(String(data.slug)),
      getSettings(),
    ]);
  } catch (err) {
    console.error("Order validation data read failed:", err);
    return Response.json({ ok: false, error: "order validation unavailable" }, { status: 503 });
  }
  if (!product) {
    return Response.json({ ok: false, error: "product not found" }, { status: 400 });
  }
  const requestedVariant = data.variant || data.product?.match?.(/\((.*)\)$/)?.[1];
  const variant = product.variants.find((v) => v.name === requestedVariant);
  if (!variant) {
    return Response.json({ ok: false, error: "invalid variant" }, { status: 400 });
  }
  const size = product.sizes.length ? String(data.size || "") : "";
  if (product.sizes.length && !product.sizes.includes(size)) {
    return Response.json({ ok: false, error: "invalid size" }, { status: 400 });
  }
  const inside = "\u09a2\u09be\u0995\u09be\u09b0 \u09ad\u09bf\u09a4\u09b0";
  const outside = "\u09a2\u09be\u0995\u09be\u09b0 \u09ac\u09be\u0987\u09b0\u09c7";
  const area = data.area === inside ? inside : data.area === outside ? outside : null;
  if (!area) {
    return Response.json({ ok: false, error: "invalid delivery area" }, { status: 400 });
  }
  const deliveryCharge = area === inside ? site.delivery.insideDhaka : site.delivery.outsideDhaka;
  data.name = String(data.name).trim().slice(0, 120);
  data.phone = phoneDigits;
  data.address = String(data.address).trim().slice(0, 500);
  data.product = product.name + " (" + variant.name + ")";
  data.slug = product.slug;
  data.price = Number(variant.price);
  data.size = size;
  data.qty = qty;
  data.deliveryCharge = Number(deliveryCharge);
  data.total = data.price * qty + data.deliveryCharge;
  if (!data.name || !data.address) {
    return Response.json({ ok: false, error: "missing fields" }, { status: 400 });
  }
  if (!hasDb()) {
    return Response.json({ ok: false, error: "database is not configured" }, { status: 503 });
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
  if (!saved?.id) {
    return Response.json({ ok: false, error: "order could not be saved" }, { status: 503 });
  }
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
