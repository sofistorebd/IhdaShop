import { listProducts } from "@/lib/products-db";
import { getSettings } from "@/lib/settings";

export const revalidate = 3600;

export default async function sitemap() {
  const now = new Date();
  const site = await getSettings();
  const base = site.url.replace(/\/$/, "");

  let products = [];
  try {
    products = await listProducts({ activeOnly: true });
  } catch {
    products = [];
  }

  const productUrls = products.map((p) => ({
    url: `${base}/product/${p.slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [
    {
      url: base,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    ...productUrls,
  ];
}
