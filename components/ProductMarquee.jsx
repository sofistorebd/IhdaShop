import ProductImage from "./ProductImage";

// উপরের সেকশন: হেডিং + সাবটাইটেল + একটানা (right-to-left) ছবি স্লাইডার + CTA
// PC তে ৩টা, ট্যাবলেটে ২টা, মোবাইলে ১টা ছবি দৃশ্যমান
export default function ProductMarquee({ images = [], title, subtitle }) {
  const Group = () => (
    <div className="flex shrink-0 gap-3 pr-3 sm:gap-4 sm:pr-4">
      {images.map((src, i) => (
        <div
          key={i}
          className="aspect-[3/4] w-[88vw] shrink-0 overflow-hidden rounded-2xl border-2 border-white bg-white shadow-sm sm:w-[46vw] lg:w-[31vw]"
        >
          <ProductImage src={src} name="" />
        </div>
      ))}
    </div>
  );

  return (
    <section className="overflow-hidden bg-brand-light pb-6 pt-8">
      {/* হেডিং */}
      <div className="mx-auto mb-6 max-w-6xl px-4 text-center">
        <span className="text-xs font-semibold uppercase tracking-wider text-brand">
          প্রিমিয়াম কালেকশন
        </span>
        {title && (
          <h1 className="mt-2 text-3xl font-bold text-ink md:text-4xl">{title}</h1>
        )}
        {subtitle && (
          <p className="mx-auto mt-2 max-w-xl text-sm text-gray-600">{subtitle}</p>
        )}
      </div>

      {/* একটানা স্লাইডার */}
      {images.length > 0 && (
        <div className="marquee-track flex w-max">
          <Group />
          <Group />
        </div>
      )}

      {/* CTA */}
      <div className="mt-7 px-4 text-center">
        <a
          href="#order"
          className="inline-block rounded-full bg-brand px-8 py-3.5 text-base font-bold text-white shadow-md transition hover:bg-brand-dark"
        >
          অর্ডার করতে এখানে ক্লিক করুন
        </a>
      </div>
    </section>
  );
}
