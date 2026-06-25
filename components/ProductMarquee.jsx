import ProductImage from "./ProductImage";

// উপরের একটানা (right-to-left) ছবি স্লাইডার — থামে না, নিরবচ্ছিন্ন লুপ
export default function ProductMarquee({ images = [] }) {
  if (!images.length) return null;

  // মোবাইলে ১টা, ট্যাবলেটে ২টা, PC তে ৩টা দৃশ্যমান
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
    <section className="overflow-hidden bg-brand-light py-5">
      {/* দুটো অভিন্ন গ্রুপ → translateX(-50%) এ নিখুঁত seamless লুপ */}
      <div className="marquee-track flex w-max">
        <Group />
        <Group />
      </div>
    </section>
  );
}
