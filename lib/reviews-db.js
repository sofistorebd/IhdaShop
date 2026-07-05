import { sql, hasDb } from "./db";
import { feedbackImages } from "@/data/feedback";

let _ready = null;
async function ensureReviewsSchema() {
  if (_ready) return _ready;
  _ready = (async () => {
    await sql`
      CREATE TABLE IF NOT EXISTS reviews (
        id         SERIAL PRIMARY KEY,
        image_url  TEXT NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `;
    // প্রথমবার খালি থাকলে ডেমো মকআপগুলো বসাও
    const rows = await sql`SELECT COUNT(*)::int AS n FROM reviews`;
    if (rows[0].n === 0) {
      let i = 0;
      for (const url of feedbackImages) {
        await sql`INSERT INTO reviews (image_url, sort_order) VALUES (${url}, ${i++})`;
      }
    }
  })().catch((e) => {
    _ready = null; // সাময়িক error হলে পরের request আবার চেষ্টা করবে
    throw e;
  });
  return _ready;
}

export async function listReviews() {
  if (!hasDb()) return feedbackImages.map((url, i) => ({ id: i + 1, image_url: url }));
  await ensureReviewsSchema();
  return sql`SELECT * FROM reviews ORDER BY sort_order, id`;
}

export async function createReview(imageUrl) {
  await ensureReviewsSchema();
  const rows = await sql`
    INSERT INTO reviews (image_url, sort_order)
    VALUES (${imageUrl}, (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM reviews))
    RETURNING *
  `;
  return rows[0];
}

export async function deleteReview(id) {
  await ensureReviewsSchema();
  await sql`DELETE FROM reviews WHERE id = ${id}`;
}
