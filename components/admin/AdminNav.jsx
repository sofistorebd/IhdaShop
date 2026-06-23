import Link from "next/link";
import { site } from "@/config";
import LogoutButton from "./LogoutButton";

export default function AdminNav({ active }) {
  const link = (href, label, key) => (
    <Link
      href={href}
      className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
        active === key
          ? "bg-brand text-white"
          : "text-white/80 hover:bg-white/10"
      }`}
    >
      {label}
    </Link>
  );
  return (
    <header className="bg-ink text-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">🧕</span>
          <span className="font-bold">{site.brandName} — অ্যাডমিন</span>
        </div>
        <nav className="flex items-center gap-2">
          {link("/admin", "অর্ডার", "orders")}
          {link("/admin/products", "প্রোডাক্ট", "products")}
          <LogoutButton />
        </nav>
      </div>
    </header>
  );
}
