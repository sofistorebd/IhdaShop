import Link from "next/link";
import ProductImage from "./ProductImage";

export default function ProductCard({ product }) {
  return (
    <Link
      href={`/product/${product.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition hover:shadow-md"
    >
      <div className="relative aspect-[4/5] overflow-hidden">
        <ProductImage src={product.image} name={product.name} />
        {product.badge && (
          <span className="absolute left-3 top-3 rounded-full bg-brand px-3 py-1 text-xs font-semibold text-white">
            {product.badge}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-semibold text-ink">{product.name}</h3>
        <p className="mt-1 text-xs text-gray-500">{product.short}</p>

        <div className="mt-3 flex items-center gap-2">
          <span className="text-lg font-bold text-brand">
            ৳{product.price.toLocaleString("bn-BD")}
          </span>
          {product.oldPrice && (
            <span className="text-sm text-gray-400 line-through">
              ৳{product.oldPrice.toLocaleString("bn-BD")}
            </span>
          )}
        </div>

        <span className="mt-4 w-full rounded-full bg-brand py-2.5 text-center text-sm font-semibold text-white transition group-hover:bg-brand-dark">
          অর্ডার করুন
        </span>
      </div>
    </Link>
  );
}
