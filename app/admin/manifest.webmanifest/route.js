// অ্যাডমিন প্যানেলের জন্য আলাদা PWA manifest — start_url "/admin" রাখা হয়েছে,
// নাহলে root manifest (start_url "/") ব্যবহার হতো এবং অ্যাডমিন থেকে ইনস্টল করলেও
// অ্যাপ আইকনে ট্যাপ করলে কাস্টমার হোমপেজ খুলত, অ্যাডমিন প্যানেল না।
import { getSettings } from "@/lib/settings";

export async function GET() {
  const s = await getSettings();
  const manifest = {
    id: "/admin/",
    name: `${s.brandName} — অ্যাডমিন`,
    short_name: "অ্যাডমিন",
    description: "অর্ডার, প্রোডাক্ট ও সেটিংস পরিচালনা",
    start_url: "/admin",
    scope: "/admin",
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
  return Response.json(manifest, {
    headers: { "Content-Type": "application/manifest+json" },
  });
}
