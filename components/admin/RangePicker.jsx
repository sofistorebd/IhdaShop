"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

const PRESETS = [
  ["1", "আজ"],
  ["7", "৭ দিন"],
  ["30", "৩০ দিন"],
  ["90", "৯০ দিন"],
  ["365", "১ বছর"],
];

export default function RangePicker({ current }) {
  const router = useRouter();
  const sp = useSearchParams();
  const [from, setFrom] = useState(sp.get("from") || "");
  const [to, setTo] = useState(sp.get("to") || "");

  const go = (params) =>
    router.push("/admin/analytics?" + new URLSearchParams(params).toString());

  return (
    <div className="mb-5 flex flex-wrap items-center gap-2">
      {PRESETS.map(([v, l]) => (
        <button
          key={v}
          onClick={() => go({ range: v })}
          className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
            current === v
              ? "bg-brand text-white shadow"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          {l}
        </button>
      ))}
      <span className="mx-1 hidden text-gray-300 sm:inline">|</span>
      <input
        type="date"
        value={from}
        max={to || undefined}
        onChange={(e) => setFrom(e.target.value)}
        className="rounded-lg border border-gray-200 px-2 py-1 text-sm text-gray-700"
      />
      <span className="text-gray-400">→</span>
      <input
        type="date"
        value={to}
        min={from || undefined}
        onChange={(e) => setTo(e.target.value)}
        className="rounded-lg border border-gray-200 px-2 py-1 text-sm text-gray-700"
      />
      <button
        onClick={() => from && to && go({ from, to })}
        disabled={!from || !to}
        className={`rounded-lg px-3 py-1.5 text-sm font-medium text-white transition ${
          current === "custom" ? "bg-brand" : "bg-ink"
        } disabled:opacity-40`}
      >
        দেখাও
      </button>
    </div>
  );
}
