import Link from "next/link";
import { listProducts } from "@/lib/products-db";
import { hasDb } from "@/lib/db";
import AdminNav from "@/components/admin/AdminNav";
import ProductsTable from "@/components/admin/ProductsTable";
import { AdminHeader } from "@/components/admin/AdminUI";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

export default async function AdminProductsPage() {
  let products = [];
  let dbError = false;
  try {
    products = await listProducts();
  } catch {
    dbError = true;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav active="products" />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <AdminHeader
          title="প্রোডাক্ট ম্যানেজার"
          subtitle="প্রোডাক্ট যোগ, এডিট, দাম ও ছবি পরিবর্তন"
          action={
            <Link href="/admin/products/new"
              className="rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-dark">
              + নতুন প্রোডাক্ট
            </Link>
          }
        />

        {!hasDb() && (
          <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            ⚠️ DATABASE_URL সেট করা নেই — লোকালে স্ট্যাটিক প্রোডাক্ট দেখাচ্ছে (এডিট/ডিলিট লাইভেই কাজ করবে)।
          </p>
        )}
        {dbError && (
          <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            ⚠️ ডেটাবেজে সংযোগ ব্যর্থ।
          </p>
        )}

        <ProductsTable initial={products} />
      </main>
    </div>
  );
}
