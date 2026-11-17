import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { loadModule } from "./helpers/load-module.mjs";

// Synthetic fixtures only. No connection to a client database or provider.
const order = { name: "Synthetic Buyer", phone: "01700000000", address: "Test address",
  product: "Synthetic (Full)", slug: "synthetic", size: "48", qty: 1,
  area: "ঢাকার ভিতরে", deliveryCharge: 60, total: 1060 };
const context = () => ({ key: randomUUID(), payloadHash: randomUUID(), phoneHash: randomUUID(),
  sessionHash: randomUUID(), ipHash: null, flags: [], legacy: false });

async function fixture(t, client = "a") {
  const pg = new PGlite();
  t.after(() => pg.close());
  let failure = () => false;
  const adapter = (connection) => async (parts, ...values) => {
    const query = parts.reduce((s, p, i) => s + (i ? "$" + i : "") + p, "");
    if (failure(query, values)) throw new Error("Injected database failure");
    return (await connection.query(query, values)).rows;
  };
  const tag = adapter(pg);
  tag.begin = (fn) => pg.transaction((tx) => fn(adapter(tx)));
  const db = await loadModule("lib/db.js", { postgres: () => tag });
  const crypto = await loadModule("lib/crypto.js");
  const security = await loadModule("lib/checkout-security.js");
  const settings = await loadModule("lib/settings.js", {
    react: { cache: (fn) => fn }, "./db": db, "./crypto": crypto,
    "./header-colors": await loadModule("lib/header-colors.js"),
    "@/config": { site: { url: `https://${client}.test`, delivery: {} } },
  });
  const products = await loadModule("lib/products-db.js", { "./db": db, "@/data/products": { products: [] } });
  const backup = await loadModule("lib/backup-db.js", { "./db": db, "./crypto": crypto });
  await db.ensureSchema();
  await products.ensureProductsSchema();
  await backup.ensureBackupSchema();
  await settings.updateSettings({ brandName: `Client ${client}`, capiAccessToken: `synthetic-token-${client}` });
  await pg.query("INSERT INTO products(slug,name,price,image,images) VALUES($1,$2,1000,$3,$4::jsonb)",
    ["synthetic", `Client ${client} product`, "/api/media/test.jpg", JSON.stringify(["/api/media/test.jpg"])]);
  await pg.query("UPDATE backup_config SET google_refresh_token=$1, drive_folder_id=$2 WHERE id=1",
    [crypto.encrypt(`synthetic-refresh-${client}`), `synthetic-folder-${client}`]);
  for (const status of ["inreview", "pending", "confirmed", "sent_to_courier", "delivered", "cancelled"]) {
    const saved = await db.createOrder({ ...order, name: `${client}-${status}` });
    await pg.query("UPDATE orders SET status=$1, created_at='2025-01-01T00:00:00Z', consignment_id=$2, tracking_code=$3 WHERE id=$4",
      [status, status === "sent_to_courier" ? "synthetic-consignment" : null,
        status === "sent_to_courier" ? "synthetic-tracking" : null, saved.id]);
  }
  const reload = () => loadModule("lib/checkout-db.js", { "./db": db, "./crypto": crypto, "./checkout-security": security });
  const checkout = await reload();
  const snapshot = async () => {
    const tables = ["orders", "products", "settings", "backup_config"];
    const rows = {};
    for (const table of tables) rows[table] = (await pg.query(`SELECT * FROM ${table} ORDER BY 1`)).rows;
    rows.sequence = (await pg.query("SELECT last_value, is_called FROM orders_id_seq")).rows;
    return JSON.stringify(rows);
  };
  return { pg, db, crypto, security, settings, checkout, reload, snapshot,
    failWhen: (predicate) => { failure = predicate; } };
}

test("upgrade and repeated startup preserve all legacy rows, secrets, media references and order sequence", async (t) => {
  const f = await fixture(t);
  const before = await f.snapshot();
  await f.checkout.ensureCheckoutSchema();
  await (await f.reload()).ensureCheckoutSchema();
  assert.equal(await f.snapshot(), before);
  assert.equal((await f.pg.query("SELECT count(*)::int AS n FROM checkout_submissions")).rows[0].n, 0);
  // The old order API still works after the additive upgrade; no reset is needed.
  const saved = await f.db.createOrder(order);
  assert.equal(saved.id, 7);
  assert.equal((await f.db.getOrder(1)).name, "a-inreview");
});

