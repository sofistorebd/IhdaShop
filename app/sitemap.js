import { products } from "@/data/products";
import { site } from "@/config";

export default function sitemap() {
  const now = new Date();
  const base = site.url.replace(/\/$/, "");

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
