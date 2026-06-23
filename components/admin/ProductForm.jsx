"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

function slugify(s) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9ঀ-৿]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function ProductForm({ initial, id }) {
  const router = useRouter();
  const [f, setF] = useState({
    name: initial?.name || "",
    slug: initial?.slug || "",
    price: initial?.price || "",
    oldPrice: initial?.oldPrice || "",
    badge: initial?.badge || "",
    short: initial?.short || "",
    sizes: (initial?.sizes || []).join(", "),
    features: (initial?.features || []).join("\n"),
    active: initial?.active !== false,
    sortOrder: initial?.sortOrder ?? 0,
  });
  const [images, setImages] = useState(initial?.images || []);
  const [variants, setVariants] = useState(
    initial?.variants?.length
      ? initial.variants
      : [{ name: "ফুল সেট", price: "" }]
  );
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));

  async function uploadFiles(fileList) {
    setUploading(true);
    setError("");
    for (const file of Array.from(fileList)) {
      const fd = new FormData();
      fd.append("file", file);
      try {
        const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
        const d = await res.json();
        if (d.ok) setImages((p) => [...p, d.url]);
        else setError(d.error || "আপলোড ব্যর্থ");
      } catch {
        setError("আপলোড ব্যর্থ");
      }
    }
    setUploading(false);
  }

  function addImageUrl() {
    const url = prompt("ছবির URL দাও:");
    if (url) setImages((p) => [...p, url.trim()]);
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (!f.name) return setError("নাম দাও");
    setBusy(true);
    const payload = {
      name: f.name,
      slug: f.slug || slugify(f.name),
      price: Number(f.price) || 0,
      oldPrice: f.oldPrice ? Number(f.oldPrice) : null,
      badge: f.badge,
      short: f.short,
      sizes: f.sizes.split(",").map((s) => s.trim()).filter(Boolean),
      features: f.features.split("\n").map((s) => s.trim()).filter(Boolean),
      variants: variants
        .filter((v) => v.name && v.price !== "")
        .map((v) => ({ name: v.name, price: Number(v.price) || 0 })),
      images,
      image: images[0] || null,
      active: f.active,
      sortOrder: Number(f.sortOrder) || 0,
    };
    try {
      const res = await fetch(
        id ? `/api/admin/products/${id}` : "/api/admin/products",
        {
          method: id ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const d = await res.json();
      if (!d.ok) throw new Error(d.error || "সেভ ব্যর্থ");
      router.push("/admin/products");
      router.refresh();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  const inp =
    "w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-brand";
  const lbl = "mb-1 block text-sm font-semibold text-gray-700";

  return (
    <form onSubmit={submit} className="space-y-5 rounded-2xl bg-white p-6 shadow-sm">
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={lbl}>প্রোডাক্টের নাম *</label>
          <input className={inp} value={f.name}
            onChange={(e) => { set("name", e.target.value); if (!id && !f.slug) set("slug", slugify(e.target.value)); }} />
        </div>
        <div>
          <label className={lbl}>Slug (URL) *</label>
          <input className={inp} value={f.slug} onChange={(e) => set("slug", e.target.value)} placeholder="haya-classic" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className={lbl}>দাম (৳) *</label>
          <input type="number" className={inp} value={f.price} onChange={(e) => set("price", e.target.value)} />
        </div>
        <div>
          <label className={lbl}>আগের দাম (ছাড়)</label>
          <input type="number" className={inp} value={f.oldPrice} onChange={(e) => set("oldPrice", e.target.value)} />
        </div>
        <div>
          <label className={lbl}>ব্যাজ</label>
          <input className={inp} value={f.badge} onChange={(e) => set("badge", e.target.value)} placeholder="বেস্ট সেলার" />
        </div>
      </div>

      <div>
        <label className={lbl}>সংক্ষিপ্ত বর্ণনা</label>
        <input className={inp} value={f.short} onChange={(e) => set("short", e.target.value)} />
      </div>

      {/* ছবি */}
      <div>
        <label className={lbl}>ছবি (প্রথমটি মেইন ছবি)</label>
        <div className="flex flex-wrap gap-2">
          {images.map((url, i) => (
            <div key={i} className="relative h-20 w-20 overflow-hidden rounded-lg border border-gray-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-full w-full object-cover" />
              <button type="button" onClick={() => setImages((p) => p.filter((_, j) => j !== i))}
                className="absolute right-0 top-0 bg-red-600 px-1 text-xs text-white">×</button>
              {i === 0 && <span className="absolute bottom-0 left-0 bg-brand px-1 text-[10px] text-white">মেইন</span>}
            </div>
          ))}
          <label className="flex h-20 w-20 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-gray-300 text-xs text-gray-500 hover:border-brand">
            {uploading ? "..." : "+ আপলোড"}
            <input type="file" accept="image/*" multiple className="hidden"
              onChange={(e) => e.target.files && uploadFiles(e.target.files)} />
          </label>
        </div>
        <button type="button" onClick={addImageUrl} className="mt-2 text-xs text-brand underline">
          অথবা URL দিয়ে যোগ করো
        </button>
      </div>

      {/* সাইজ */}
      <div>
        <label className={lbl}>সাইজ (কমা দিয়ে আলাদা)</label>
        <input className={inp} value={f.sizes} onChange={(e) => set("sizes", e.target.value)} placeholder="ফ্রি সাইজ, ৫২, ৫৪, ৫৬" />
      </div>

      {/* ভ্যারিয়েন্ট */}
      <div>
        <label className={lbl}>অপশন / ভ্যারিয়েন্ট (নাম + দাম)</label>
        <div className="space-y-2">
          {variants.map((v, i) => (
            <div key={i} className="flex gap-2">
              <input className={inp} value={v.name} placeholder="হিজাব-নিকাব"
                onChange={(e) => setVariants((p) => p.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} />
              <input type="number" className={inp + " max-w-[140px]"} value={v.price} placeholder="দাম"
                onChange={(e) => setVariants((p) => p.map((x, j) => j === i ? { ...x, price: e.target.value } : x))} />
              <button type="button" onClick={() => setVariants((p) => p.filter((_, j) => j !== i))}
                className="shrink-0 rounded-lg border border-gray-200 px-3 text-gray-500">×</button>
            </div>
          ))}
        </div>
        <button type="button" onClick={() => setVariants((p) => [...p, { name: "", price: "" }])}
          className="mt-2 text-xs text-brand underline">+ অপশন যোগ করো</button>
      </div>

      {/* ফিচার */}
      <div>
        <label className={lbl}>ফিচার (প্রতি লাইনে একটি)</label>
        <textarea rows={4} className={inp} value={f.features} onChange={(e) => set("features", e.target.value)} />
      </div>

      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={f.active} onChange={(e) => set("active", e.target.checked)} className="accent-brand" />
          সাইটে দেখাও (active)
        </label>
        <div className="flex items-center gap-2 text-sm">
          <span>ক্রম:</span>
          <input type="number" className="w-20 rounded-lg border border-gray-200 px-2 py-1" value={f.sortOrder} onChange={(e) => set("sortOrder", e.target.value)} />
        </div>
      </div>

      <div className="flex gap-3">
        <button disabled={busy} className="rounded-full bg-brand px-6 py-2.5 font-semibold text-white hover:bg-brand-dark disabled:opacity-60">
          {busy ? "সেভ হচ্ছে..." : id ? "আপডেট করো" : "প্রোডাক্ট যোগ করো"}
        </button>
        <button type="button" onClick={() => router.push("/admin/products")} className="rounded-full border border-gray-300 px-6 py-2.5 font-semibold text-gray-600">
          বাতিল
        </button>
      </div>
    </form>
  );
}
