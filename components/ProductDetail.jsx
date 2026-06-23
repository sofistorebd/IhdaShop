"use client";

import { useState } from "react";
import ProductImage from "./ProductImage";

export default function ProductDetail({ product }) {
  const gallery =
    product.images && product.images.length ? product.images : [product.image];
  const [active, setActive] = useState(gallery[0]);
  const bdt = (n) => "৳" + n.toLocaleString("bn-BD");

  return (
    <section className="bg-white">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-2 md:py-14">
        {/* গ্যালারি */}
        <div>
          <div className="aspect-square overflow-hidden rounded-3xl border border-gray-100 shadow-sm">
            <ProductImage src={active} name={product.name} />
          </div>
          <div className="mt-3 grid grid-cols-5 gap-2">
            {gallery.map((img, i) => (
              <button
                key={i}
                onClick={() => setActive(img)}
                className={`aspect-square overflow-hidden rounded-xl border-2 transition ${
                  active === img ? "border-brand" : "border-gray-100"
                }`}
              >
                <ProductImage src={img} name="" />
              </button>
            ))}
          </div>
        </div>

        {/* ডিটেইলস */}
        <div>
          {product.badge && (
            <span className="inline-block rounded-full bg-brand-light px-3 py-1 text-xs font-semibold text-brand">
              {product.badge}
            </span>
          )}
          <h1 className="mt-3 text-3xl font-bold text-ink">{product.name}</h1>
          <p className="mt-2 text-gray-600">{product.short}</p>

          <div className="mt-4 flex items-end gap-3">
            <span className="text-3xl font-bold text-brand">
              {bdt(product.price)}
            </span>
            {product.oldPrice && (
              <span className="pb-1 text-lg text-gray-400 line-through">
                {bdt(product.oldPrice)}
              </span>
            )}
            {product.oldPrice && (
              <span className="mb-1 rounded-md bg-brand-light px-2 py-0.5 text-sm font-semibold text-brand-dark">
                {Math.round((1 - product.price / product.oldPrice) * 100)}% ছাড়
              </span>
            )}
          </div>

          <ul className="mt-5 space-y-2">
            {product.features.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="mt-0.5 text-brand">✓</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>

          <a
            href="#order"
            className="mt-7 inline-block rounded-full bg-brand px-8 py-3.5 text-base font-bold text-white shadow-md transition hover:bg-brand-dark"
          >
            এখনই অর্ডার করুন
          </a>
        </div>
      </div>
    </section>
  );
}
