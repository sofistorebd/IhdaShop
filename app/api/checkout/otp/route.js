import { randomBytes, randomInt } from "node:crypto";
import { getCheckoutConfiguration } from "@/lib/settings";
import { ensureCheckoutSchema } from "@/lib/checkout-db";
import { sql } from "@/lib/db";
import { CheckoutError, digest, normalizePhone, validPhone, submissionContext, readCheckoutJson, otpTicket, readOtpTicket } from "@/lib/checkout-security";

async function limit(key, seconds, max) {
  const [row] = await sql`
    INSERT INTO checkout_limits(key, hits) VALUES (${"otp:" + key}, 1)
    ON CONFLICT (key) DO UPDATE SET
      hits = CASE WHEN checkout_limits.started_at <= now() - ${seconds} * interval '1 second' THEN 1 ELSE checkout_limits.hits + 1 END,
      started_at = CASE WHEN checkout_limits.started_at <= now() - ${seconds} * interval '1 second' THEN now() ELSE checkout_limits.started_at END
    RETURNING hits
  `;
  if (row.hits > max) throw new CheckoutError(429, "otp_limit", "OTP চেষ্টার সীমা শেষ। কিছুক্ষণ পরে চেষ্টা করুন।");
}

async function sendCode(phone, context) {
  const apiKey = process.env.SMS_NET_BD_API_KEY?.trim();
  if (!apiKey) throw new Error("SMS configuration missing");
  await limit("cooldown:" + context.phoneHash, 60, 1);
  await limit("phone:" + context.phoneHash, 3600, 4);
  await limit("session:" + context.sessionHash, 3600, 6);
  if (context.ipHash) await limit("ip:" + context.ipHash, 3600, 20);
  await limit("shop", 3600, 100);

  const id = randomBytes(16).toString("hex");
  const code = String(randomInt(1000000)).padStart(6, "0");
  const body = new URLSearchParams({ api_key: apiKey, to: "88" + phone,
    msg: `Your order verification code is ${code}. Valid for 10 minutes.` });
  const sender = process.env.SMS_NET_BD_SENDER_ID?.trim();
  if (sender) body.set("sender_id", sender);
  const response = await fetch("https://api.sms.net.bd/sendsms", {
    method: "POST", body, redirect: "error", cache: "no-store", signal: AbortSignal.timeout(10000),
  });
  if (!response.ok || (await response.json()).error !== 0) throw new Error("SMS request rejected");
  const verifier = digest("sms-code", id + ":" + code);
  await sql`
    INSERT INTO checkout_sms_codes(phone_hash, session_hash, id, verifier, expires_at)
    VALUES (${context.phoneHash}, ${context.sessionHash}, ${id}, ${verifier}, now() + interval '10 minutes')
    ON CONFLICT (phone_hash, session_hash) DO UPDATE SET
      id = EXCLUDED.id, verifier = EXCLUDED.verifier, expires_at = EXCLUDED.expires_at
  `;
  return otpTicket("sent", id, context);
}

async function checkCode(data, context) {
  const id = readOtpTicket("sent", data.ticket, context);
  if (typeof data.code !== "string" || !/^\d{6}$/.test(data.code)) {
    throw new CheckoutError(400, "code", "৬ সংখ্যার OTP দিন।");
  }
  await limit("check:" + id, 600, 5);
  const verified = await sql`
    DELETE FROM checkout_sms_codes WHERE phone_hash = ${context.phoneHash} AND session_hash = ${context.sessionHash}
      AND id = ${id} AND verifier = ${digest("sms-code", id + ":" + data.code)} AND expires_at > now()
    RETURNING id
  `;
  if (!verified.length) throw new CheckoutError(400, "code", "OTP ভুল অথবা মেয়াদ শেষ।");
  return otpTicket("approved", id, context);
}

export async function POST(req) {
  try {
    const config = await getCheckoutConfiguration();
    if (!config.otpEnabled) return Response.json({ ok: true, disabled: true });
    if (req.headers.get("origin") !== new URL(config.publicUrl).origin) return Response.json({ ok: false }, { status: 403 });
    const data = await readCheckoutJson(req);
    const phone = normalizePhone(data.phone);
    if (!validPhone(phone) || !["send", "check"].includes(data.action)) throw new CheckoutError(400, "invalid", "সঠিক ফোন নম্বর দিন।");
    const context = submissionContext(req, {}, { phone });
    if (!context.sessionHash) throw new CheckoutError(400, "session", "পৃষ্ঠা রিফ্রেশ করে আবার চেষ্টা করুন।");
    await ensureCheckoutSchema();
    const ticket = data.action === "send" ? await sendCode(phone, context) : await checkCode(data, context);
    return Response.json({ ok: true, ticket }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return Response.json({ ok: false, error: err instanceof CheckoutError ? err.message : "OTP সেবা সাময়িকভাবে বন্ধ।" }, { status: err instanceof CheckoutError ? err.status : 503 });
  }
}
