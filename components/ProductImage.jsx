// ছবি থাকলে দেখাবে, না থাকলে সুন্দর placeholder দেখাবে।
export default function ProductImage({ src, name, className = "" }) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={src}
        alt={name}
        className={`h-full w-full object-cover ${className}`}
      />
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
      <span className="mt-1 text-[11px] text-gray-400">ছবি যোগ করুন</span>
    </div>
  );
}
