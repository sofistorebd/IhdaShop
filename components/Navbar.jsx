import Link from "next/link";
import { site } from "@/config";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-ink text-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-lg text-white">
            🧕
          </span>
          <span className="text-lg font-bold">{site.brandName}</span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium text-white/80 md:flex">
          <Link href="/#products" className="hover:text-brand">
            প্রোডাক্ট
          </Link>
          <Link href="/#reviews" className="hover:text-brand">
            রিভিউ
          </Link>
        </nav>

        <Link
          href="/#products"
          className="rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark"
        >
          অর্ডার করুন
        </Link>
      </div>
    </header>
  );
}
