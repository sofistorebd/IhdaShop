import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

// Exercise the actual handler with isolated storage and notification adapters.
// These tests never connect to a database or send customer notifications.
const source = await readFile(new URL("../app/api/order/route.js", import.meta.url), "utf8");
const form = await readFile(new URL("../components/OrderForm.jsx", import.meta.url), "utf8");
const areas = form.match(/area: area === "inside" \? "([^"]+)" : "([^"]+)"/);
assert.ok(areas, "Read delivery labels from the actual checkout payload");

async function checkout(overrides = {}, { storageFails = false } = {}) {
  const saved = [];
  const notices = [];
  const context = vm.createContext({ Response, console: { log() {}, error() {} } });
  const adapters = {
    "@/lib/db": {
      hasDb: () => true,
      createOrder: async (order) => {
        if (storageFails) throw new Error("test database unavailable");
        saved.push({ ...order });
        return { ...order, id: 123, status: "inreview" };
      },
    },
    "@/lib/telegram": {
      formatOrder: (order) => order,
      sendTelegram: async (order) => notices.push(order),
    },
    "@/lib/fb-capi": { sendPurchase: async () => {} },
    "@/lib/products-db": {
      getProductBySlug: async () => ({
        slug: "test-product", name: "Test product",
        variants: [{ name: "Full set", price: 2450 }], sizes: ["48"],
      }),
    },
    "@/lib/settings": {
      getSettings: async () => ({ delivery: { insideDhaka: 60, outsideDhaka: 120 } }),
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
    assert.deepEqual(result.body, { ok: true, id: 123 });
    assert.equal(result.saved.length, 1);
    assert.equal(result.saved[0].deliveryCharge, charge);
    assert.equal(result.saved[0].total, 4900 + charge);
    assert.equal(result.notices.length, 1);
  });
}

test("cached checkout without explicit variant remains supported", async () => {
  assert.equal((await checkout({ variant: undefined })).status, 200);
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
