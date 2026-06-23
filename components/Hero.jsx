import { site } from "@/config";

export default function Hero() {
  return (
    <section
      id="top"
      className="relative overflow-hidden bg-gradient-to-b from-brand-light to-white"
    >
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 md:grid-cols-2 md:py-20">
        {/* বাম পাশ — টেক্সট */}
        <div>
          <span className="inline-block rounded-full bg-brand/10 px-4 py-1 text-sm font-medium text-brand">
            প্রিমিয়াম মডেস্ট কালেকশন
          </span>
          <h1 className="mt-4 text-4xl font-bold leading-tight text-brand-dark md:text-5xl">
            {site.tagline}
          </h1>
          <p className="mt-4 max-w-md text-gray-600">{site.description}</p>

          <div className="mt-7 flex flex-wrap gap-3">
            <a
              href="#order"
              className="rounded-full bg-brand px-7 py-3 font-semibold text-white shadow-md transition hover:bg-brand-dark"
            >
              এখনই অর্ডার করুন
            </a>
            <a
              href="#products"
              className="rounded-full border border-brand px-7 py-3 font-semibold text-brand transition hover:bg-brand-light"
            >
              প্রোডাক্ট দেখুন
            </a>
          </div>

          <div className="mt-8 flex items-center gap-2 text-sm text-gray-500">
            <span className="text-accent">★★★★★</span>
            <span>৫০০+ সন্তুষ্ট গ্রাহক</span>
          </div>
        </div>

        {/* ডান পাশ — ছবি */}
        <div className="relative">
          <div className="mx-auto flex aspect-[4/5] max-w-sm items-center justify-center overflow-hidden rounded-3xl bg-gradient-to-br from-brand/20 to-brand-light shadow-xl">
            <span className="text-8xl">🧕</span>
          </div>
          <div className="absolute bottom-4 left-4 rounded-xl bg-white px-4 py-3 shadow-lg">
            <p className="text-sm font-semibold text-brand-dark">দারুণ মান!</p>
            <p className="text-xs text-gray-500">যাচাইকৃত ক্রেতা</p>
            <p className="text-accent">★★★★★</p>
          </div>
        </div>
      </div>
    </section>
  );
}