test("interrupted additive initialization retries without modifying existing client data", async (t) => {
  const f = await fixture(t);
  const before = await f.snapshot();
  f.failWhen((sql) => sql.includes("CREATE INDEX IF NOT EXISTS checkout_phone_idx"));
  await assert.rejects(f.checkout.ensureCheckoutSchema(), /Injected/);
  assert.equal(await f.snapshot(), before);
  f.failWhen(() => false);
  await f.checkout.ensureCheckoutSchema();
  assert.equal(await f.snapshot(), before);
});

test("failed Purchase queue write rolls back verification; failed settings save preserves every original value", async (t) => {
  const f = await fixture(t);
  const result = await f.checkout.createProtectedOrder(order, context(), {});
  const before = await f.snapshot();
  f.failWhen((sql) => sql.includes("UPDATE checkout_submissions SET purchase_state = 'queued'"));
  await assert.rejects(f.checkout.changeReviewedOrderStatus(result.order.id, "pending"), /Injected/);
  assert.equal(await f.snapshot(), before);
  assert.equal((await f.pg.query("SELECT purchase_state FROM checkout_submissions WHERE order_id=$1", [result.order.id])).rows[0].purchase_state, "waiting");
  f.failWhen((sql, values) => sql.includes("INSERT INTO settings") && values[0] === "turnstileSecretKey");
  await assert.rejects(f.settings.updateSettings({ brandName: "Changed", turnstileSecretKey: "new-synthetic-secret" }), /Injected/);
  assert.equal(await f.snapshot(), before);
});

test("separate client databases isolate identical request IDs, limits, settings and verification", async (t) => {
  const a = await fixture(t, "a");
  const b = await fixture(t, "b");
  const c = context();
  const ra = await a.checkout.createProtectedOrder({ ...order, name: "Client A buyer" }, c, {});
  const rb = await b.checkout.createProtectedOrder({ ...order, name: "Client B buyer" }, c, {});
  assert.equal(ra.replayed, false);
  assert.equal(rb.replayed, false);
  const bBefore = await b.snapshot();
  for (let i = 0; i < 5; i++) await a.checkout.limitCheckout(c);
  await assert.rejects(a.checkout.limitCheckout(c), (e) => e.status === 429);
  await b.checkout.limitCheckout(c);
  await a.settings.updateSettings({ turnstileEnabled: "true", turnstileSiteKey: "a-public", turnstileSecretKey: "a-private" });
  assert.equal((await b.settings.getCheckoutConfiguration()).enabled, false);
  await a.checkout.changeReviewedOrderStatus(ra.order.id, "pending");
  assert.equal((await b.db.getOrder(rb.order.id)).status, "inreview");
  assert.equal(await b.snapshot(), bBefore);
});

test("expired anti-abuse metadata cleanup never removes orders, products, settings or backup configuration", async (t) => {
  const f = await fixture(t);
  const c = context();
  const result = await f.checkout.createProtectedOrder(order, c, { userAgent: "synthetic" });
  await f.pg.query("UPDATE checkout_submissions SET created_at=now()-interval '31 days' WHERE request_key=$1", [c.key]);
  await f.pg.query("INSERT INTO checkout_limits(key,hits,started_at) VALUES('expired',1,now()-interval '2 days')");
  await f.pg.query("INSERT INTO checkout_challenges(token_hash,created_at) VALUES('expired',now()-interval '2 days')");
  const before = await f.snapshot();
  let purchaseCalls = 0;
  const worker = await loadModule("lib/purchase-outbox.js", {
    "./db": f.db, "./checkout-db": f.checkout, "./crypto": f.crypto, "./checkout-security": f.security,
    "./fb-capi": { sendPurchase: async () => { purchaseCalls++; return true; } },
  });
  await worker.flushPurchases();
  assert.equal(purchaseCalls, 0);
  assert.equal(await f.snapshot(), before);
  const row = (await f.pg.query("SELECT * FROM checkout_submissions WHERE request_key=$1", [c.key])).rows[0];
  assert.equal(row.order_id, result.order.id);
  assert.equal(row.phone_hash, null);
  assert.equal(row.attribution, null);
  assert.equal((await f.checkout.findSubmission(c)).replayed, true);
  assert.equal((await f.pg.query("SELECT count(*)::int AS n FROM checkout_limits")).rows[0].n, 0);
  assert.equal((await f.pg.query("SELECT count(*)::int AS n FROM checkout_challenges")).rows[0].n, 0);
});
