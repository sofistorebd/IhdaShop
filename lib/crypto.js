import crypto from "crypto";

// AES-256-GCM দিয়ে সিক্রেট এনক্রিপ্ট/ডিক্রিপ্ট
function getKey() {
  const secret =
    process.env.ENCRYPTION_KEY ||
    process.env.ADMIN_PASSWORD ||
    "ihda-shop-default-key";
  return crypto.createHash("sha256").update(secret).digest(); // 32 bytes
}

export function encrypt(text) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getKey(), iv);
  const enc = Buffer.concat([
    cipher.update(String(text), "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return "enc:" + Buffer.concat([iv, tag, enc]).toString("base64");
}

export function decrypt(data) {
  if (!data || typeof data !== "string" || !data.startsWith("enc:")) {
    return data || ""; // প্লেইন মান হলে যেমন আছে তেমন
  }
  try {
    const raw = Buffer.from(data.slice(4), "base64");
    const iv = raw.subarray(0, 12);
    const tag = raw.subarray(12, 28);
    const enc = raw.subarray(28);
    const d = crypto.createDecipheriv("aes-256-gcm", getKey(), iv);
    d.setAuthTag(tag);
    return Buffer.concat([d.update(enc), d.final()]).toString("utf8");
  } catch {
    return "";
  }
}
