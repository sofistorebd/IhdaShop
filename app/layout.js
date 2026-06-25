import { Hind_Siliguri } from "next/font/google";
import "./globals.css";
import { getSettings } from "@/lib/settings";

const bangla = Hind_Siliguri({
  variable: "--font-bangla",
  subsets: ["bengali", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export async function generateMetadata() {
  const site = await getSettings();
  let metadataBase;
  try {
    metadataBase = new URL(site.url);
  } catch {
    metadataBase = undefined;
  }
  return {
    metadataBase,
    title: {
      default: `${site.brandName} — ${site.tagline}`,
      template: `%s | ${site.brandName}`,
    },
    description: site.description,
    keywords: site.keywords,
    applicationName: site.brandName,
    alternates: { canonical: "/" },
    openGraph: {
      type: "website",
      locale: "bn_BD",
      siteName: site.brandName,
      title: `${site.brandName} — ${site.tagline}`,
      description: site.description,
      url: site.url,
    },
    twitter: {
      card: "summary_large_image",
      title: `${site.brandName} — ${site.tagline}`,
      description: site.description,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, "max-image-preview": "large" },
    },
  };
}

// hex কে সাদার দিকে মিশিয়ে হালকা টিন্ট (brand-light) বানায়
function lighten(hex, amt = 0.88) {
  const h = String(hex || "").replace("#", "");
  if (h.length !== 6) return "#fce7f1";
  const ch = (i) => parseInt(h.slice(i, i + 2), 16);
  const mix = (c) => Math.round(c + (255 - c) * amt);
  return `rgb(${mix(ch(0))}, ${mix(ch(2))}, ${mix(ch(4))})`;
}

export default async function RootLayout({ children }) {
  const site = await getSettings();
  // client এর বাছাই করা রঙ → CSS variable (পুরো সাইটে প্রযোজ্য)
  const themeStyle = {
    "--color-brand": site.colorPrimary,
    "--color-accent": site.colorPrimary,
    "--color-brand-dark": site.colorSecondary,
    "--color-ink": site.colorGlobal,
    "--color-brand-light": lighten(site.colorPrimary),
  };
  return (
    <html
      lang="bn"
      style={themeStyle}
      className={`${bangla.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-white text-gray-800">
        {children}
      </body>
    </html>
  );
}
