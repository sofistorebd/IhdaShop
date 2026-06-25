import { getSettings } from "@/lib/settings";

export default async function robots() {
  const site = await getSettings();
  const base = site.url.replace(/\/$/, "");
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api/"],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
