import { neon } from "@neondatabase/serverless";

// DATABASE_URL = Neon connection string (.env.local এ দাও)
let _sql = null;
export function sql(...args) {
  if (!_sql) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL সেট করা নেই");
    }
    _sql = neon(process.env.DATABASE_URL);
  }
  return _sql(...args);
}

export function hasDb() {
  return Boolean(process.env.DATABASE_URL);
}

// টেবিল না থাকলে তৈরি করে (একবার চললেই হয়)
let _ready = null;
export async function ensureSchema() {
  if (_ready) return _ready;
  _ready = sql`
    CREATE TABLE IF NOT EXISTS orders (
      id            SERIAL PRIMARY KEY,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
      name          TEXT NOT NULL,
      phone         TEXT NOT NULL,
      address       TEXT NOT NULL,
      product       TEXT,
      slug          TEXT,
      size          TEXT,
      color         TEXT,
      qty           INTEGER DEFAULT 1,
      area          TEXT,
      delivery_charge INTEGER DEFAULT 0,
      total         INTEGER DEFAULT 0,
      status        TEXT NOT NULL DEFAULT 'pending',
      consignment_id TEXT,
      tracking_code  TEXT
    )
  `;
  return _ready;
}

export async function createOrder(o) {
  await ensureSchema();
  const rows = await sql`
    INSERT INTO orders
      (name, phone, address, product, slug, size, color, qty, area, delivery_charge, total)
    VALUES
      (${o.name}, ${o.phone}, ${o.address}, ${o.product}, ${o.slug}, ${o.size},
       ${o.color}, ${o.qty}, ${o.area}, ${o.deliveryCharge}, ${o.total})
    RETURNING *
  `;
  return rows[0];
}

export async function listOrders() {
  await ensureSchema();
  return sql`SELECT * FROM orders ORDER BY created_at DESC LIMIT 200`;
}

export async function getOrder(id) {
  await ensureSchema();
  const rows = await sql`SELECT * FROM orders WHERE id = ${id}`;
  return rows[0];
}

export async function updateOrderStatus(id, status) {
  await ensureSchema();
  await sql`UPDATE orders SET status = ${status} WHERE id = ${id}`;
}

export async function setCourierInfo(id, consignmentId, trackingCode) {
  await ensureSchema();
  await sql`
    UPDATE orders
    SET status = 'sent_to_courier',
        consignment_id = ${consignmentId},
        tracking_code = ${trackingCode}
    WHERE id = ${id}
  `;
}
