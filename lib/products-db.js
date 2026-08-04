import { sql, hasDb } from "./db";
import { products as seedData } from "@/data/products";

// ---- schema ----
let _ready = null;
export async function ensureProductsSchema() {
  if (_ready) return _ready;
  _ready = (async () => {
    await sql`
      CREATE TABLE IF NOT EXISTS products (
        id          SERIAL PRIMARY KEY,
        slug        TEXT UNIQUE NOT NULL,
        name        TEXT NOT NULL,
        price       INTEGER NOT NULL,
        old_price   INTEGER,
        badge       TEXT,
        short       TEXT,
        image       TEXT,
        images      JSONB NOT NULL DEFAULT '[]',
        sizes       JSONB NOT NULL DEFAULT '[]',
        variants    JSONB NOT NULL DEFAULT '[]',
        features    JSONB NOT NULL DEFAULT '[]',
        sort_order  INTEGER NOT NULL DEFAULT 0,
        active      BOOLEAN NOT NULL DEFAULT true,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `;
    // প্রথমবার খালি থাকলে পুরোনো ৫টা প্রোডাক্ট বসিয়ে দাও
    const rows = await sql`SELECT COUNT(*)::int AS n FROM products`;
    if (rows[0].n === 0) {
      let i = 0;
      for (const p of seedData) {
        await insertProduct({ ...p, sortOrder: i++ });
      }
    }
  })().catch((e) => {
    _ready = null; // সাময়িক error হলে পরের request আবার চেষ্টা করবে
    throw e;
  });
  return _ready;
}

// ---- slug ----
// নাম → URL-বান্ধব slug (latin + বাংলা অক্ষর রাখে, বাকি সব `-`)
function slugify(s) {
  return String(s || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9ঀ-৿]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ইউনিক slug নিশ্চিত করে — খালি হলে নাম থেকে, তাও খালি হলে "product",
// আর আগে থেকে থাকলে -2, -3 ... যোগ করে। excludeId = নিজের row বাদ (edit-এ)।
async function uniqueSlug(desired, name, excludeId = null) {
  const base = slugify(desired) || slugify(name) || "product";
  const rows = excludeId
    ? await sql`SELECT slug FROM products WHERE (slug = ${base} OR slug LIKE ${base + "-%"}) AND id <> ${excludeId}`
    : await sql`SELECT slug FROM products WHERE slug = ${base} OR slug LIKE ${base + "-%"}`;
  const taken = new Set(rows.map((r) => r.slug));
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

// ---- mappers ----
// JSONB কলাম driver-ভেদে array বা string আসতে পারে (Neon → array, postgres.js → string)।
// দুই ক্ষেত্রেই নিরাপদে array বানায়।
function jarr(v) {
  if (Array.isArray(v)) return v;
  if (typeof v === "string" && v.trim()) {
    try {
      const p = JSON.parse(v);
      return Array.isArray(p) ? p : [];
    } catch {
      return [];
    }
  }
  return [];
}

function rowToProduct(r) {
  const images = jarr(r.images);
  const variants = jarr(r.variants);
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    price: r.price,
    oldPrice: r.old_price ?? null,
    badge: r.badge ?? "",
    short: r.short ?? "",
    image: r.image ?? images[0] ?? null,
    images,
    sizes: jarr(r.sizes),
    variants: variants.length ? variants : [{ name: "ফুল সেট", price: r.price }],
    features: jarr(r.features),
    active: r.active,
    sortOrder: r.sort_order,
  };
}

function clean(data) {
  const arr = (v) => (Array.isArray(v) ? v : []);
  return {
    slug: String(data.slug || "").trim(),
    name: String(data.name || "").trim(),
    price: Number(data.price) || 0,
    oldPrice: data.oldPrice ? Number(data.oldPrice) : null,
    badge: data.badge || "",
    short: data.short || "",
    image: data.image || arr(data.images)[0] || null,
    images: arr(data.images),
    sizes: arr(data.sizes),
    variants: arr(data.variants),
    features: arr(data.features),
    sortOrder: Number(data.sortOrder) || 0,
    active: data.active === false ? false : true,
  };
}

// ---- queries ----
async function insertProduct(data) {
  const d = clean(data);
  const rows = await sql`
    INSERT INTO products
      (slug, name, price, old_price, badge, short, image, images, sizes, variants, features, sort_order, active)
    VALUES
      (${d.slug}, ${d.name}, ${d.price}, ${d.oldPrice}, ${d.badge}, ${d.short}, ${d.image},
       ${JSON.stringify(d.images)}::jsonb, ${JSON.stringify(d.sizes)}::jsonb,
       ${JSON.stringify(d.variants)}::jsonb, ${JSON.stringify(d.features)}::jsonb,
       ${d.sortOrder}, ${d.active})
    RETURNING *
  `;
  return rowToProduct(rows[0]);
}

export async function listProducts({ activeOnly = false } = {}) {
  // DB না থাকলে স্ট্যাটিক ফাইল থেকে দেখাও (fallback)
  if (!hasDb()) return seedData;
  await ensureProductsSchema();
  const rows = activeOnly
    ? await sql`SELECT * FROM products WHERE active = true ORDER BY sort_order, id`
    : await sql`SELECT * FROM products ORDER BY sort_order, id`;
  return rows.map(rowToProduct);
}

export async function getProductBySlug(slug) {
  if (!hasDb()) return seedData.find((p) => p.slug === slug) || null;
  await ensureProductsSchema();
  const rows = await sql`SELECT * FROM products WHERE slug = ${slug} AND active = true`;
  return rows[0] ? rowToProduct(rows[0]) : null;
}

export async function getProductById(id) {
  await ensureProductsSchema();
  const rows = await sql`SELECT * FROM products WHERE id = ${id}`;
  return rows[0] ? rowToProduct(rows[0]) : null;
}

export async function createProduct(data) {
  await ensureProductsSchema();
  const slug = await uniqueSlug(data.slug, data.name);
  return insertProduct({ ...data, slug });
}

export async function updateProduct(id, data) {
  await ensureProductsSchema();
  const slug = await uniqueSlug(data.slug, data.name, id);
  const d = clean({ ...data, slug });
  const rows = await sql`
    UPDATE products SET
      slug = ${d.slug}, name = ${d.name}, price = ${d.price}, old_price = ${d.oldPrice},
      badge = ${d.badge}, short = ${d.short}, image = ${d.image},
      images = ${JSON.stringify(d.images)}::jsonb, sizes = ${JSON.stringify(d.sizes)}::jsonb,
      variants = ${JSON.stringify(d.variants)}::jsonb, features = ${JSON.stringify(d.features)}::jsonb,
      sort_order = ${d.sortOrder}, active = ${d.active}
    WHERE id = ${id}
    RETURNING *
  `;
  return rows[0] ? rowToProduct(rows[0]) : null;
}

export async function deleteProduct(id) {
  await ensureProductsSchema();
  await sql`DELETE FROM products WHERE id = ${id}`;
}
