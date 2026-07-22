import crypto from "crypto";
import { sql, hasDb } from "./db";

// হালকা, প্রাইভেসি-বান্ধব ভিজিট ট্র্যাকিং — কোনো PII সেভ হয় না।
// visitor = hash(ip + ua + secret) → irreversible, শুধু unique গণনার জন্য।

let _ready = null;
async function ensureVisitsSchema() {
  if (_ready) return _ready;
  _ready = (async () => {
    await sql`
      CREATE TABLE IF NOT EXISTS visits (
        id         BIGSERIAL PRIMARY KEY,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        path       TEXT,
        ref        TEXT,
        visitor    TEXT,
        device     TEXT
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS visits_created_idx ON visits (created_at)`;
  })().catch((e) => {
    _ready = null;
    throw e;
  });
  return _ready;
}

export function visitorHash(ip, ua) {
  const salt = process.env.ENCRYPTION_KEY || "store-analytics";
  return crypto
    .createHash("sha256")
    .update(`${ip || ""}|${ua || ""}|${salt}`)
    .digest("hex")
    .slice(0, 24);
}

// referrer URL → শুধু host (source): facebook / google / direct
function refHost(ref) {
  if (!ref) return "direct";
  try {
    const h = new URL(ref).hostname.replace(/^www\./, "");
    return h || "direct";
  } catch {
    return "direct";
  }
}

function deviceOf(ua) {
  return /Mobile|Android|iPhone|iPad/i.test(ua || "") ? "mobile" : "desktop";
}

export async function logVisit({ path, ref, ip, ua }) {
  if (!hasDb()) return;
  await ensureVisitsSchema();
  await sql`
    INSERT INTO visits (path, ref, visitor, device)
    VALUES (${path ?? "/"}, ${refHost(ref)}, ${visitorHash(ip, ua)}, ${deviceOf(ua)})
  `;
}

// রেঞ্জের দৈর্ঘ্য অনুযায়ী চার্টের bucket বাছাই (day/week/month) — বেশি দিন হলে বার কম রাখে
export function pickBucket(from, to) {
  const days = Math.max(1, Math.round((new Date(to) - new Date(from)) / 86400000));
  if (days <= 45) return { unit: "day", fmt: "MM-DD" };
  if (days <= 210) return { unit: "week", fmt: "MM-DD" };
  return { unit: "month", fmt: "YYYY-MM" };
}

// অ্যাডমিন ড্যাশবোর্ডের জন্য সব ভিজিটর মেট্রিক (from–to রেঞ্জ, ডিফল্ট ৩০ দিন)
export async function getVisitorStats({ from, to } = {}) {
  if (!hasDb()) return null;
  await ensureVisitsSchema();
  const f = from || new Date(Date.now() - 30 * 86400000);
  const t2 = to || new Date();
  const { unit, fmt } = pickBucket(f, t2);

  const totals = await sql`
    SELECT
      count(*) FILTER (WHERE created_at >= date_trunc('day', now()))                          AS pv_today,
      count(DISTINCT visitor) FILTER (WHERE created_at >= date_trunc('day', now()))            AS uv_today,
      count(DISTINCT visitor) FILTER (WHERE created_at >= now() - interval '5 minutes')        AS live,
      count(*) FILTER (WHERE created_at >= ${f} AND created_at <= ${t2})                        AS pv_range,
      count(DISTINCT visitor) FILTER (WHERE created_at >= ${f} AND created_at <= ${t2})         AS uv_range
    FROM visits
  `;

  const daily = await sql`
    SELECT to_char(date_trunc(${unit}, created_at), ${fmt}) AS day,
           count(*)::int AS pv,
           count(DISTINCT visitor)::int AS uv
    FROM visits
    WHERE created_at >= ${f} AND created_at <= ${t2}
    GROUP BY 1 ORDER BY 1
  `;

  const sources = await sql`
    SELECT ref AS source, count(*)::int AS n
    FROM visits WHERE created_at >= ${f} AND created_at <= ${t2}
    GROUP BY ref ORDER BY n DESC LIMIT 6
  `;

  const topPages = await sql`
    SELECT path, count(*)::int AS n
    FROM visits WHERE created_at >= ${f} AND created_at <= ${t2}
    GROUP BY path ORDER BY n DESC LIMIT 8
  `;

  const devices = await sql`
    SELECT device, count(*)::int AS n
    FROM visits WHERE created_at >= ${f} AND created_at <= ${t2}
    GROUP BY device
  `;

  const t = totals[0] || {};
  const num = (v) => Number(v) || 0;
  return {
    live: num(t.live),
    pvToday: num(t.pv_today), uvToday: num(t.uv_today),
    pvRange: num(t.pv_range), uvRange: num(t.uv_range),
    daily: daily.map((r) => ({ day: r.day, pv: r.pv, uv: r.uv })),
    sources: sources.map((r) => ({ source: r.source, n: r.n })),
    topPages: topPages.map((r) => ({ path: r.path, n: r.n })),
    devices: devices.map((r) => ({ device: r.device, n: r.n })),
  };
}
