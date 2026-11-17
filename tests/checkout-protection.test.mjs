import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test, before, after } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { loadModule } from "./helpers/load-module.mjs";

let pg, db, security, crypto, checkout;
const queries = [];
let failInsert = false;
const order = { name: "Test Buyer", phone: "01700000000", address: "Test Address", product: "Test (Full)", slug: "test",
  size: "48", qty: 1, area: "ঢাকার ভিতরে", deliveryCharge: 60, total: 1060 };

function adapter(connection) {
  return async (parts, ...values) => {
    const text = parts.reduce((s, part, i) => s + (i ? "$" + i : "") + part, "");
    queries.push(text);
    if (failInsert && text.includes("INSERT INTO checkout_submissions")) throw new Error("injected failure");
    return (await connection.query(text, values)).rows;
  };
}

before(async () => {
  pg = new PGlite();
  const tag = adapter(pg);
  tag.begin = (fn) => pg.transaction((tx) => fn(adapter(tx)));
  db = await loadModule("lib/db.js", { postgres: () => tag });
  security = await loadModule("lib/checkout-security.js");
  crypto = await loadModule("lib/crypto.js");
  checkout = await loadModule("lib/checkout-db.js", { "./db": db, "./crypto": crypto, "./checkout-security": security });
  await checkout.ensureCheckoutSchema();
});
after(async () => { await pg?.close(); });

function context(overrides = {}) {
  return { key: randomUUID(), payloadHash: randomUUID(), phoneHash: randomUUID(),
    sessionHash: randomUUID(), ipHash: null, flags: [], legacy: false, ...overrides };
}

test("parallel duplicate submissions create exactly one order and one metadata row", async () => {
  const c = context();
  const results = await Promise.all(Array.from({ length: 8 }, () => checkout.createProtectedOrder(order, c, { sourceUrl: "https://shop.test/product/test" })));
  assert.equal(new Set(results.map((r) => r.order.id)).size, 1);
  assert.equal(results.filter((r) => !r.replayed).length, 1);
  const rows = await pg.query("SELECT * FROM checkout_submissions WHERE request_key=$1", [c.key]);
  assert.equal(rows.rows.length, 1);
  assert.ok(rows.rows[0].attribution.startsWith("enc:"));
  assert.ok(!rows.rows[0].attribution.includes("shop.test"));
  assert.ok(queries.some((q) => q.includes("pg_advisory_xact_lock")));
});

test("same key with changed content is rejected and no new order is written", async () => {
  const c = context();
  await checkout.createProtectedOrder(order, c, {});
  await assert.rejects(checkout.createProtectedOrder(order, { ...c, payloadHash: "changed" }, {}), (e) => e.code === "request_changed");
  const replay = await checkout.findSubmission(c);
  assert.equal(replay.replayed, true);
});

test("same intent under a new key needs explicit repeat confirmation", async () => {
  const c = context();
  const first = await checkout.createProtectedOrder(order, c, {});
  const secondContext = { ...c, key: randomUUID() };
  await assert.rejects(checkout.createProtectedOrder(order, secondContext, {}), (e) => e.code === "duplicate_order");
  const second = await checkout.createProtectedOrder(order, secondContext, {}, true);
  assert.notEqual(first.order.id, second.order.id);
  const rows = await checkout.attachCheckoutInfo([second.order]);
  assert.ok(rows[0].checkout.risk_flags.includes("repeat_phone"));
  assert.ok(rows[0].checkout.risk_flags.includes("repeat_confirmed"));
});

test("failed metadata insert rolls back the order too", async () => {
  const beforeCount = (await pg.query("SELECT count(*) AS n FROM orders")).rows[0].n;
  failInsert = true;
  try { await assert.rejects(checkout.createProtectedOrder(order, context(), {})); }
  finally { failInsert = false; }
  assert.equal((await pg.query("SELECT count(*) AS n FROM orders")).rows[0].n, beforeCount);
});

test("deleted order keeps a retry tombstone instead of recreating the order", async () => {
  const c = context();
  const result = await checkout.createProtectedOrder(order, c, {});
  await db.deleteInReviewOrder(result.order.id);
  await assert.rejects(checkout.findSubmission(c), (e) => e.code === "order_removed");
});

test("rate limiter persists across calls, uses atomic counters and allows window expiry", async () => {
  const c = context();
  for (let i = 0; i < 5; i++) await checkout.limitCheckout(c);
  await assert.rejects(checkout.limitCheckout(c), (e) => e.status === 429);
  await pg.query("UPDATE checkout_limits SET started_at=now()-interval '16 minutes' WHERE key=$1", ["phone:" + c.phoneHash]);
  await checkout.limitCheckout(c);
  // Same shared IP does not by itself block an unrelated buyer.
  await checkout.limitCheckout(context({ ipHash: c.ipHash }));
});

test("a consumed Turnstile token cannot create orders under different request keys", async () => {
  const challengeHash = randomUUID();
  await checkout.createProtectedOrder(order, context({ challengeHash }), {});
  await assert.rejects(checkout.createProtectedOrder(order, context({ challengeHash }), {}), (e) => e.code === "verification_required");
});

