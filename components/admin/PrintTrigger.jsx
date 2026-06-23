"use client";

import { useEffect } from "react";

export default function PrintTrigger({ count }) {
  useEffect(() => {
    // পেজ লোড হলে অটো প্রিন্ট ডায়ালগ
    const t = setTimeout(() => window.print(), 600);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="no-print sticky top-0 z-10 flex items-center justify-between gap-3 border-b bg-white px-4 py-3">
      <span className="text-sm text-gray-600">{count}টি লেবেল</span>
      <div className="flex gap-2">
        <button
          onClick={() => window.print()}
          className="rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
        >
          🖨️ প্রিন্ট
        </button>
        <button
          onClick={() => window.close()}
          className="rounded-full border border-gray-300 px-5 py-2 text-sm font-semibold text-gray-600"
        >
          বন্ধ করো
        </button>
      </div>
    </div>
  );
}
