import { sql, ensureSchema, withTransaction } from "./db";
import { encrypt } from "./crypto";
import { CheckoutError } from "./checkout-security";

let ready;
export async function ensureCheckoutSchema() {
  if (ready) return ready;
  ready = (async () => {
    await ensureSchema();
    // Additive side tables: no alteration, reset or backfill of existing orders.
    await sql`
      CREATE TABLE IF NOT EXISTS checkout_submissions (
        request_key TEXT PRIMARY KEY,
        payload_hash TEXT NOT NULL,
        order_id INTEGER UNIQUE REFERENCES orders(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        phone_hash TEXT, session_hash TEXT, ip_hash TEXT,
        risk_flags JSONB NOT NULL DEFAULT '[]',
        attribution TEXT,
        purchase_state TEXT NOT NULL DEFAULT 'waiting',
        purchase_payload TEXT,
        verified_at TIMESTAMPTZ,
        purchase_attempts INTEGER NOT NULL DEFAULT 0,
        next_attempt_at TIMESTAMPTZ,
        lease_until TIMESTAMPTZ,
        sent_at TIMESTAMPTZ
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS checkout_phone_idx ON checkout_submissions(phone_hash, created_at)`;
    await sql`CREATE INDEX IF NOT EXISTS checkout_session_idx ON checkout_submissions(session_hash, created_at)`;
    await sql`CREATE INDEX IF NOT EXISTS checkout_ip_idx ON checkout_submissions(ip_hash, created_at)`;
    await sql`
      CREATE TABLE IF NOT EXISTS checkout_limits (
        key TEXT PRIMARY KEY, started_at TIMESTAMPTZ NOT NULL DEFAULT now(), hits INTEGER NOT NULL
      )
    `;
    await sql`CREATE TABLE IF NOT EXISTS checkout_sms_codes (
      phone_hash TEXT NOT NULL, session_hash TEXT NOT NULL, id TEXT NOT NULL,
      verifier TEXT NOT NULL, expires_at TIMESTAMPTZ NOT NULL, PRIMARY KEY(phone_hash, session_hash)
    )`;
    await sql`CREATE TABLE IF NOT EXISTS checkout_challenges (token_hash TEXT PRIMARY KEY, created_at TIMESTAMPTZ NOT NULL DEFAULT now())`;
  })().catch((err) => { ready = null; throw err; });
  return ready;
}

function replayResult(row, context) {
  if (!row) return null;
  if (row.payload_hash !== context.payloadHash) {
    throw new CheckoutError(409, "request_changed", "আগের অনুরোধের তথ্য বদলেছে। পৃষ্ঠা রিফ্রেশ করে আবার চেষ্টা করুন।");
  }
  if (!row.order_id) throw new CheckoutError(409, "order_removed", "এই অনুরোধের অর্ডারটি আর নেই। দোকানে যোগাযোগ করুন।");
  return { order: { id: row.order_id }, replayed: true };
}

export async function findSubmission(context) {
  await ensureCheckoutSchema();
  // Legacy clients have no random idempotency key. Do not expose an order ID
  // or treat a guessed phone/address as proof of ownership.
  if (context.legacy) return null;
  const rows = await sql`SELECT order_id, payload_hash FROM checkout_submissions WHERE request_key = ${context.key}`;
  return replayResult(rows[0], context);
}

export async function limitCheckout(context) {
  await ensureCheckoutSchema();
  const limits = [[context.phoneHash, 5, "phone"]];
  if (context.sessionHash) limits.push([context.sessionHash, 10, "session"]);
  for (const [hash, maximum, kind] of limits) {
    const key = kind + ":" + hash;
    const [row] = await sql`
      INSERT INTO checkout_limits(key, hits) VALUES (${key}, 1)
      ON CONFLICT (key) DO UPDATE SET
        hits = CASE WHEN checkout_limits.started_at < now() - interval '15 minutes' THEN 1 ELSE checkout_limits.hits + 1 END,
        started_at = CASE WHEN checkout_limits.started_at < now() - interval '15 minutes' THEN now() ELSE checkout_limits.started_at END
      RETURNING hits
    `;
    if (row.hits > maximum) throw new CheckoutError(429, "rate_limited", "অল্প সময়ে অনেকবার চেষ্টা হয়েছে। ১৫ মিনিট পরে চেষ্টা করুন অথবা দোকানে যোগাযোগ করুন।");
  }
}

