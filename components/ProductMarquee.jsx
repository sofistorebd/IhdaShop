import ProductImage from "./ProductImage";

// উপরের একটানা (right-to-left) ছবি স্লাইডার — থামে না, নিরবচ্ছিন্ন লুপ
export default function ProductMarquee({ images = [] }) {
  if (!images.length) return null;

  const Group = () => (
    <div className="flex shrink-0 gap-4 pr-4">
      {images.map((src, i) => (
        <div
          key={i}
          className="h-52 w-40 shrink-0 overflow-hidden rounded-2xl border-2 border-white bg-white shadow-sm sm:h-60 sm:w-48"
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
