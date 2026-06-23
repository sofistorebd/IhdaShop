"use client";

import ProductImage from "./ProductImage";

export default function ProductCard({ product }) {
  function selectAndScroll() {
    // OrderForm এই ইভেন্ট শুনে প্রোডাক্ট সিলেক্ট করবে
    window.dispatchEvent(
      new CustomEvent("select-product", { detail: product.slug })
    );
    document.getElementById("order")?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition hover:shadow-md">
      <div className="relative aspect-square overflow-hidden">
        <ProductImage src={product.image} name={product.name} />
        {product.badge && (
          <span className="absolute left-3 top-3 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-white">
            {product.badge}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-semibold text-brand-dark">{product.name}</h3>
        <p className="mt-1 text-xs text-gray-500">{product.short}</p>

        <div className="mt-3 flex items-center gap-2">
          <span className="text-lg font-bold text-accent">
            ৳{product.price.toLocaleString("bn-BD")}
          </span>
          {product.oldPrice && (
            <span className="text-sm text-gray-400 line-through">
              ৳{product.oldPrice.toLocaleString("bn-BD")}
            </span>
          )}
        </div>

        <button
          onClick={selectAndScroll}
          className="mt-4 w-full rounded-full bg-brand py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark"
        >
          অর্ডার করুন
        </button>
      </div>
    </div>
  );
}
