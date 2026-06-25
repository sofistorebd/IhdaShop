"use client";

import { useEffect, useRef } from "react";

export default function Feedback({ images = [] }) {
  const feedbackImages = images;
  const trackRef = useRef(null);
  const idxRef = useRef(0);
  const pausedRef = useRef(false);

  // index ধরে নির্দিষ্ট কার্ডে স্ক্রল করে (snap-friendly, নির্ভরযোগ্য loop)
  function goTo(idx) {
    const el = trackRef.current;
    const cards = el?.children;
    if (!el || !cards || !cards.length) return;
    const n = cards.length;
    idxRef.current = ((idx % n) + n) % n;
    const left = cards[idxRef.current].offsetLeft - cards[0].offsetLeft;
    el.scrollTo({ left, behavior: "smooth" });
  }

  // অটো-স্লাইড (প্রতি ৩.৫ সেকেন্ডে), হোভার/টাচে থামে
  useEffect(() => {
    const id = setInterval(() => {
      if (pausedRef.current) return;
      goTo(idxRef.current + 1);
    }, 3500);
    return () => clearInterval(id);
  }, []);

  if (!feedbackImages.length) return null;

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
              onClick={() => goTo(idxRef.current - 1)}
              aria-label="আগের"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 text-ink transition hover:bg-brand hover:text-white"
            >
              ‹
            </button>
            <button
              onClick={() => goTo(idxRef.current + 1)}
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
          onTouchEnd={() => setTimeout(() => (pausedRef.current = false), 4000)}
          className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {feedbackImages.map((src, i) => (
            <div
              key={i}
              className="h-[380px] w-[260px] shrink-0 snap-start overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm sm:w-[300px]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={`গ্রাহক রিভিউ ${i + 1}`}
                loading="lazy"
                className="h-full w-full object-contain object-top"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
