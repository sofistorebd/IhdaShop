import { feedbackImages } from "@/data/feedback";

export default function Feedback() {
  return (
    <section id="reviews" className="bg-white">
      <div className="mx-auto max-w-6xl px-4 py-14">
        <div className="mb-3 text-center">
          <span className="text-sm font-medium text-brand">বিশ্বস্ততা</span>
          <h2 className="mt-1 text-3xl font-bold text-ink">
            গ্রাহকের প্রকৃত মতামত
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            আমাদের পেজ, মেসেজ ও কমেন্টে গ্রাহকদের আসল রিভিউ
          </p>
        </div>

        {/* masonry-style স্ক্রিনশট গ্যালারি */}
        <div className="mt-8 columns-1 gap-4 sm:columns-2 lg:columns-3 [&>*]:mb-4">
          {feedbackImages.map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={src}
              alt={`গ্রাহক রিভিউ ${i + 1}`}
              loading="lazy"
              className="w-full break-inside-avoid rounded-2xl border border-gray-100 shadow-sm"
            />
          ))}
        </div>
      </div>
    </section>
  );
}
