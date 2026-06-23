import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import ProductGrid from "@/components/ProductGrid";
import Reviews from "@/components/Reviews";
import OrderForm from "@/components/OrderForm";
import Footer from "@/components/Footer";
import WhatsAppFloat from "@/components/WhatsAppFloat";

export default function Home() {
  return (
    <>
      <Navbar />
      <main className="flex-1">
        <Hero />
        <Features />
        <ProductGrid />
        <Reviews />
        <OrderForm />
      </main>
      <Footer />
      <WhatsAppFloat />
    </>
  );
}
