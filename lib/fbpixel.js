// Facebook Pixel ইভেন্ট — Pixel লোড না থাকলে নিরাপদে কিছুই করে না
// options.eventID দিলে server CAPI event-এর সাথে deduplication হয়
export function track(event, data, options) {
  if (typeof window !== "undefined" && typeof window.fbq === "function") {
    try {
      if (options) window.fbq("track", event, data || {}, options);
      else window.fbq("track", event, data || {});
    } catch {
      /* ignore */
    }
  }
}
