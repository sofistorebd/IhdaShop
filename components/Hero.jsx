"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { site } from "@/config";
import ProductImage from "./ProductImage";

export default function Hero({ products = [] }) {
  const slides = products.slice(0, 6);
  const [i, setI] = useState(0);
  const paused = useRef(false);
  const current = slides.length ? slides[i % slides.length] : null;

  useEffect(() => {
    if (slides.length <= 1) return;
    const id = setInterval(() => {
      if (!paused.current) setI((v) => (v + 1) % slides.length);
    }, 4000);
    return () => clearInterval(id);
  }, [slides.length]);

  const bdt = (n) => "৳" + Number(n).toLocaleString("bn-BD");

  return (
    <section
      id="top"
      className="relative overflow-hidden bg-gradient-to-b from-brand-light to-white"
    >
      {/* aesthetic background শেপ */}
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-brand/20 blur-3xl" />
      <div className="pointer-events-none absolute right-[-60px] top-32 h-80 w-80 rounded-full bg-brand/10 blur-3xl" />

      <div className="relative mx-auto grid max-w-6xl items-center gap-8 px-4 py-8 md:grid-cols-2 md:py-16">
        {/* স্লাইডার (মোবাইলে উপরে) */}
        <div
          className="order-1 md:order-2"
          onMouseEnter={() => (paused.current = true)}
          onMouseLeave={() => (paused.current = false)}
          onTouchStart={() => (paused.current = true)}
        >
          <div className="relative mx-auto aspect-[4/5] w-full max-w-[300px] overflow-hidden rounded-3xl bg-brand-light shadow-xl sm:max-w-sm sm:aspect-[3/4]">
            {slides.length === 0 && (
              <div className="flex h-full w-full items-center justify-center text-7xl">
                🧕
              </div>
            )}
            {slides.map((p, idx) => (
              <div
                key={p.slug ?? idx}
                className={`absolute inset-0 transition-all duration-700 ease-out ${
                  idx === i
                    ? "scale-100 opacity-100"
                    : "scale-105 opacity-0"
                }`}
              >
                <ProductImage src={p.image} name={p.name} />
              </div>
            ))}

            {/* প্রোডাক্ট নাম + দাম overlay */}
            {current && (
              <Link
                href={`/product/${current.slug}`}
                className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent p-4 pt-10"
              >
                <p className="text-sm font-semibold text-white drop-shadow">
                  {current.name}
                </p>
                <p className="text-xs text-white/90">
                  {bdt(current.price)}
                  {current.oldPrice && (
                    <span className="ml-2 line-through opacity-70">
                      {bdt(current.oldPrice)}
                    </span>
                  )}
                </p>
              </Link>
            )}

            {/* dots */}
            {slides.length > 1 && (
              <div className="absolute left-0 right-0 top-3 flex justify-center gap-1.5">
                {slides.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setI(idx)}
                    aria-label={`স্লাইড ${idx + 1}`}
                    className={`h-1.5 rounded-full transition-all ${
                      idx === i ? "w-5 bg-white" : "w-1.5 bg-white/60"
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* টেক্সট + বাটন */}
        <div className="order-2 text-center md:order-1 md:text-left">
          <span className="inline-block rounded-full bg-brand/10 px-4 py-1 text-sm font-medium text-brand">
            প্রিমিয়াম মডেস্ট কালেকশন
          </span>
          <h1 className="mt-4 text-3xl font-bold leading-tight text-ink sm:text-4xl md:text-5xl">
            {site.tagline}
          </h1>
          <p className="mx-auto mt-4 max-w-md text-gray-600 md:mx-0">
            {site.description}
          </p>

          <div className="mt-7 flex flex-wrap justify-center gap-3 md:justify-start">
            <Link
              href={current ? `/product/${current.slug}` : "#products"}
              className="rounded-full bg-brand px-7 py-3 font-semibold text-white shadow-md transition hover:bg-brand-dark"
            >
              এখনই অর্ডার করুন
            </Link>
            <a
              href="#products"
              className="rounded-full border border-brand px-7 py-3 font-semibold text-brand transition hover:bg-brand-light"
            >
              প্রোডাক্ট দেখুন
            </a>
          </div>

          <div className="mt-7 flex items-center justify-center gap-2 text-sm text-gray-500 md:justify-start">
            <span className="text-accent">★★★★★</span>
            <span>৫০০+ সন্তুষ্ট গ্রাহক</span>
          </div>
        </div>
      </div>
    </section>
  );
}
