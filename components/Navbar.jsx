import Link from "next/link";
import { getSettings } from "@/lib/settings";

export default async function Navbar() {
  const site = await getSettings();
  return (
    <header
      className="sticky top-0 z-40 border-b border-gray-100 bg-white text-ink"
      style={{ backgroundColor: site.headerBackgroundColor || undefined, color: site.headerTextColor || undefined }}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          {site.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={site.logoUrl}
              alt={site.brandName}
              style={{ height: `${site.logoHeight}px` }}
              className="w-auto max-w-[220px] object-contain"
            />
          ) : (
            <>
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-lg text-white">
                🧕
              </span>
              <span className="text-lg font-bold text-ink" style={{ color: site.headerTextColor || undefined }}>{site.brandName}</span>
            </>
          )}
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium text-gray-600 md:flex" style={{ color: site.headerTextColor || undefined }}>
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
