"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// প্রতি পেজ-ভিউতে একটা হালকা beacon পাঠায় (fire-and-forget)।
// render block করে না, admin পেজ skip করে — visitor-এর load-এ কার্যত শূন্য প্রভাব।
export default function TrackView() {
  const pathname = usePathname();
  useEffect(() => {
    if (!pathname || pathname.startsWith("/admin")) return;
    try {
      const body = JSON.stringify({ path: pathname, ref: document.referrer });
      if (navigator.sendBeacon) {
        navigator.sendBeacon("/api/track", new Blob([body], { type: "application/json" }));
      } else {
        fetch("/api/track", { method: "POST", body, keepalive: true, headers: { "Content-Type": "application/json" } });
      }
    } catch {
      /* ignore */
    }
  }, [pathname]);
  return null;
}
