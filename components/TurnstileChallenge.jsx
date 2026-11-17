"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

export default function TurnstileChallenge({ siteKey, onToken, resetKey }) {
  const container = useRef(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    onToken("");
    if (!ready || !container.current || !window.turnstile) return;
    setError("");
    let id;
    try {
      id = window.turnstile.render(container.current, {
        sitekey: siteKey, action: "checkout", theme: "auto",
        callback: (token) => { onToken(token); setError(""); },
        "expired-callback": () => onToken(""),
        "error-callback": () => { onToken(""); setError("নিরাপত্তা যাচাই হয়নি। আবার চেষ্টা করুন।"); },
      });
    } catch {
      setError("নিরাপত্তা যাচাই চালু হয়নি। আবার চেষ্টা করুন।");
    }
    return () => { if (id !== undefined) window.turnstile?.remove(id); };
  }, [ready, siteKey, onToken, resetKey, retry]);

  return (
    <div>
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        onReady={() => setReady(true)} onError={() => setError("নিরাপত্তা যাচাই লোড হয়নি। সংযোগ পরীক্ষা করে পৃষ্ঠা রিফ্রেশ করুন।")} />
      <div ref={container} />
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {ready && <button type="button" onClick={() => setRetry((n) => n + 1)} className="mt-1 text-xs underline">নিরাপত্তা যাচাই আবার করুন</button>}
    </div>
  );
}
