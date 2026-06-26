import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function manifest() {
  const s = await getSettings();
  return {
    name: s.brandName,
    short_name: s.brandName,
    description: s.description,
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: s.colorPrimary || "#e23a7a",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
