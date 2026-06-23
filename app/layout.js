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
  title: `${site.brandName} — ${site.tagline}`,
  description: site.description,
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
