// Facebook Pixel ইভেন্ট — Pixel লোড না থাকলে নিরাপদে কিছুই করে না
export function track(event, data) {
  if (typeof window !== "undefined" && typeof window.fbq === "function") {
    try {
      window.fbq("track", event, data || {});
    } catch {
      /* ignore */
    }
  }
}
