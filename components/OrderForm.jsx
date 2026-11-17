"use client";

import { useEffect, useRef, useState } from "react";
import ProductImage from "./ProductImage";
import { track, trackCustom } from "@/lib/fbpixel";
import TurnstileChallenge from "./TurnstileChallenge";

// বাংলাদেশি মোবাইল: 11 ডিজিট, 01 দিয়ে শুরু (01XXXXXXXXX)। +880/880 থাকলেও ধরে।
function normalizePhone(p) {
  return String(p || "").replace(/[০-৯]/g, (c) => String(c.charCodeAt(0) - 0x09e6))
    .replace(/[\s()+-]/g, "").replace(/^880/, "0");
}
function validPhone(p) {
  return /^01[3-9]\d{8}$/.test(normalizePhone(p));
}

export default function OrderForm({ product, settings }) {
  const checkoutFired = useRef(false);
  const submitting = useRef(false);
  const attempt = useRef(null);
  const site = settings;
  const variants = product.variants;
  // ডিফল্ট: ফুল সেট (মেইন দামের সাথে মিলে), না পেলে প্রথমটা
  const defaultIdx = Math.max(
    0,
    variants.findIndex((v) => v.price === product.price)
  );

  const [vIdx, setVIdx] = useState(defaultIdx);
  const [size, setSize] = useState(product.sizes[0]);
  const [qty, setQty] = useState(1);
  const [area, setArea] = useState("inside"); // inside | outside
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [phoneErr, setPhoneErr] = useState("");
  const [status, setStatus] = useState("idle"); // idle | sending | success | error
  const [error, setError] = useState("");
  const [duplicate, setDuplicate] = useState(false);
  const [security, setSecurity] = useState(null);
  const [securityError, setSecurityError] = useState("");
  const [securityAttempt, setSecurityAttempt] = useState(0);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [challengeReset, setChallengeReset] = useState(0);
  const [companyWebsite, setCompanyWebsite] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setSecurity(null);
    setSecurityError("");
    fetch("/api/checkout/config", { cache: "no-store", signal: controller.signal })
      .then(async (res) => { const data = await res.json(); if (!res.ok || !data.ok) throw new Error(); return data; })
      .then(setSecurity)
      .catch((err) => { if (err.name !== "AbortError") setSecurityError("অর্ডার সেবা লোড হয়নি। আবার চেষ্টা করুন।"); });
    return () => controller.abort();
  }, [securityAttempt]);

  const variant = variants[vIdx];
  const deliveryCharge =
    area === "inside" ? site.delivery.insideDhaka : site.delivery.outsideDhaka;
  const subtotal = variant.price * qty;
  const total = subtotal + deliveryCharge;
  const bdt = (n) => "৳" + n.toLocaleString("bn-BD");
  const fullName = `${product.name} (${variant.name})`;

  function buildSummary() {
    return [
      `🛍️ নতুন অর্ডার — ${site.brandName}`,
      `প্রোডাক্ট: ${fullName}`,
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

  async function handleSubmit(e, allowRepeat = false) {
    e.preventDefault();
    if (submitting.current || !security) return;
    if (!name || !phone || !address) return;
    // ফোন ফরম্যাট ঠিক না থাকলে অর্ডার তৈরি হবে না
    if (!validPhone(phone)) {
      setPhoneErr("সঠিক ১১ ডিজিটের মোবাইল নাম্বার দিন (যেমন 01712345678)");
      return;
    }
    setPhoneErr("");
    if (security.enabled && !turnstileToken) {
      setError("নিরাপত্তা যাচাই সম্পন্ন করুন।");
      setStatus("error");
      return;
    }
    submitting.current = true;
    setStatus("sending");
    setError("");
    try {
      const payload = {
        product: fullName, variant: variant.name, slug: product.slug,
        size, qty, area: area === "inside" ? "ঢাকার ভিতরে" : "ঢাকার বাইরে",
        name: name.trim(), phone: normalizePhone(phone), address: address.trim(),
      };
      // Store only a fingerprint and random request ID, never form PII.
      const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(payload)));
      const fingerprint = Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, "0")).join("");
      const slot = "ihda-checkout:" + product.slug;
      let previous = attempt.current;
      if (!previous) { try { previous = JSON.parse(sessionStorage.getItem(slot)); } catch { /* private mode */ } }
      const current = previous?.fingerprint === fingerprint ? previous : { fingerprint, key: crypto.randomUUID() };
      attempt.current = current;
      try { sessionStorage.setItem(slot, JSON.stringify(current)); } catch { /* memory retry still works */ }
      const res = await fetch("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, requestKey: current.key, turnstileToken, companyWebsite, allowRepeat }),
      });
      const result = await res.json();
      if (!res.ok || !result.ok) {
        setDuplicate(result.code === "duplicate_order");
        if (result.code?.startsWith("verification_")) setSecurityAttempt((n) => n + 1);
        throw new Error(result.error || "অর্ডার জমা হয়নি। তথ্য যাচাই করে আবার চেষ্টা করুন।");
      }
      if (!result.replayed) trackCustom("OrderSubmitted", { content_ids: [product.slug] }, { eventID: current.key });
      try { sessionStorage.removeItem(slot); } catch { /* optional storage */ }
      setDuplicate(false);
      setStatus("success");
    } catch (err) {
      setError(err.message || "সংযোগে সমস্যা হয়েছে। একই তথ্য রেখে আবার চেষ্টা করুন।");
      setStatus("error");
      setTurnstileToken("");
      setChallengeReset((n) => n + 1);
    } finally {
      submitting.current = false;
    }
  }

  // প্রথম interaction এ একবার InitiateCheckout
  function onFirstInteract() {
    if (checkoutFired.current) return;
    checkoutFired.current = true;
    track("InitiateCheckout", {
      value: total,
      currency: "BDT",
      content_name: fullName,
      content_ids: [product.slug],
    });
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
          onFocusCapture={onFirstInteract}
          className="space-y-5 rounded-3xl bg-white p-6 shadow-lg"
        >
          <div className="hidden" aria-hidden="true">
            <label>Company website<input name="companyWebsite" tabIndex={-1} autoComplete="off" value={companyWebsite} onChange={(e) => setCompanyWebsite(e.target.value)} /></label>
          </div>
          {/* অপশন নির্বাচন (হিজাব-নিকাব / ফুল সেট) */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              অপশন নির্বাচন করুন
            </label>
            <div className="space-y-2">
              {variants.map((v, i) => {
                const isSel = i === vIdx;
                return (
                  <button
                    type="button"
                    key={v.name}
                    onClick={() => setVIdx(i)}
                    className={`flex w-full items-center gap-3 rounded-xl border p-2 text-left transition ${
                      isSel
                        ? "border-brand bg-brand-light"
                        : "border-gray-200 hover:border-brand/50"
                    }`}
                  >
                    <span className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-white">
                      <ProductImage src={product.image} name={product.name} />
                    </span>
                    <span className="flex-1">
                      <span className="block text-sm font-semibold text-ink">
                        {product.name} — {v.name}
                      </span>
                      <span
                        className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          isSel
                            ? "bg-brand text-white"
                            : "bg-brand-light text-brand-dark"
                        }`}
                      >
                        {v.name}
                      </span>
                    </span>
                    <span className="font-bold text-brand">{bdt(v.price)}</span>
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                        isSel
                          ? "border-brand bg-brand text-white"
                          : "border-gray-300"
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
              {product.sizes.map((s) => (
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
                onClick={() => setQty((q) => Math.min(20, q + 1))}
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
              autoComplete="name"
              maxLength={120}
              required
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-brand"
            />
            <div>
              <input
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  if (phoneErr) setPhoneErr("");
                }}
                placeholder="মোবাইল নাম্বার (১১ ডিজিট, যেমন 01712345678)"
                type="tel"
                autoComplete="tel"
                maxLength={24}
                required
                inputMode="tel"
                className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none ${
                  phoneErr
                    ? "border-red-400 focus:border-red-500"
                    : "border-gray-200 focus:border-brand"
                }`}
              />
              {phoneErr && (
                <p className="mt-1 text-xs font-medium text-red-500">⚠️ {phoneErr}</p>
              )}
            </div>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="সম্পূর্ণ ঠিকানা (গ্রাম/বাসা, থানা, জেলা)"
              autoComplete="street-address"
              maxLength={500}
              required
              rows={3}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-brand"
            />
          </div>

          {/* অর্ডার সামারি */}
          <div className="rounded-xl bg-gray-50 p-4 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>
                {product.name} ({variant.name}) × {qty}
              </span>
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
            <p role="alert" className="text-center text-sm text-red-700">
              {error}
            </p>
          )}

          {security?.enabled && <TurnstileChallenge siteKey={security.siteKey} onToken={setTurnstileToken} resetKey={challengeReset} />}
          {securityError && <p role="alert" className="text-sm text-red-700">{securityError} <button type="button" className="underline" onClick={() => setSecurityAttempt((n) => n + 1)}>আবার লোড করুন</button></p>}
          {duplicate && <button type="button" disabled={status === "sending" || !security || (security.enabled && !turnstileToken)}
            onClick={(e) => { if (window.confirm("আগের অর্ডারের পাশাপাশি সত্যিই আরেকটি নতুন অর্ডার করবেন?")) handleSubmit(e, true); }}
            className="w-full rounded-xl border border-amber-500 p-3 text-sm disabled:opacity-50">সত্যিই আরেকটি অর্ডার করতে চাই</button>}

          <button
            type="submit"
            disabled={status === "sending" || !security || (security.enabled && !turnstileToken)}
            className="w-full rounded-full bg-brand py-3.5 text-base font-bold text-white shadow-md transition hover:bg-brand-dark disabled:opacity-60"
          >
            {status === "sending" ? "পাঠানো হচ্ছে..." : !security ? "অর্ডার সেবা লোড হচ্ছে..." : "অর্ডার কনফার্ম করুন"}
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
