import Image from "next/image";

// ছবি থাকলে অপ্টিমাইজড next/image দেখাবে, না থাকলে সুন্দর placeholder।
// প্যারেন্টের একটা নির্দিষ্ট সাইজ থাকতে হবে (aspect-* / h-/w-)।
export default function ProductImage({ src, name, className = "" }) {
  if (src) {
    return (
      <span className="relative block h-full w-full">
        <Image
          src={src}
          alt={name || ""}
          fill
          sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 300px"
          className={`object-cover ${className}`}
        />
      </span>
    );
  }
  return (
    <div
      className={`flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-brand-light to-brand/10 ${className}`}
    >
      <span className="text-5xl">🧕</span>
      <span className="mt-2 px-3 text-center text-sm font-medium text-brand-dark">
        {name}
      </span>
    </div>
  );
}
