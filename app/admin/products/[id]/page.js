import { notFound } from "next/navigation";
import { getProductById } from "@/lib/products-db";
import AdminNav from "@/components/admin/AdminNav";
import ProductForm from "@/components/admin/ProductForm";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

export default async function EditProductPage({ params }) {
  const { id } = await params;
  const product = await getProductById(Number(id));
  if (!product) notFound();

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav active="products" />
      <main className="mx-auto max-w-3xl px-4 py-6">
        <h1 className="mb-5 text-xl font-bold text-ink">প্রোডাক্ট এডিট — {product.name}</h1>
        <ProductForm initial={product} id={product.id} />
      </main>
    </div>
  );
}
