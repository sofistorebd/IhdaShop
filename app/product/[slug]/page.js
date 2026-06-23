import { notFound } from "next/navigation";
import { products } from "@/data/products";
import { site } from "@/config";
import Navbar from "@/components/Navbar";
import ProductDetail from "@/components/ProductDetail";
import OrderBanner from "@/components/OrderBanner";
import Feedback from "@/components/Feedback";
import OrderForm from "@/components/OrderForm";
import Footer from "@/components/Footer";
import WhatsAppFloat from "@/components/WhatsAppFloat";

export function generateStaticParams() {
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const product = products.find((p) => p.slug === slug);
  if (!product) return {};
  return {
    title: `${product.name} — ${site.brandName}`,
    description: product.short,
  };
}

export default async function ProductPage({ params }) {
  const { slug } = await params;
  const product = products.find((p) => p.slug === slug);
  if (!product) notFound();

  return (
    <>
      <Navbar />
      <main className="flex-1">
        <ProductDetail product={product} />
        <OrderBanner />
        <Feedback />
        <OrderForm product={product} />
      </main>
      <Footer />
      <WhatsAppFloat />
    </>
  );
}
