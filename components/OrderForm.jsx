"use client";

import { useState, useMemo } from "react";
import { site } from "@/config";
import { products } from "@/data/products";
import ProductImage from "./ProductImage";

export default function OrderForm({ product }) {
  const [slug, setSlug] = useState(product.slug);
  const selected = useMemo(
    () => products.find((p) => p.slug === slug) ?? product,
    [slug, product]
  );

  const [size, setSize] = useState(product.sizes[0]);
  const [qty, setQty] = useState(1);
  const [area, setArea] = useState("inside"); // inside | outside
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [status, setStatus] = useState("idle"); // idle | sending | success | error

  function chooseProduct(p) {
    setSlug(p.slug);
    setSize(p.sizes[0]);
  }

  const deliveryCharge =
    area === "inside" ? site.delivery.insideDhaka : site.delivery.outsideDhaka;
  const subtotal = selected.price * qty;
  const total = subtotal + deliveryCharge;
  const bdt = (n) => "৳" + n.toLocaleString("bn-BD");

  function buildSummary() {
    return [
      `🛍️ নতুন অর্ডার — ${site.brandName}`,
      `প্রোডাক্ট: ${selected.name}`,
      `সাইজ: ${size}`,
      `পরিমাণ: ${qty}`,
      `ডেলিভারি: ${area === "inside" ? "ঢাকার ভিতরে" : "ঢাকার বাইরে"} (${bdt(
        deliveryCharge
      )})`,
      `মোট: ${bdt(total)}`,
      `নাম: ${name}`,
      `ফোন: ${phone}`,
      `ঠিকানা: ${address}`,
    ].join("\n");
  }

  function orderViaWhatsApp() {
    const msg = encodeURIComponent(buildSummary());
    window.open(`https://wa.me/${site.whatsapp}?text=${msg}`, "_blank");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name || !phone || !address) return;
    setStatus("sending");
    try {
      const res = await fetch("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product: selected.name,
          slug: selected.slug,
          price: selected.price,
          size,
          qty,
          area: area === "inside" ? "ঢাকার ভিতরে" : "ঢাকার বাইরে",
          deliveryCharge,
          total,
          name,
          phone,
          address,
        }),
      });
      if (!res.ok) throw new Error("failed");
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <section id="order" className="bg-brand-light">
        <div className="mx-auto max-w-md px-4 py-20 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand text-3xl text-white">
            ✓
          </div>
          <h2 className="text-2xl font-bold text-ink">অর্ডার সফল হয়েছে!</h2>
          <p className="mt-2 text-gray-600">
            ধন্যবাদ {name}! আমরা শীঘ্রই {phone} নাম্বারে কল করে অর্ডার কনফার্ম
            করব।
          </p>
        </div>
      </section>
    );
  }

  return (
    <section id="order" className="relative overflow-hidden bg-brand-light">
      {/* aesthetic background শেপ */}
      <div className="pointer-events-none absolute -left-16 top-10 h-60 w-60 rounded-full bg-brand/15 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 bottom-10 h-72 w-72 rounded-full bg-brand/15 blur-3xl" />

      <div className="relative mx-auto max-w-2xl px-4 py-14">
        <div className="mb-8 text-center">
          <span className="text-sm font-medium text-brand">সহজ অর্ডার</span>
          <h2 className="mt-1 text-3xl font-bold text-ink">
            নিচের ফর্মটি পূরণ করুন
          </h2>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-5 rounded-3xl bg-white p-6 shadow-lg"
        >
          {/* প্রোডাক্ট নির্বাচন (সব প্রোডাক্ট) */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              প্রোডাক্ট নির্বাচন করুন
            </label>
            <div className="space-y-2">
              {products.map((p) => {
                const isSel = p.slug === slug;
                return (
                  <button
                    type="button"
                    key={p.slug}
                    onClick={() => chooseProduct(p)}
                    className={`flex w-full items-center gap-3 rounded-xl border p-2 text-left transition ${
                      isSel
                        ? "border-brand bg-brand-light"
                        : "border-gray-200 hover:border-brand/50"
                    }`}
                  >
                    <span className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-white">
                      <ProductImage src={p.image} name={p.name} />
                    </span>
                    <span className="flex-1">
                      <span className="block text-sm font-semibold text-ink">
                        {p.name}
                      </span>
                      <span className="block text-xs text-gray-500">
                        {p.short}
                      </span>
                    </span>
                    <span className="font-bold text-brand">{bdt(p.price)}</span>
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                        isSel ? "border-brand bg-brand text-white" : "border-gray-300"
                      }`}
                    >
                      {isSel && <span className="text-[11px]">✓</span>}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* সাইজ (বাটন) */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              সাইজ নির্বাচন করুন
            </label>
            <div className="flex flex-wrap gap-2">
              {selected.sizes.map((s) => (
                <button
                  type="button"
                  key={s}
                  onClick={() => setSize(s)}
                  className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${
                    size === s
                      ? "border-brand bg-brand text-white"
                      : "border-gray-200 text-gray-700 hover:border-brand"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* পরিমাণ */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              পরিমাণ
            </label>
            <div className="inline-flex items-center rounded-xl border border-gray-200">
              <button
                type="button"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="px-4 py-2 text-lg text-brand"
              >
                −
              </button>
              <span className="w-10 text-center font-semibold">{qty}</span>
              <button
                type="button"
                onClick={() => setQty((q) => q + 1)}
                className="px-4 py-2 text-lg text-brand"
              >
                +
              </button>
            </div>
          </div>

          {/* ডেলিভারি এরিয়া */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              ডেলিভারি এলাকা
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setArea("inside")}
                className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
                  area === "inside"
                    ? "border-brand bg-brand-light text-ink"
                    : "border-gray-200 text-gray-600"
                }`}
              >
                ঢাকার ভিতরে ({bdt(site.delivery.insideDhaka)})
              </button>
              <button
                type="button"
                onClick={() => setArea("outside")}
                className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
                  area === "outside"
                    ? "border-brand bg-brand-light text-ink"
                    : "border-gray-200 text-gray-600"
                }`}
              >
                ঢাকার বাইরে ({bdt(site.delivery.outsideDhaka)})
              </button>
            </div>
          </div>

          {/* কাস্টমার তথ্য */}
          <div className="space-y-3">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="আপনার নাম"
              required
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-brand"
            />
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="মোবাইল নাম্বার"
              required
              inputMode="tel"
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-brand"
            />
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="সম্পূর্ণ ঠিকানা (গ্রাম/বাসা, থানা, জেলা)"
              required
              rows={3}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-brand"
            />
          </div>

          {/* অর্ডার সামারি */}
          <div className="rounded-xl bg-gray-50 p-4 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>{selected.name} × {qty}</span>
              <span>{bdt(subtotal)}</span>
            </div>
            <div className="mt-1 flex justify-between text-gray-600">
              <span>ডেলিভারি চার্জ</span>
              <span>{bdt(deliveryCharge)}</span>
            </div>
            <div className="mt-2 flex justify-between border-t border-gray-200 pt-2 text-base font-bold text-ink">
              <span>সর্বমোট</span>
              <span>{bdt(total)}</span>
            </div>
          </div>

          {status === "error" && (
            <p className="text-center text-sm text-brand">
              দুঃখিত, সমস্যা হয়েছে। অনুগ্রহ করে WhatsApp এ অর্ডার করুন।
            </p>
          )}

          <button
            type="submit"
            disabled={status === "sending"}
            className="w-full rounded-full bg-brand py-3.5 text-base font-bold text-white shadow-md transition hover:bg-brand-dark disabled:opacity-60"
          >
            {status === "sending" ? "পাঠানো হচ্ছে..." : "অর্ডার কনফার্ম করুন"}
          </button>

          <button
            type="button"
            onClick={orderViaWhatsApp}
            className="flex w-full items-center justify-center gap-2 rounded-full border border-green-500 py-3 text-base font-semibold text-green-600 transition hover:bg-green-50"
          >
            <span>📱</span> WhatsApp এ অর্ডার করুন
          </button>
        </form>
      </div>
    </section>
  );
}
