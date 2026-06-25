// edge-নিরাপদ সেশন টোকেন (proxy + login দুই জায়গায় ব্যবহার)
export const ADMIN_COOKIE = "ihda_admin";

async function sha256hex(s) {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(s)
  );
  return [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// সেশন টোকেন — সার্ভার সিক্রেট থেকে, পাসওয়ার্ডের উপর নির্ভর করে না
export async function sessionToken() {
  const secret =
    process.env.ENCRYPTION_KEY ||
    process.env.ADMIN_PASSWORD ||
    "ihda-shop-default";
  return sha256hex("ihda-session-v1:" + secret);
}
