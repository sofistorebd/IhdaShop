// সাধারণ অ্যাডমিন সেশন টোকেন (env ADMIN_PASSWORD এর উপর ভিত্তি করে)
export const ADMIN_COOKIE = "ihda_admin";

export async function tokenFor(password) {
  const data = new TextEncoder().encode("ihda::" + password);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function expectedToken() {
  return tokenFor(process.env.ADMIN_PASSWORD || "");
}
