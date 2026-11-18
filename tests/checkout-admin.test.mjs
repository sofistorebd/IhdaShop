import assert from "node:assert/strict";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { loadModule } from "./helpers/load-module.mjs";

test("Turnstile settings are opt-in, encrypted, private and fail closed", async () => {
  const pg = new PGlite();
  try {
    const tag = (c) => async (parts, ...values) => (await c.query(parts.reduce((s, p, i) => s + (i ? "$" + i : "") + p, ""), values)).rows;
    const crypto = await loadModule("lib/crypto.js");
    const colors = await loadModule("lib/header-colors.js");
    const settings = await loadModule("lib/settings.js", {
      react: { cache: (fn) => fn },
      "./db": { sql: tag(pg), hasDb: () => true, withTransaction: (fn) => pg.transaction((tx) => fn(tag(tx))) },
      "./crypto": crypto,
      "./header-colors": colors,
      "@/config": { site: { url: "https://client.test", delivery: {} } },
    });
    assert.equal((await settings.getCheckoutConfiguration()).enabled, false);
    await settings.updateSettings({ turnstileEnabled: "true", turnstileSiteKey: "public-site-key", turnstileSecretKey: "private-secret" });
    const config = await settings.getCheckoutConfiguration();
    assert.equal(config.enabled, true);
    assert.equal(config.secret, "private-secret");
    assert.equal(config.hostname, "client.test");
    const raw = (await pg.query("SELECT value FROM settings WHERE key='turnstileSecretKey'")).rows[0].value;
    assert.ok(raw.startsWith("enc:"));
    assert.ok(!raw.includes("private-secret"));
    assert.ok(!JSON.stringify(await settings.getSettings()).includes("private-secret"));
    assert.ok(!JSON.stringify(await settings.getSettingsForAdmin()).includes("private-secret"));
    await settings.updateSettings({ turnstileSecretKey: "" });
    assert.equal((await settings.getCheckoutConfiguration()).secret, "private-secret");
    await pg.exec("DROP TABLE settings");
    await assert.rejects(settings.getCheckoutConfiguration());
  } finally { await pg.close(); }
});

async function statusHandler() {
  const changes = [];
  const jobs = [];
  const auth = await loadModule("lib/admin-request.js", {
    "./auth": { ADMIN_COOKIE: "store_admin", validSession: async (value) => value === "valid-token" },
  }, { process: { env: { NEXT_PUBLIC_SITE_URL: "https://shop.test" } } });
  const route = await loadModule("app/api/admin/status/route.js", {
    "next/server": { after: (job) => jobs.push(job) },
    "@/lib/admin-request": auth,
    "@/lib/checkout-db": { changeReviewedOrderStatus: async (id, status) => { changes.push({ id, status }); return { id, status }; } },
    "@/lib/purchase-outbox": { flushPurchases: async () => {} },
  });
  const request = ({ cookie = "valid-token", origin = "https://shop.test", action = "change-order-status", id = 12 } = {}) => ({
    url: "http://0.0.0.0:3000/api/admin/status",
    cookies: { get: () => cookie ? { value: cookie } : undefined },
    headers: new Headers({ origin, "x-admin-action": action }),
    json: async () => ({ id, status: "pending" }),
  });
  return { route, request, changes, jobs };
}

test("only authenticated same-site admin verification can schedule Purchase", async () => {
  const { route, request, changes, jobs } = await statusHandler();
  for (const options of [{ cookie: null }, { origin: "https://other-client.test" }, { action: "" }]) {
    assert.ok([401, 403].includes((await route.POST(request(options))).status));
  }
  assert.equal(changes.length, 0);
  assert.equal(jobs.length, 0);
  assert.equal((await route.POST(request())).status, 200);
  assert.equal(changes.length, 1);
  assert.equal(jobs.length, 1);
});

test("public checkout config never returns the secret and sets a signed HttpOnly cookie", async () => {
  let cookie;
  const security = await loadModule("lib/checkout-security.js");
  const route = await loadModule("app/api/checkout/config/route.js", {
    "next/server": { NextResponse: { json: (value, options) => {
      const response = Response.json(value, options);
      response.cookies = { set: (...args) => { cookie = args; } };
      return response;
    } } },
    "@/lib/settings": { getCheckoutConfiguration: async () => ({ enabled: true, siteKey: "public", secret: "private" }) },
    "@/lib/checkout-security": security,
  }, { process: { env: { NODE_ENV: "production" } } });
  const response = await route.GET({ cookies: { get: () => undefined } });
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.deepEqual(await response.json(), { ok: true, enabled: true, siteKey: "public" });
  assert.equal(cookie[0], "checkout_session");
  assert.equal(cookie[2].httpOnly, true);
  assert.equal(cookie[2].secure, true);
});

test("security settings require admin origin checks and complete keys before enabling", async () => {
  let writes = 0;
  const auth = await loadModule("lib/admin-request.js", {
    "./auth": { ADMIN_COOKIE: "store_admin", validSession: async (value) => value === "valid-token" },
  }, { process: { env: { NEXT_PUBLIC_SITE_URL: "https://shop.test" } } });
  const colors = await loadModule("lib/header-colors.js");
  const route = await loadModule("app/api/admin/settings/route.js", {
    "next/cache": { revalidatePath() {} },
    "@/lib/admin-request": auth,
    "@/lib/header-colors": colors,
    "@/lib/settings": {
      getSettingsForAdmin: async () => ({}),
      getCheckoutConfiguration: async () => ({ siteKey: "old-site", secret: "old-secret", hostname: "shop.test" }),
      updateSettings: async () => { writes++; },
    },
  });
  const request = (data, origin = "https://shop.test") => ({
    url: "https://shop.test/api/admin/settings", cookies: { get: () => ({ value: "valid-token" }) },
    headers: new Headers({ origin, "x-admin-action": "save-settings" }), json: async () => data,
  });
  assert.equal((await route.POST(request({ turnstileEnabled: "true" }, "https://attacker.test"))).status, 403);
  assert.equal((await route.POST(request({ turnstileEnabled: "true", turnstileSiteKey: "" }))).status, 400);
  assert.equal(writes, 0);
  assert.equal((await route.POST(request({ turnstileEnabled: "false" }))).status, 200);
  assert.equal(writes, 1);
});
