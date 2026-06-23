import { site } from "@/config";

export default function WhatsAppFloat() {
  const msg = encodeURIComponent(
    `আসসালামু আলাইকুম, ${site.brandName} থেকে অর্ডার করতে চাই।`
  );
  return (
    <a
      href={`https://wa.me/${site.whatsapp}?text=${msg}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="WhatsApp"
      className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-green-500 text-2xl text-white shadow-lg transition hover:scale-105 hover:bg-green-600"
    >
      💬
    </a>
  );
}
