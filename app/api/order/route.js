// অর্ডার গ্রহণ → DB তে সেভ → Telegram এ নোটিফিকেশন
import { hasDb } from "@/lib/db";
import { after } from "next/server";
import { sendTelegram, formatOrder } from "@/lib/telegram";
import { getProductBySlug } from "@/lib/products-db";
import { getSettings, getCheckoutConfiguration } from "@/lib/settings";
import { createProtectedOrder, findSubmission, limitCheckout } from "@/lib/checkout-db";
import { readOtpTicket, attribution, CheckoutError, digest, normalizePhone, readCheckoutJson, submissionContext, validateTurnstile, validPhone } from "@/lib/checkout-security";

export async function POST(req) {
  try {
    return await receiveOrder(req);
  } catch (err) {
    const known = err instanceof CheckoutError;
    if (!known) console.error("Checkout failed");
    return Response.json({
      ok: false, code: known ? err.code : "unavailable",
      error: known ? err.message : "অর্ডার সেভ করা যায়নি। আবার চেষ্টা করুন।",
    }, { status: known ? err.status : 503, headers: err.status === 429 ? { "Retry-After": "900" } : {} });
  }
}

async function receiveOrder(req) {
  const data = await readCheckoutJson(req);

  if (![data.name, data.phone, data.address].every((value) => typeof value === "string" && value.trim())) {
    return Response.json(
      { ok: false, error: "missing fields" },
      { status: 400 }
    );
  }

  // ফোন যাচাই — বাংলাদেশি ১১ ডিজিট (01XXXXXXXXX), +880/880 থাকলেও ঠিক
  const phoneDigits = normalizePhone(data.phone);
  if (!validPhone(phoneDigits)) {
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
  let config;
  try {
    [product, site, config] = await Promise.all([
      getProductBySlug(String(data.slug)),
      getSettings(),
      getCheckoutConfiguration(),
    ]);
  } catch (err) {
    console.error("Order validation data unavailable");
    return Response.json({ ok: false, error: "order validation unavailable" }, { status: 503 });
  }
  if (!product) {
    return Response.json({ ok: false, error: "product not found" }, { status: 400 });
  }
  const origin = req.headers.get("origin");
  if (origin && origin !== new URL(config.publicUrl).origin) {
    return Response.json({ ok: false, error: "invalid origin" }, { status: 403 });
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
  const inside = "ঢাকার ভিতরে";
  const outside = "ঢাকার বাইরে";
  // Match the checkout label and also accept the earlier API spelling.
  const area = data.area === inside || data.area === "ঢাকার ভিতর"
    ? inside
    : data.area === outside ? outside : null;
  if (!area) {
    return Response.json({ ok: false, error: "invalid delivery area" }, { status: 400 });
  }
  const deliveryCharge = area === inside ? site.delivery.insideDhaka : site.delivery.outsideDhaka;
  data.name = String(data.name).trim().slice(0, 120);
  data.phone = phoneDigits;
  data.address = String(data.address).trim().slice(0, 500);
  data.product = product.name + " (" + variant.name + ")";
  data.variant = variant.name;
  data.slug = product.slug;
  data.price = Number(variant.price);
  data.size = size;
  data.qty = qty;
  data.area = area;
  data.deliveryCharge = Number(deliveryCharge);
  data.total = data.price * qty + data.deliveryCharge;
  if (!data.name || !data.address) {
    return Response.json({ ok: false, error: "missing fields" }, { status: 400 });
  }
  if (!hasDb()) {
    return Response.json({ ok: false, error: "database is not configured" }, { status: 503 });
  }
  const context = submissionContext(req, data, data);
  const replay = await findSubmission(context);
  if (replay) return Response.json({ ok: true, id: replay.order.id, replayed: true });
  if (config.otpEnabled) context.otpHash = digest("otp-used", readOtpTicket("approved", data.otpProof, context));
  delete data.otpProof;
  await limitCheckout(context);
  if (data.companyWebsite) throw new CheckoutError(400, "invalid_order", "অর্ডারের তথ্য যাচাই করে আবার চেষ্টা করুন।");
  await validateTurnstile(data.turnstileToken, config, context.ip);
  if (config.enabled) context.challengeHash = digest("challenge", data.turnstileToken);
  const result = await createProtectedOrder(data, context, attribution(req, data, config.publicUrl), data.allowRepeat === true);
  // No Purchase here: manual In Review -> Pending verification owns that event.
  if (!result.replayed) {
    try {
      after(async () => {
        try { await sendTelegram(formatOrder(result.order)); }
        catch { console.error("Order notification failed"); }
      });
    } catch { console.error("Order notification could not be scheduled"); }
  }
  return Response.json({ ok: true, id: result.order.id, replayed: result.replayed });
}