export async function createProtectedOrder(order, context, tracking, allowRepeat = false) {
  await ensureCheckoutSchema();
  return withTransaction(async (tx) => {
    // Request lock + phone lock serialize both retries and rapid duplicate orders.
    await tx`SELECT pg_advisory_xact_lock(hashtextextended(${"request:" + context.key}, 0))`;
    await tx`SELECT pg_advisory_xact_lock(hashtextextended(${"phone:" + context.phoneHash}, 0))`;
    if (!context.legacy) {
      const rows = await tx`SELECT order_id, payload_hash FROM checkout_submissions WHERE request_key = ${context.key}`;
      const replay = replayResult(rows[0], context);
      if (replay) return replay;
    }
    const recent = await tx`
      SELECT request_key FROM checkout_submissions
      WHERE phone_hash = ${context.phoneHash} AND payload_hash = ${context.payloadHash}
        AND created_at > now() - interval '2 minutes' AND order_id IS NOT NULL LIMIT 1
    `;
    if (recent.length && !allowRepeat) {
      throw new CheckoutError(409, "duplicate_order", "একই তথ্যের একটি অর্ডার সদ্য জমা হয়েছে। সত্যিই আরেকটি অর্ডার করতে চাইলে নিচের বোতাম চাপুন।");
    }
    if (context.otpHash) {
      const used = await tx`INSERT INTO checkout_challenges(token_hash) VALUES (${context.otpHash})
        ON CONFLICT DO NOTHING RETURNING token_hash`;
      if (!used.length) throw new CheckoutError(400, "otp_required", "নতুন অর্ডারের জন্য আবার OTP নিন।");
    }
    if (context.challengeHash) {
      const consumed = await tx`
        INSERT INTO checkout_challenges(token_hash) VALUES (${context.challengeHash})
        ON CONFLICT DO NOTHING RETURNING token_hash
      `;
      if (!consumed.length) throw new CheckoutError(400, "verification_required", "নিরাপত্তা যাচাই আবার সম্পন্ন করুন।");
    }
    const [history] = await tx`
      SELECT
        count(*) FILTER (WHERE phone_hash = ${context.phoneHash}) AS phone_count,
        count(*) FILTER (WHERE session_hash = ${context.sessionHash}) AS session_count,
        count(*) FILTER (WHERE ip_hash = ${context.ipHash} AND created_at > now() - interval '15 minutes') AS ip_count
      FROM checkout_submissions WHERE created_at > now() - interval '24 hours'
        AND (phone_hash = ${context.phoneHash} OR session_hash = ${context.sessionHash} OR ip_hash = ${context.ipHash})
    `;
    const flags = [...context.flags];
    if (Number(history.phone_count) > 0) flags.push("repeat_phone");
    if (Number(history.session_count) >= 3) flags.push("repeat_session");
    if (Number(history.ip_count) >= 10) flags.push("shared_ip_burst");
    if (recent.length) flags.push("repeat_confirmed");
    const [saved] = await tx`
      INSERT INTO orders(name, phone, address, product, slug, size, qty, area, delivery_charge, total, status)
      VALUES (${order.name}, ${order.phone}, ${order.address}, ${order.product}, ${order.slug},
        ${order.size}, ${order.qty}, ${order.area}, ${order.deliveryCharge}, ${order.total}, 'inreview')
      RETURNING *
    `;
    const key = context.legacy ? context.key + "-" + saved.id : context.key;
    await tx`
      INSERT INTO checkout_submissions(request_key, payload_hash, order_id, phone_hash, session_hash, ip_hash, risk_flags, attribution)
      VALUES (${key}, ${context.payloadHash}, ${saved.id}, ${context.phoneHash},
        ${context.sessionHash}, ${context.ipHash}, ${JSON.stringify(flags)}::jsonb, ${encrypt(JSON.stringify(tracking))})
    `;
    return { order: saved, replayed: false };
  });
}

export async function attachCheckoutInfo(orders) {
  if (!orders.length) return orders;
  await ensureCheckoutSchema();
  const ids = orders.map((o) => o.id);
  const rows = await sql`
    SELECT order_id, risk_flags, purchase_state FROM checkout_submissions WHERE order_id = ANY(${ids}::int[])
  `;
  const info = new Map(rows.map((r) => [r.order_id, r]));
  return orders.map((o) => ({ ...o, checkout: info.get(o.id) || null }));
}

export async function changeReviewedOrderStatus(id, status) {
  await ensureCheckoutSchema();
  return withTransaction(async (tx) => {
    const [previous] = await tx`SELECT * FROM orders WHERE id = ${id} FOR UPDATE`;
    if (!previous) return null;
    if (previous.dispatch_started_at || (previous.settled_amount != null && status !== "delivered")) {
      throw new CheckoutError(409, "order_locked", "কুরিয়ার বুকিং বা পেমেন্টের কারণে স্ট্যাটাস বদলানো যাবে না।");
    }
    const [updated] = await tx`UPDATE orders SET status = ${status} WHERE id = ${id} RETURNING *`;
    if (previous.status === "inreview" && status === "pending") {
      // Only new, tracked orders get queued. Legacy orders must not get counted
      // again after already sending Purchase under the old checkout flow.
      await tx`
        UPDATE checkout_submissions SET purchase_state = 'queued', verified_at = now(),
          next_attempt_at = now(), purchase_payload = ${encrypt(JSON.stringify(updated))}
        WHERE order_id = ${id} AND verified_at IS NULL
      `;
    }
    return updated;
  });
}
