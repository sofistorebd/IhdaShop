"use client";

import { useState } from "react";

export default function ReviewsManager({ initial }) {
  const [reviews, setReviews] = useState(initial);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(null);
  const [msg, setMsg] = useState("");

  async function addFiles(fileList) {
    setUploading(true);
    setMsg("");
    for (const file of Array.from(fileList)) {
      try {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("prefix", "review");
        const up = await fetch("/api/admin/upload", { method: "POST", body: fd });
        const ud = await up.json();
        if (!ud.ok) {
          setMsg("❌ " + (ud.error || "আপলোড ব্যর্থ"));
          continue;
        }
        const res = await fetch("/api/admin/reviews", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageUrl: ud.url }),
        });
        const d = await res.json();
        if (d.ok) setReviews((p) => [...p, d.review]);
        else setMsg("❌ " + (d.error || "যোগ ব্যর্থ"));
      } catch (err) {
        setMsg("❌ " + (err?.message || "আপলোড ব্যর্থ"));
      }
    }
    setUploading(false);
  }

  async function remove(id) {
    if (!confirm("এই রিভিউ মুছে ফেলবে?")) return;
    setBusy(id);
    await fetch(`/api/admin/reviews/${id}`, { method: "DELETE" });
    setReviews((p) => p.filter((r) => r.id !== id));
    setBusy(null);
  }

  return (
    <div>
      {msg && (
        <div className="mb-3 rounded-xl bg-ink px-4 py-2 text-sm text-white">{msg}</div>
      )}

      <label className="mb-5 flex cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-gray-300 bg-white py-10 text-center text-gray-500 transition hover:border-brand hover:bg-brand-light/30">
        <span className="text-3xl">📸</span>
        <span className="font-semibold text-ink">
          {uploading ? "আপলোড হচ্ছে..." : "রিভিউ স্ক্রিনশট আপলোড করো"}
        </span>
        <span className="text-xs">একাধিক ছবি একসাথে দেওয়া যাবে (মেসেজ/কমেন্ট/রিভিউর স্ক্রিনশট)</span>
        <input type="file" accept="image/*" multiple className="hidden"
          onChange={(e) => e.target.files && addFiles(e.target.files)} />
      </label>

      {reviews.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-10 text-center text-gray-500">
          কোনো রিভিউ নেই। উপরে থেকে আপলোড করো।
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {reviews.map((r) => (
            <div key={r.id} className="group relative overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={r.image_url} alt="review" className="h-48 w-full object-cover object-top" />
              <button
                disabled={busy === r.id}
                onClick={() => remove(r.id)}
                className="absolute right-2 top-2 rounded-full bg-red-600/90 px-2.5 py-1 text-xs font-semibold text-white opacity-0 transition group-hover:opacity-100"
              >
                {busy === r.id ? "..." : "মুছো"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
