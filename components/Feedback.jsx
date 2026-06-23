"use client";

import { useEffect, useRef } from "react";
import { feedbackImages } from "@/data/feedback";

export default function Feedback() {
  const trackRef = useRef(null);
  const pausedRef = useRef(false);

  function scrollBy(dir) {
    const el = trackRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.8;
    el.scrollBy({ left: dir * amount, behavior: "smooth" });
  }

  // অটো-স্লাইড (প্রতি ৩ সেকেন্ডে), হোভার/টাচে থামে
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const id = setInterval(() => {
      if (pausedRef.current) return;
      const atEnd =
        el.scrollLeft + el.clientWidth >= el.scrollWidth - 5;
      if (atEnd) {
        el.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        el.scrollBy({ left: 300, behavior: "smooth" });
      }
    }, 3000);
    return () => clearInterval(id);
  }, []);

  return (
    <section id="reviews" className="bg-white">
      <div className="mx-auto max-w-6xl px-4 py-14">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <span className="text-sm font-medium text-brand">বিশ্বস্ততা</span>
            <h2 className="mt-1 text-3xl font-bold text-ink">
              গ্রাহকের প্রকৃত মতামত
            </h2>
            <p className="mt-2 text-sm text-gray-500">
              আমাদের পেজ, মেসেজ ও কমেন্টে গ্রাহকদের আসল রিভিউ
            </p>
          </div>

          {/* arrow বাটন (ডেস্কটপ) */}
          <div className="hidden shrink-0 gap-2 sm:flex">
            <button
              onClick={() => scrollBy(-1)}
              aria-label="আগের"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 text-ink transition hover:bg-brand hover:text-white"
            >
              ‹
            </button>
            <button
              onClick={() => scrollBy(1)}
              aria-label="পরের"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 text-ink transition hover:bg-brand hover:text-white"
            >
              ›
            </button>
          </div>
        </div>

        {/* single-row slider */}
        <div
          ref={trackRef}
          onMouseEnter={() => (pausedRef.current = true)}
          onMouseLeave={() => (pausedRef.current = false)}
          onTouchStart={() => (pausedRef.current = true)}
          className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {feedbackImages.map((src, i) => (
            <div
              key={i}
              className="w-[260px] shrink-0 snap-start sm:w-[300px]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={`গ্রাহক রিভিউ ${i + 1}`}
                loading="lazy"
                className="w-full rounded-2xl border border-gray-100 shadow-sm"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
