import { site } from "@/config";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-gray-100 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <a href="#top" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-lg text-white">
            🧕
          </span>
          <span className="text-lg font-bold text-brand-dark">
            {site.brandName}
          </span>
        </a>

        <nav className="hidden items-center gap-6 text-sm font-medium text-gray-600 md:flex">
          <a href="#products" className="hover:text-brand">
            প্রোডাক্ট
          </a>
          <a href="#reviews" className="hover:text-brand">
            রিভিউ
          </a>
          <a href="#order" className="hover:text-brand">
            অর্ডার
          </a>
        </nav>

        <a
          href="#order"
          className="rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark"
        >
          অর্ডার করুন
        </a>
      </div>
    </header>
  );
}
