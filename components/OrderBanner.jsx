import { site } from "@/config";

export default function OrderBanner() {
  const msg = encodeURIComponent(
    `আসসালামু আলাইকুম, ${site.brandName} থেকে অর্ডার করতে চাই।`
  );
  return (
    <section className="relative overflow-hidden bg-gradient-to-r from-brand to-brand-dark">
      {/* decorative বৃত্ত */}
      <div className="pointer-events-none absolute -left-10 -top-16 h-48 w-48 rounded-full border-[20px] border-white/10" />
      <div className="pointer-events-none absolute -bottom-20 right-10 h-56 w-56 rounded-full border-[24px] border-white/10" />
      <div className="pointer-events-none absolute right-1/4 top-6 h-16 w-16 rounded-full bg-white/10" />

      <div className="relative mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 py-10 text-center">
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
