import { site } from "@/config";

export default function Footer() {
  return (
    <footer className="bg-brand-dark text-green-50">
      <div className="mx-auto max-w-6xl px-4 py-10 text-center">
        <div className="flex items-center justify-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-lg">
            🧕
          </span>
          <span className="text-lg font-bold">{site.brandName}</span>
        </div>
        <p className="mx-auto mt-3 max-w-md text-sm text-green-100/80">
          {site.tagline}
        </p>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-4 text-sm">
          <a href={`tel:${site.phone}`} className="hover:underline">
            📞 {site.phone}
          </a>
          <a
            href={`https://wa.me/${site.whatsapp}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
          >
            💬 WhatsApp
          </a>
          <a href={site.facebook} className="hover:underline">
            Facebook
          </a>
        </div>

        <p className="mt-6 text-xs text-green-100/60">
          © {new Date().getFullYear()} {site.brandName}. সর্বস্বত্ব সংরক্ষিত।
        </p>
      </div>
    </footer>
  );
}
