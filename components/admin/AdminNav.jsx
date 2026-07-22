import Link from "next/link";
import { getSettings } from "@/lib/settings";
import LogoutButton from "./LogoutButton";

const TABS = [
  { href: "/admin", key: "orders", label: "অর্ডার", icon: "🧾" },
  { href: "/admin/products", key: "products", label: "প্রোডাক্ট", icon: "🛍️" },
  { href: "/admin/reviews", key: "reviews", label: "রিভিউ", icon: "⭐" },
  { href: "/admin/analytics", key: "analytics", label: "অ্যানালিটিক্স", icon: "📈" },
  { href: "/admin/settings", key: "settings", label: "সেটিংস", icon: "⚙️" },
];

export default async function AdminNav({ active }) {
  const site = await getSettings();
  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white text-ink shadow-sm">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link href="/admin" className="flex items-center gap-2">
          {site.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={site.logoUrl}
              alt={site.brandName}
              className="h-8 w-auto max-w-[130px] object-contain"
            />
          ) : (
            <span className="text-xl">🧕</span>
          )}
          <span className="font-bold text-ink">{site.brandName}</span>
          <span className="hidden rounded-full bg-brand-light px-2 py-0.5 text-[11px] font-semibold text-brand sm:inline">
            অ্যাডমিন
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <nav className="flex items-center gap-1 rounded-full bg-gray-100 p-1">
            {TABS.map((t) => (
              <Link
                key={t.key}
                href={t.href}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition ${
                  active === t.key
                    ? "bg-brand text-white shadow"
                    : "text-gray-600 hover:bg-gray-200"
                }`}
              >
                <span>{t.icon}</span>
                <span className="hidden sm:inline">{t.label}</span>
              </Link>
            ))}
          </nav>
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
