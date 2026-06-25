import { notFound } from "next/navigation";
import { getProductBySlug } from "@/lib/products-db";
import { getSettings } from "@/lib/settings";
import Navbar from "@/components/Navbar";
import ProductDetail from "@/components/ProductDetail";
import OrderBanner from "@/components/OrderBanner";
import Feedback from "@/components/Feedback";
import OrderForm from "@/components/OrderForm";
import Footer from "@/components/Footer";
import WhatsAppFloat from "@/components/WhatsAppFloat";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const [product, site] = await Promise.all([
    getProductBySlug(slug),
    getSettings(),
  ]);
  if (!product) return {};
  const url = `${site.url.replace(/\/$/, "")}/product/${product.slug}`;
  const desc = `${product.short} — মাত্র ৳${product.price}। ${site.brandName} থেকে অর্ডার করুন।`;
  return {
    title: product.name,
    description: desc,
    alternates: { canonical: `/product/${product.slug}` },
    openGraph: {
      type: "website",
      locale: "bn_BD",
      siteName: site.brandName,
      title: `${product.name} — ${site.brandName}`,
      description: desc,
      url,
    },
    twitter: {
      card: "summary_large_image",
      title: `${product.name} — ${site.brandName}`,
      description: desc,
    },
  };
}

export default async function ProductPage({ params }) {
  const { slug } = await params;
  const [product, site] = await Promise.all([
    getProductBySlug(slug),
    getSettings(),
  ]);
  if (!product) notFound();

  const base = site.url.replace(/\/$/, "");
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.short,
    sku: product.slug,
    brand: { "@type": "Brand", name: site.brandName },
    ...(product.image ? { image: `${base}${product.image}` } : {}),
    offers: {
      "@type": "Offer",
      url: `${base}/product/${product.slug}`,
      priceCurrency: "BDT",
      price: product.price,
      availability: "https://schema.org/InStock",
      seller: { "@type": "Organization", name: site.brandName },
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Navbar />
      <main className="flex-1">
        <ProductDetail product={product} />
        <OrderBanner />
        <Feedback />
        <OrderForm product={product} settings={site} />
      </main>
      <Footer />
      <WhatsAppFloat />
    </>
  );
}
