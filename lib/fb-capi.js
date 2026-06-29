// Meta Conversions API (CAPI) — server থেকে সরাসরি Meta-তে event পাঠায়।
// Pixel ID + Access Token (admin settings) সেট থাকলেই কাজ করে, নাহলে চুপচাপ স্কিপ।
// browser pixel-এর সাথে একই event_id ব্যবহার করায় Meta ডাবল count করে না (deduplication)।
import crypto from "crypto";
import { getSecret, getSettings } from "./settings";

// Meta-র জন্য PII অবশ্যই SHA-256 (lowercase, trimmed) করে পাঠাতে হয়
function sha256(v) {
  const s = String(v || "").trim().toLowerCase();
  if (!s) return undefined;
  return crypto.createHash("sha256").update(s).digest("hex");
}

// ফোন → শুধু ডিজিট + কান্ট্রি কোড (880), তারপর হ্যাশ
function hashPhone(p) {
  const d = String(p || "").replace(/[^0-9]/g, "");
  if (!d) return undefined;
  let norm = d;
  if (d.startsWith("0")) norm = "880" + d.slice(1);
  else if (!d.startsWith("880")) norm = "880" + d;
  return crypto.createHash("sha256").update(norm).digest("hex");
}

// undefined ভ্যালু বাদ দেয় (Meta খালি ফিল্ড পছন্দ করে না)
function clean(obj) {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v != null && v !== "")
  );
}

export async function sendPurchase({
  order,
  eventId,
  clientIp,
  userAgent,
  fbp,
  fbc,
  sourceUrl,
}) {
  const token = await getSecret("capiAccessToken");
  const site = await getSettings();
  const pixelId = site.facebookPixelId;
  if (!token || !pixelId) return false; // সেট করা নেই → স্কিপ

  const user_data = clean({
    ph: hashPhone(order.phone),
    fn: sha256(order.name),
    client_ip_address: clientIp,
    client_user_agent: userAgent,
    fbp,
    fbc,
  });

  const custom_data = clean({
    currency: "BDT",
    value: Number(order.total) || 0,
    content_name: order.product,
    content_ids: order.slug ? [order.slug] : undefined,
    content_type: "product",
    num_items: Number(order.qty) || 1,
  });

  const event = clean({
    event_name: "Purchase",
    event_time: Math.floor(Date.now() / 1000),
    event_id: eventId, // ← browser pixel-এর সাথে মিলে দ্বৈত গণনা ঠেকায়
    action_source: "website",
    event_source_url: sourceUrl || site.url || undefined,
    user_data,
    custom_data,
  });

  const body = { data: [event] };
  if (site.capiTestCode) body.test_event_code = site.capiTestCode;

  try {
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${pixelId}/events?access_token=${encodeURIComponent(
        token
      )}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );
    if (!res.ok) {
      console.error("CAPI ব্যর্থ:", res.status, await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error("CAPI পাঠানো ব্যর্থ:", err);
    return false;
  }
}
