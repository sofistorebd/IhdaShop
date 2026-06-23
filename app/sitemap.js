import { listProducts } from "@/lib/products-db";
import { site } from "@/config";

export const dynamic = "force-dynamic";

export default async function sitemap() {
  const now = new Date();
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
