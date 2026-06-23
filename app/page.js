import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import ProductGrid from "@/components/ProductGrid";
import OrderBanner from "@/components/OrderBanner";
import Feedback from "@/components/Feedback";
import Footer from "@/components/Footer";
import WhatsAppFloat from "@/components/WhatsAppFloat";
import { site } from "@/config";
import { listProducts } from "@/lib/products-db";

export const dynamic = "force-dynamic";

export default async function Home() {
  const products = await listProducts({ activeOnly: true });
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Store",
    name: site.brandName,
    description: site.description,
    url: site.url,
    telephone: site.phone,
    areaServed: "BD",
  };
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Navbar />
      <main className="flex-1">
        <Hero />
        <Features />
        <ProductGrid products={products} />
        <OrderBanner />
        <Feedback />
      </main>
      <Footer />
      <WhatsAppFloat />
    </>
  );
}
