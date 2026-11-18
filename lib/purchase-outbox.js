import { sql, hasDb } from "./db";
import { ensureCheckoutSchema } from "./checkout-db";
import { decrypt } from "./crypto";
import { digest } from "./checkout-security";
import { sendPurchase } from "./fb-capi";

export async function flushPurchases() {
  if (!hasDb()) return;
  await ensureCheckoutSchema();
  // Bounded retries (<24h) stay inside Meta's event deduplication window.
  await sql`
    UPDATE checkout_submissions SET purchase_state = 'failed', purchase_payload = NULL, attribution = NULL
    WHERE purchase_state = 'queued' AND (verified_at < now() - interval '24 hours' OR purchase_attempts >= 10)
      AND (lease_until IS NULL OR lease_until < now())
  `;
  const rows = await sql`
    UPDATE checkout_submissions SET lease_until = now() + interval '5 minutes', purchase_attempts = purchase_attempts + 1
    WHERE request_key IN (
      SELECT c.request_key FROM checkout_submissions c JOIN orders o ON o.id = c.order_id
      WHERE c.purchase_state = 'queued' AND c.next_attempt_at <= now()
        AND c.purchase_attempts < 10 AND c.verified_at >= now() - interval '24 hours'
        AND (c.lease_until IS NULL OR c.lease_until < now())
        AND o.status NOT IN ('inreview', 'cancelled')
      ORDER BY c.next_attempt_at LIMIT 5 FOR UPDATE OF c SKIP LOCKED
    ) RETURNING *
  `;
  for (const row of rows) {
    let sent = false;
    try {
      const order = JSON.parse(decrypt(row.purchase_payload));
      const tracking = JSON.parse(decrypt(row.attribution) || "{}");
      sent = await sendPurchase({
        order, ...tracking,
        eventId: "verified-" + digest("purchase", row.request_key),
        eventTime: Math.floor(new Date(row.verified_at).getTime() / 1000),
        // This event occurs when the merchant confirms the order by phone.
        actionSource: "phone_call",
      });
    } catch { /* retain stable event ID/time for a bounded retry */ }
    const delay = Math.min(3600, 30 * 2 ** row.purchase_attempts);
    await sql`
      UPDATE checkout_submissions SET
        purchase_state = ${sent ? "sent" : "queued"},
        sent_at = CASE WHEN ${sent} THEN now() ELSE sent_at END,
        purchase_payload = CASE WHEN ${sent} THEN NULL ELSE purchase_payload END,
        attribution = CASE WHEN ${sent} THEN NULL ELSE attribution END,
        lease_until = NULL, next_attempt_at = now() + ${delay} * interval '1 second'
      WHERE request_key = ${row.request_key} AND purchase_attempts = ${row.purchase_attempts}
    `;
  }
  // Retain request tombstones for retry safety, not raw attribution indefinitely.
  await sql`DELETE FROM checkout_limits WHERE started_at < now() - interval '1 day'`;
  await sql`DELETE FROM checkout_sms_codes WHERE expires_at <= now()`;
  await sql`DELETE FROM checkout_challenges WHERE created_at < now() - interval '1 day'`;
  await sql`
    UPDATE checkout_submissions SET phone_hash = NULL, session_hash = NULL, ip_hash = NULL, attribution = NULL
    WHERE created_at < now() - interval '30 days'
      AND (phone_hash IS NOT NULL OR session_hash IS NOT NULL OR ip_hash IS NOT NULL OR attribution IS NOT NULL)
      AND purchase_state <> 'queued'
  `;
}

export function startPurchaseScheduler() {
  if (process.env.NODE_ENV !== "production" || process.env.PURCHASE_SCHEDULER_ENABLED === "false") return;
  const key = Symbol.for("ihdashop.purchase-scheduler");
  if (globalThis[key]) return;
  globalThis[key] = true;
  let running = false;
  const run = async () => {
    if (running) return;
    running = true;
    try { await flushPurchases(); } catch { console.error("Purchase queue check failed"); }
    finally { running = false; }
  };
  const first = setTimeout(run, 45000);
  first.unref?.();
  const timer = setInterval(run, 60000);
  timer.unref?.();
}