test("Purchase is queued only on first manual review -> pending and legacy orders stay untouched", async () => {
  const result = await checkout.createProtectedOrder(order, context(), {});
  const id = result.order.id;
  assert.equal((await checkout.attachCheckoutInfo([result.order]))[0].checkout.purchase_state, "waiting");
  await checkout.changeReviewedOrderStatus(id, "pending");
  const first = (await pg.query("SELECT * FROM checkout_submissions WHERE order_id=$1", [id])).rows[0];
  assert.equal(first.purchase_state, "queued");
  assert.ok(first.purchase_payload.startsWith("enc:"));
  await checkout.changeReviewedOrderStatus(id, "inreview");
  await checkout.changeReviewedOrderStatus(id, "pending");
  const second = (await pg.query("SELECT * FROM checkout_submissions WHERE order_id=$1", [id])).rows[0];
  assert.equal(second.verified_at.toISOString(), first.verified_at.toISOString());
  const legacy = await db.createOrder(order);
  await checkout.changeReviewedOrderStatus(legacy.id, "pending");
  assert.equal((await pg.query("SELECT * FROM checkout_submissions WHERE order_id=$1", [legacy.id])).rows.length, 0);
});

test("outbox retries use the original buyer context, stable ID and confirmation time", async () => {
  // Isolate this queue test from earlier test rows.
  await pg.query("UPDATE checkout_submissions SET purchase_state='waiting' WHERE purchase_state='queued'");
  const c = context();
  const result = await checkout.createProtectedOrder(order, c, { userAgent: "customer-browser", fbc: "fb-click", sourceUrl: "https://shop.test/product/test" });
  await checkout.changeReviewedOrderStatus(result.order.id, "pending");
  const sent = [];
  let succeed = false;
  const worker = await loadModule("lib/purchase-outbox.js", {
    "./db": db, "./checkout-db": checkout, "./crypto": crypto, "./checkout-security": security,
    "./fb-capi": { sendPurchase: async (event) => { sent.push(event); return succeed; } },
  });
  await worker.flushPurchases();
  assert.equal(sent.length, 1);
  assert.equal(sent[0].userAgent, "customer-browser");
  assert.equal(sent[0].actionSource, "phone_call");
  await pg.query("UPDATE checkout_submissions SET next_attempt_at=now() WHERE request_key=$1", [c.key]);
  succeed = true;
  await Promise.all([worker.flushPurchases(), worker.flushPurchases()]);
  assert.equal(sent.length, 2);
  assert.equal(sent[0].eventId, sent[1].eventId);
  assert.equal(sent[0].eventTime, sent[1].eventTime);
  await worker.flushPurchases();
  assert.equal(sent.length, 2);
  const row = (await pg.query("SELECT * FROM checkout_submissions WHERE request_key=$1", [c.key])).rows[0];
  assert.equal(row.purchase_state, "sent");
  assert.equal(row.attribution, null);
  assert.equal(row.purchase_payload, null);
});

test("phone parsing, signed sessions and proxy headers reject easy spoofing", async () => {
  assert.equal(security.normalizePhone("+৮৮০ ১৭০০০০০০০০"), "01700000000");
  assert.equal(security.validPhone("01700000000"), true);
  assert.equal(security.validPhone("01100000000"), false);
  assert.equal(security.validPhone(security.normalizePhone("017abc00000000")), false);
  const cookie = security.sessionCookie();
  assert.equal(security.sessionCookie(cookie), cookie);
  assert.notEqual(security.sessionCookie(cookie + ".extra"), cookie + ".extra");
  assert.notEqual(security.sessionCookie(cookie.slice(0, -1) + "z"), cookie);
  assert.equal(security.trustedClientIp({ headers: new Headers({ "x-forwarded-for": "1.2.3.4", "cf-connecting-ip": "1.2.3.4" }) }), "");
});

test("Turnstile validates server-side hostname/action and fails closed", async () => {
  const config = { enabled: true, siteKey: "site", secret: "secret", hostname: "shop.test" };
  for (const result of [{ success: false }, { success: true, hostname: "other.test", action: "checkout" },
    { success: true, hostname: "shop.test", action: "login" }]) {
    const s = await loadModule("lib/checkout-security.js", {}, { fetch: async () => Response.json(result) });
    await assert.rejects(s.validateTurnstile("token", config, ""), (e) => e.code === "verification_required");
  }
  const good = await loadModule("lib/checkout-security.js", {}, { fetch: async () => Response.json({ success: true, hostname: "shop.test", action: "checkout" }) });
  await good.validateTurnstile("token", config, "");
  const unavailable = await loadModule("lib/checkout-security.js", {}, { fetch: async () => { throw new Error(); } });
  await assert.rejects(unavailable.validateTurnstile("token", config, ""), (e) => e.status === 503);
  await unavailable.validateTurnstile("", { enabled: false }, "");
});

test("checkout body size is bounded before JSON parsing", async () => {
  await assert.rejects(security.readCheckoutJson(new Request("https://shop.test/api/order", { method: "POST", body: "x".repeat(17000) })), (e) => e.status === 413);
});
