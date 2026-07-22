import postgres from "postgres";

// যেকোনো Postgres — VPS-এ Coolify-র Postgres, বা Neon/ভার্সেল, সব একই driver।
// DATABASE_URL সবচেয়ে ভালো, তবে অন্য নামও (POSTGRES_URL ইত্যাদি) ধরে নেয়।
function getConnectionString() {
  return (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL_UNPOOLED ||
    process.env.POSTGRES_URL_NON_POOLING ||
    ""
  );
}

// SSL: Neon/managed হলে দরকার; VPS-এর ভেতরের Postgres-এ সাধারণত লাগে না।
function needsSsl(conn) {
  if (process.env.PGSSL === "true") return true;
  if (process.env.PGSSL === "false") return false;
  return /sslmode=require/.test(conn) || /neon\.tech|\.aws\.|supabase|render\.com/.test(conn);
}

let _sql = null;
export function sql(...args) {
  if (!_sql) {
    const conn = getConnectionString();
    if (!conn) {
      throw new Error("ডেটাবেজ connection string সেট করা নেই");
    }
    _sql = postgres(conn, {
      ssl: needsSsl(conn) ? "require" : false,
      max: 5,
      idle_timeout: 20,
      connect_timeout: 15,
    });
  }
  return _sql(...args);
}

export function hasDb() {
  return Boolean(getConnectionString());
}

// টেবিল না থাকলে তৈরি করে (একবার চললেই হয়)
let _ready = null;
export async function ensureSchema() {
  if (_ready) return _ready;
  // ব্যর্থ হলে cache খালি করি — নাহলে সাময়িক DB error পুরো instance আটকে রাখে
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
  `.catch((e) => {
    _ready = null;
    throw e;
  });
  return _ready;
}

export async function createOrder(o) {
  await ensureSchema();
  // postgres.js undefined param-এ error দেয় (Neon null নিত) — তাই সব null-safe
  const rows = await sql`
    INSERT INTO orders
      (name, phone, address, product, slug, size, color, qty, area, delivery_charge, total)
    VALUES
      (${o.name ?? ""}, ${o.phone ?? ""}, ${o.address ?? ""}, ${o.product ?? null},
       ${o.slug ?? null}, ${o.size ?? null}, ${o.color ?? null}, ${o.qty ?? 1},
       ${o.area ?? null}, ${o.deliveryCharge ?? 0}, ${o.total ?? 0})
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
        consignment_id = ${consignmentId ?? null},
        tracking_code = ${trackingCode ?? null}
    WHERE id = ${id}
  `;
}

// অ্যাডমিন অ্যানালিটিক্স — order থেকে business metric (নতুন tracking লাগে না)
export async function getOrderStats() {
  await ensureSchema();
  const t = (
    await sql`
    SELECT
      count(*) FILTER (WHERE created_at >= date_trunc('day', now()))                 AS orders_today,
      count(*) FILTER (WHERE created_at >= now() - interval '30 days')               AS orders_30d,
      count(*)                                                                        AS orders_total,
      count(*) FILTER (WHERE status = 'pending')                                      AS pending,
      count(*) FILTER (WHERE status = 'confirmed')                                    AS confirmed,
      count(*) FILTER (WHERE status = 'sent_to_courier')                             AS sent,
      count(*) FILTER (WHERE status = 'delivered')                                    AS delivered,
      count(*) FILTER (WHERE status = 'cancelled')                                    AS cancelled,
      COALESCE(sum(total) FILTER (WHERE created_at >= date_trunc('day', now())),0)    AS rev_today,
      COALESCE(sum(total) FILTER (WHERE created_at >= now() - interval '30 days'),0)  AS rev_30d,
      COALESCE(sum(total),0)                                                          AS rev_total
    FROM orders
  `
  )[0] || {};

  const daily = await sql`
    SELECT to_char(date_trunc('day', created_at), 'MM-DD') AS day,
           count(*)::int AS orders,
           COALESCE(sum(total),0)::int AS rev
    FROM orders
    WHERE created_at >= now() - interval '14 days'
    GROUP BY 1 ORDER BY 1
  `;

  const top = await sql`
    SELECT product, count(*)::int AS n, COALESCE(sum(total),0)::int AS rev
    FROM orders
    WHERE created_at >= now() - interval '30 days'
    GROUP BY product ORDER BY n DESC LIMIT 6
  `;

  const n = (v) => Number(v) || 0;
  const orders30 = n(t.orders_30d);
  const rev30 = n(t.rev_30d);
  return {
    ordersToday: n(t.orders_today), orders30, ordersTotal: n(t.orders_total),
    revToday: n(t.rev_today), rev30, revTotal: n(t.rev_total),
    aov: orders30 ? Math.round(rev30 / orders30) : 0,
    status: {
      pending: n(t.pending), confirmed: n(t.confirmed),
      sent: n(t.sent), delivered: n(t.delivered), cancelled: n(t.cancelled),
    },
    daily: daily.map((r) => ({ day: r.day, orders: r.orders, rev: r.rev })),
    top: top.map((r) => ({ product: r.product, n: r.n, rev: r.rev })),
  };
}

export async function getOrdersByIds(ids) {
  if (!ids.length) return [];
  await ensureSchema();
  // এক query তে সব — আগে প্রতি id তে আলাদা query হতো
  const nums = ids.map(Number).filter((n) => !Number.isNaN(n));
  if (!nums.length) return [];
  const rows = await sql`SELECT * FROM orders WHERE id = ANY(${nums}::bigint[])`;
  // ইনপুটের ক্রম বজায় রাখি (লেবেল প্রিন্টের ক্রম)
  const map = new Map(rows.map((r) => [r.id, r]));
  return ids.map((id) => map.get(id)).filter(Boolean);
}
