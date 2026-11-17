import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import { loadModule } from "./helpers/load-module.mjs";

const security = await loadModule("lib/checkout-security.js");

// Exercise the actual handler with isolated storage and notification adapters.
// These tests never connect to a database or send customer notifications.
const source = await readFile(new URL("../app/api/order/route.js", import.meta.url), "utf8");
const form = await readFile(new URL("../components/OrderForm.jsx", import.meta.url), "utf8");
const areas = form.match(/area: area === "inside" \? "([^"]+)" : "([^"]+)"/);
assert.ok(areas, "Read delivery labels from the actual checkout payload");

async function checkout(overrides = {}, { storageFails = false, replay = false, configFails = false, turnstile = false, limited = false } = {}) {
  const saved = [];
  const notices = [];
  const jobs = [];
  const context = vm.createContext({ Response, URL, console: { log() {}, error() {} } });
  const adapters = {
    "next/server": { after: (fn) => jobs.push(fn) },
    "@/lib/checkout-security": security,
    "@/lib/db": {
      hasDb: () => true,
    },
    "@/lib/checkout-db": {
      findSubmission: async () => replay ? { order: { id: 123 }, replayed: true } : null,
      limitCheckout: async () => { if (limited) throw new security.CheckoutError(429, "rate_limited", "Wait"); },
      createProtectedOrder: async (order) => {
        if (storageFails) throw new Error("test database unavailable");
        saved.push({ ...order });
        return { order: { ...order, id: 123, status: "inreview" }, replayed: false };
      },
    },
    "@/lib/telegram": {
      formatOrder: (order) => order,
      sendTelegram: async (order) => notices.push(order),
    },
    "@/lib/products-db": {
      getProductBySlug: async () => ({
        slug: "test-product", name: "Test product",
        variants: [{ name: "Full set", price: 2450 }], sizes: ["48"],
      }),
    },
    "@/lib/settings": {
      getSettings: async () => ({ delivery: { insideDhaka: 60, outsideDhaka: 120 } }),
      getCheckoutConfiguration: async () => {
        if (configFails) throw new Error("settings unavailable");
        return { enabled: turnstile, siteKey: "site", secret: "secret", hostname: "shop.test", publicUrl: "https://shop.test" };
      },
    },
  };
  const route = new vm.SourceTextModule(source, { context });
  await route.link((specifier) => {
    const exports = adapters[specifier];
    assert.ok(exports, `Unexpected dependency: ${specifier}`);
    return new vm.SyntheticModule(Object.keys(exports), function () {
      for (const [name, value] of Object.entries(exports)) this.setExport(name, value);
    }, { context });
  });
  await route.evaluate();
  const request = new Request("http://localhost/api/order", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Test customer", phone: "01700000000", address: "Test address",
      slug: "test-product", product: "Test product (Full set)", variant: "Full set",
      size: "48", qty: 1, area: areas[1], price: 1, deliveryCharge: 0, total: 1,
      ...overrides,
    }),
  });
  request.cookies = { get: () => undefined };
  const response = await route.namespace.POST(request);
  assert.equal(notices.length, 0, "notifications must not delay checkout response");
  for (const job of jobs) await job();
  return { status: response.status, body: await response.json(), saved, notices };
}

for (const [label, area, charge] of [
  ["checkout inside Dhaka", areas[1], 60],
  ["checkout outside Dhaka", areas[2], 120],
  ["legacy inside spelling", "ঢাকার ভিতর", 60],
]) {
  test(`${label}: accepts order and calculates trusted prices`, async () => {
    const result = await checkout({ area, qty: 2 });
    assert.equal(result.status, 200, JSON.stringify(result.body));
    assert.deepEqual(result.body, { ok: true, id: 123, replayed: false });
    assert.equal(result.saved.length, 1);
    assert.equal(result.saved[0].deliveryCharge, charge);
    assert.equal(result.saved[0].total, 4900 + charge);
    assert.equal(result.notices.length, 1);
  });
}

test("cached checkout without explicit variant remains supported", async () => {
  assert.equal((await checkout({ variant: undefined })).status, 200);
});

test("replay returns the original ID without captcha, rate limit, write or notification", async () => {
  const result = await checkout({}, { replay: true, turnstile: true, limited: true });
  assert.equal(result.status, 200);
  assert.equal(result.body.replayed, true);
  assert.equal(result.saved.length, 0);
  assert.equal(result.notices.length, 0);
});

test("security config failure cannot silently disable protection", async () => {
  const result = await checkout({}, { configFails: true });
  assert.equal(result.status, 503);
  assert.equal(result.saved.length, 0);
});

test("enabled Turnstile blocks a request without a token", async () => {
  const result = await checkout({}, { turnstile: true });
  assert.equal(result.status, 400);
  assert.equal(result.body.code, "verification_required");
  assert.equal(result.saved.length, 0);
});

test("rate limiting and honeypot submissions do not create orders", async () => {
  assert.equal((await checkout({}, { limited: true })).status, 429);
  const result = await checkout({ companyWebsite: "bot.example" });
  assert.equal(result.status, 400);
  assert.equal(result.saved.length, 0);
});

test("unknown area is rejected without saving or notifying", async () => {
  const result = await checkout({ area: "invalid area" });
  assert.equal(result.status, 400);
  assert.equal(result.body.error, "invalid delivery area");
  assert.equal(result.saved.length, 0);
  assert.equal(result.notices.length, 0);
});

test("database failure is not reported as a successful order", async () => {
  const result = await checkout({}, { storageFails: true });
  assert.equal(result.status, 503);
  assert.equal(result.body.ok, false);
  assert.equal(result.notices.length, 0);
});
