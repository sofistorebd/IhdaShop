// edge-নিরাপদ সেশন টোকেন (proxy + login দুই জায়গায় ব্যবহার)
export const ADMIN_COOKIE = "store_admin";

async function sha256hex(s) {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(s)
  );
  return [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// সেশন টোকেন — সার্ভার সিক্রেট থেকে, পাসওয়ার্ডের উপর নির্ভর করে না।
// সিক্রেট সেট না থাকলে null — নাহলে টোকেন অনুমানযোগ্য হয়ে যায়
// (টেমপ্লেট পাবলিক, ডিফল্ট দিয়ে যে কেউ কুকি বানিয়ে ঢুকতে পারত)।
export async function sessionToken() {
  const secret = process.env.ENCRYPTION_KEY || process.env.ADMIN_PASSWORD;
  if (!secret) return null;
  return sha256hex("store-session-v1:" + secret);
}
