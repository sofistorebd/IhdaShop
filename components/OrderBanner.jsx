import { site } from "@/config";

export default function OrderBanner() {
  const msg = encodeURIComponent(
    `আসসালামু আলাইকুম, ${site.brandName} থেকে অর্ডার করতে চাই।`
  );
  return (
    <section className="bg-gradient-to-r from-brand to-brand-dark">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 py-10 text-center">
        <h2 className="text-2xl font-bold text-white md:text-3xl">
          অর্ডার করতে কোনো ঝামেলা নেই!
        </h2>
        <p className="max-w-xl text-sm text-white/90">
          সরাসরি WhatsApp এ মেসেজ দিন — আমরা আপনার অর্ডার কনফার্ম করে দিচ্ছি।
        </p>
        <a
          href={`https://wa.me/${site.whatsapp}?text=${msg}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-3 text-base font-bold text-green-600 shadow-md transition hover:scale-105"
        >
          <span>📱</span> WhatsApp এ অর্ডার করুন
        </a>
      </div>
    </section>
  );
}
