import AdminNav from "@/components/admin/AdminNav";
import ProductForm from "@/components/admin/ProductForm";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

export default function NewProductPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav active="products" />
      <main className="mx-auto max-w-3xl px-4 py-6">
        <h1 className="mb-5 text-xl font-bold text-ink">নতুন প্রোডাক্ট</h1>
        <ProductForm />
      </main>
    </div>
  );
}
