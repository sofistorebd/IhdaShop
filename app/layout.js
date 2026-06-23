import { Hind_Siliguri } from "next/font/google";
import "./globals.css";
import { site } from "@/config";

const bangla = Hind_Siliguri({
  variable: "--font-bangla",
  subsets: ["bengali", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata = {
  metadataBase: new URL(site.url),
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

export default function RootLayout({ children }) {
  return (
    <html lang="bn" className={`${bangla.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-white text-gray-800">
        {children}
      </body>
    </html>
  );
}
