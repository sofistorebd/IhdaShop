import ProductCard from "./ProductCard";

export default function ProductGrid({ products = [] }) {
  return (
    <section id="products" className="relative overflow-hidden bg-gray-50">
      {/* aesthetic background শেপ */}
      <div className="pointer-events-none absolute right-[-80px] top-10 h-72 w-72 rounded-full bg-brand/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-10 left-[-60px] h-64 w-64 rounded-full bg-brand/10 blur-3xl" />

      <div className="relative mx-auto max-w-6xl px-4 py-14">
        <div className="mb-10 text-center">
          <span className="text-sm font-medium text-brand">আমাদের কালেকশন</span>
          <h2 className="mt-1 text-3xl font-bold text-brand-dark">
            আপনার পছন্দের সেটটি বেছে নিন
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.slug} product={p} />
          ))}
        </div>
      </div>
    </section>
  );
}
