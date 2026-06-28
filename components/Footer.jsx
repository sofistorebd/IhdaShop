import { getSettings } from "@/lib/settings";

export default async function Footer() {
  const site = await getSettings();
  return (
    <footer className="bg-ink text-white">
      <div className="mx-auto max-w-6xl px-4 py-10 text-center">
        <div className="flex items-center justify-center gap-2">
          {site.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={site.logoUrl}
              alt={site.brandName}
              style={{ height: `${site.logoHeight}px` }}
              className="w-auto max-w-[200px] object-contain"
            />
          ) : (
            <>
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-lg">
                🧕
              </span>
              <span className="text-lg font-bold">{site.brandName}</span>
            </>
          )}
        </div>
        <p className="mx-auto mt-3 max-w-md text-sm text-white/70">
          {site.footerText}
        </p>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-4 text-sm">
          <a href={`tel:${site.phone}`} className="hover:text-brand">
            📞 {site.phone}
          </a>
          <a
            href={`https://wa.me/${site.whatsapp}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-brand"
          >
            💬 WhatsApp
          </a>
          {site.facebook && (
            <a href={site.facebook} className="hover:text-brand">
              Facebook
            </a>
          )}
          {site.instagram && (
            <a href={site.instagram} className="hover:text-brand">
              Instagram
            </a>
          )}
        </div>

        <p className="mt-6 text-xs text-white/50">
          © {new Date().getFullYear()} {site.brandName}. সর্বস্বত্ব সংরক্ষিত।
        </p>
      </div>
    </footer>
  );
}
