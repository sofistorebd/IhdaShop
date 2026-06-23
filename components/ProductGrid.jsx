import { products } from "@/data/products";
import ProductCard from "./ProductCard";

export default function ProductGrid() {
  return (
    <section id="products" className="bg-gray-50">
      <div className="mx-auto max-w-6xl px-4 py-14">
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
