import Script from "next/script";
import { Hind_Siliguri } from "next/font/google";
import "./globals.css";
import { getSettings } from "@/lib/settings";
import ServiceWorker from "@/components/ServiceWorker";
import TrackView from "@/components/TrackView";

export async function generateViewport() {
  const site = await getSettings();
  return { themeColor: site.colorPrimary || "#e23a7a" };
}

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
    manifest: "/manifest.webmanifest",
    icons: {
      icon: site.faviconUrl || "/icon-192.png",
      apple: site.faviconUrl || "/icon-192.png",
    },
    appleWebApp: { capable: true, statusBarStyle: "default", title: site.brandName },
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
        {site.facebookPixelId && (
          <>
            <Script id="fb-pixel" strategy="afterInteractive">
              {`!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window,document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init','${site.facebookPixelId}');fbq('track','PageView');`}
            </Script>
            <noscript>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                height="1"
                width="1"
                style={{ display: "none" }}
                alt=""
                src={`https://www.facebook.com/tr?id=${site.facebookPixelId}&ev=PageView&noscript=1`}
              />
            </noscript>
          </>
        )}
        {children}
        <ServiceWorker />
        <TrackView />
      </body>
    </html>
  );
}
