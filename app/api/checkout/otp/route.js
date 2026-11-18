import { getCheckoutConfiguration } from "@/lib/settings";
import { ensureCheckoutSchema } from "@/lib/checkout-db";
import { sql } from "@/lib/db";
import { CheckoutError, normalizePhone, validPhone, submissionContext, readCheckoutJson, otpTicket, readOtpTicket } from "@/lib/checkout-security";

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
    const to = "+88" + phone;
    const sending = data.action === "send";
    const body = new URLSearchParams();
    await ensureCheckoutSchema();
    if (sending) {
      await limit("cooldown:" + context.phoneHash, 60, 1);
      await limit("phone:" + context.phoneHash, 3600, 4);
      await limit("session:" + context.sessionHash, 3600, 6);
      if (context.ipHash) await limit("ip:" + context.ipHash, 3600, 20);
      await limit("shop", 3600, 100);
      body.set("To", to);
      body.set("Channel", "sms");
    } else {
      const sid = readOtpTicket("sent", data.ticket, context);
      if (!/^\d{4,10}$/.test(data.code || "")) throw new CheckoutError(400, "code", "সঠিক OTP দিন।");
      await limit("check:" + sid, 600, 5);
      body.set("VerificationSid", sid);
      body.set("Code", data.code);
    }
    const env = process.env;
    const url = "https://verify.twilio.com/v2/Services/" + env.TWILIO_VERIFY_SERVICE_SID + (sending ? "/Verifications" : "/VerificationCheck");
    const response = await fetch(url, { method: "POST", body, cache: "no-store", signal: AbortSignal.timeout(10000),
      headers: { Authorization: "Basic " + Buffer.from(env.TWILIO_ACCOUNT_SID + ":" + env.TWILIO_AUTH_TOKEN).toString("base64") } });
    const result = await response.json();
    if (!sending && (response.status === 404 || (response.ok && result.status !== "approved"))) {
      throw new CheckoutError(400, "code", "OTP ভুল অথবা মেয়াদ শেষ।");
    }
    if (!response.ok || result.to !== to || !/^VE[a-f0-9]{32}$/i.test(result.sid) ||
        (sending ? result.status !== "pending" : result.sid !== body.get("VerificationSid"))) throw new Error("Provider unavailable");
    return Response.json({ ok: true, ticket: otpTicket(sending ? "sent" : "approved", result.sid, context) }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return Response.json({ ok: false, error: err instanceof CheckoutError ? err.message : "OTP সেবা সাময়িকভাবে বন্ধ।" }, { status: err instanceof CheckoutError ? err.status : 503 });
  }
}
