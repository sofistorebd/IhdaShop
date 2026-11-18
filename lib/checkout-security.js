import crypto from "node:crypto";
import { isIP } from "node:net";

export class CheckoutError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function secret() {
  const value = process.env.ENCRYPTION_KEY || process.env.ADMIN_PASSWORD;
  if (!value) throw new CheckoutError(503, "configuration", "অর্ডার সেবা সাময়িকভাবে প্রস্তুত নয়।");
  return value;
}

export function digest(kind, value) {
  return crypto.createHmac("sha256", secret()).update(kind + ":" + value).digest("hex");
}

export function normalizePhone(value) {
  return String(value || "").replace(/[০-৯]/g, (c) => String(c.charCodeAt(0) - 0x09e6))
    .replace(/[\s()+-]/g, "").replace(/^880/, "0");
}

export function validPhone(value) {
  return /^01[3-9]\d{8}$/.test(value);
}

export function requestKey(value) {
  return typeof value === "string" && /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value) ? value.toLowerCase() : null;
}

export function sessionCookie(existing) {
  if (typeof existing === "string") {
    const parts = existing.split(".");
    const [id, signature] = parts;
    if (parts.length === 2 && requestKey(id) && /^[a-f0-9]{64}$/.test(signature || "")) {
      const expected = digest("session", id);
      if (crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return existing;
    }
  }
  const id = crypto.randomUUID();
  return id + "." + digest("session", id);
}

export function trustedClientIp(req) {
  // Set ONLY when the ingress overwrites this single-IP header and the origin
  // cannot be reached directly. Never trust an arbitrary X-Forwarded-For list.
  const header = process.env.CHECKOUT_TRUSTED_IP_HEADER;
  if (!["x-real-ip", "cf-connecting-ip"].includes(header)) return "";
  const ip = req.headers.get(header)?.trim() || "";
  return isIP(ip) ? ip : "";
}

export function submissionContext(req, data, order) {
  const intent = JSON.stringify([order.name, order.phone, order.address, order.slug,
    order.variant, order.size, order.qty, order.area]);
  const hash = digest("intent", intent);
  const supplied = data.requestKey;
  if (supplied != null && !requestKey(supplied)) {
    throw new CheckoutError(400, "invalid_request", "পৃষ্ঠা রিফ্রেশ করে আবার চেষ্টা করুন।");
  }
  const existing = req.cookies?.get("checkout_session")?.value;
  const cookie = sessionCookie(existing);
  const ip = trustedClientIp(req);
  return {
    key: supplied ? requestKey(supplied) : "legacy-" + hash,
    payloadHash: hash,
    legacy: !supplied,
    phoneHash: digest("phone", order.phone),
    sessionHash: existing === cookie ? digest("visitor", cookie) : null,
    ipHash: ip ? digest("ip", ip) : null,
    ip,
    flags: existing === cookie ? [] : ["session_missing"],
  };
}

export function attribution(req, order, publicUrl) {
  let sourceUrl = "";
  try {
    const site = new URL(publicUrl);
    const ref = new URL(req.headers.get("referer") || site.origin);
    // Do not retain arbitrary query strings (which may contain customer PII).
    if (ref.origin === site.origin) sourceUrl = ref.origin + ref.pathname;
  } catch { /* no verified public URL */ }
  return {
    clientIp: trustedClientIp(req),
    userAgent: (req.headers.get("user-agent") || "").slice(0, 512),
    fbp: (req.cookies?.get("_fbp")?.value || "").slice(0, 255),
    fbc: (req.cookies?.get("_fbc")?.value || "").slice(0, 255),
    sourceUrl,
  };
}

export async function validateTurnstile(token, config, ip) {
  if (!config.enabled) return;
  if (!config.secret || !config.siteKey || !config.hostname) {
    throw new CheckoutError(503, "verification_unavailable", "নিরাপত্তা যাচাই প্রস্তুত নয়। দোকানে যোগাযোগ করুন।");
  }
  if (typeof token !== "string" || !token || token.length > 2048) {
    throw new CheckoutError(400, "verification_required", "নিরাপত্তা যাচাই সম্পন্ন করে আবার চেষ্টা করুন।");
  }
  let result;
  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret: config.secret, response: token, ...(ip ? { remoteip: ip } : {}) }),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error("unavailable");
    result = await response.json();
  } catch {
    throw new CheckoutError(503, "verification_unavailable", "নিরাপত্তা যাচাই হচ্ছে না। কিছুক্ষণ পরে চেষ্টা করুন।");
  }
  if (!result.success || result.hostname !== config.hostname || result.action !== "checkout") {
    throw new CheckoutError(400, "verification_required", "নিরাপত্তা যাচাই আবার সম্পন্ন করুন।");
  }
}

export async function readCheckoutJson(req) {
  const reader = req.body?.getReader();
  if (!reader) throw new CheckoutError(400, "invalid_json", "অর্ডারের তথ্য সঠিক নয়।");
  const chunks = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 16384) {
      await reader.cancel();
      throw new CheckoutError(413, "too_large", "অর্ডারের তথ্য বেশি বড়।");
    }
    chunks.push(Buffer.from(value));
  }
  try {
    const data = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error();
    return data;
  } catch {
    throw new CheckoutError(400, "invalid_json", "অর্ডারের তথ্য সঠিক নয়।");
  }
}

export function otpTicket(stage, sid, context, expires = Date.now() + 600000) {
  const signature = digest("otp-" + stage, [sid, expires, context.phoneHash, context.sessionHash].join("|"));
  return [sid, expires, signature].join(".");
}

export function readOtpTicket(stage, ticket, context) {
  const [sid, expires] = String(ticket || "").split(".");
  if (context.sessionHash && /^VE[a-f0-9]{32}$/i.test(sid) && /^\d{13}$/.test(expires) && Number(expires) > Date.now()) {
    const expected = otpTicket(stage, sid, context, Number(expires));
    if (typeof ticket === "string" && Buffer.byteLength(ticket) === expected.length &&
        crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(ticket))) return sid;
  }
  throw new CheckoutError(400, "otp_required", "ফোন নম্বরটি OTP দিয়ে আবার যাচাই করুন।");
}
