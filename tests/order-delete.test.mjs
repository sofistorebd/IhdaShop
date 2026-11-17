import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import swc from "next/dist/build/swc/index.js";

const require = createRequire(import.meta.url);
await swc.loadBindings();

// Run actual handlers, SQL builder and component with isolated adapters only.
// No client database, courier or live order is used by these tests.
async function load(relativePath, mocks = {}, globals = {}) {
  const source = await readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");
  const { code } = await swc.transform(source, {
    filename: relativePath,
    jsc: {
      parser: { syntax: "ecmascript", jsx: relativePath.endsWith("jsx") },
      transform: { react: { runtime: "automatic" } },
    },
    module: { type: "commonjs" },
  });
  const module = { exports: {} };
  vm.runInNewContext(code, {
    module, exports: module.exports,
    require: (name) => Object.hasOwn(mocks, name) ? mocks[name] : require(name),
    console: { error() {} }, Response, URL, Buffer,
    process: { env: {} }, ...globals,
  });
  return module.exports;
}

async function setup({ rows = [{ id: 7 }], dbFails = false } = {}) {
  const queries = [];
  const db = await load("lib/db.js", {
    postgres: () => async (parts, ...values) => {
      queries.push({ text: parts.join("?"), values });
      if (dbFails) throw new Error("isolated DB failure");
      return rows;
    },
  }, { process: { env: { DATABASE_URL: "postgres://isolated-test" } } });
  const auth = await load("lib/admin-request.js", {
    "./auth": { ADMIN_COOKIE: "store_admin", sessionToken: async () => "valid-token" },
  }, { process: { env: { NEXT_PUBLIC_SITE_URL: "https://shop.test/" } } });
  const route = await load("app/api/admin/orders/[id]/route.js", {
    "@/lib/db": db, "@/lib/admin-request": auth,
  });
  async function run({ id = "7", cookie = "valid-token", origin = "https://shop.test", action = "delete-inreview-order" } = {}) {
    const headers = new Headers({ "x-admin-action": action });
    if (origin !== null) headers.set("origin", origin);
    const request = {
      url: "http://0.0.0.0:3000/api/admin/orders/7", headers,
      cookies: { get: () => cookie ? { value: cookie } : undefined },
    };
    const response = await route.DELETE(request, { params: Promise.resolve({ id }) });
    return { status: response.status, body: await response.json() };
  }
  return { run, queries };
}

test("delete requires a valid admin session before touching the database", async () => {
  const { run, queries } = await setup();
  for (const cookie of [null, "wrong-token"]) assert.equal((await run({ cookie })).status, 401);
  assert.equal(queries.length, 0);
});

test("delete rejects missing/cross-client origins and wrong action headers", async () => {
  const { run, queries } = await setup();
  for (const origin of [null, "null", "https://other-client.test", "http://shop.test", "https://shop.test.attacker.test"]) {
    assert.equal((await run({ origin })).status, 403);
  }
  for (const action of ["", "google-drive-backup"]) assert.equal((await run({ action })).status, 403);
  assert.equal(queries.length, 0);
});

test("delete rejects malformed and out-of-range IDs without any SQL", async () => {
  const { run, queries } = await setup();
  for (const id of ["0", "-1", "1.5", "1e2", "7 OR 1=1", "", "2147483648", "9007199254740992"]) {
    assert.equal((await run({ id })).status, 400, id);
  }
  assert.equal(queries.length, 0);
});

test("delete uses a single parameterized, status-guarded SQL statement behind Coolify", async () => {
  const { run, queries } = await setup();
  assert.deepEqual(await run(), { status: 200, body: { ok: true, id: 7 } });
  assert.equal(queries.length, 1);
  assert.deepEqual(queries[0].values, [7]);
  assert.match(queries[0].text.replace(/\s+/g, " ").trim(), /^DELETE FROM orders WHERE id = \? AND status = 'inreview' AND COALESCE\(consignment_id, ''\) = '' AND COALESCE\(tracking_code, ''\) = '' RETURNING id$/);
});

test("non-review, courier-linked, missing or concurrently verified orders cannot report delete success", async () => {
  const { run, queries } = await setup({ rows: [] });
  const result = await run();
  assert.equal(result.status, 409);
  assert.equal(result.body.ok, false);
  assert.equal(queries.length, 1);
});

test("database failure cannot report delete success", async () => {
  const { run } = await setup({ dbFails: true });
  const result = await run();
  assert.equal(result.status, 500);
  assert.equal(result.body.ok, false);
});

function nodes(tree, predicate) {
  if (!tree || typeof tree !== "object") return [];
  if (Array.isArray(tree)) return tree.flatMap((child) => nodes(child, predicate));
  return [...(predicate(tree) ? [tree] : []), ...nodes(tree.props?.children, predicate)];
}

async function ui({ confirm = true, response = { ok: true }, failure = false, pagination } = {}) {
  const state = [];
  const requests = [];
  const confirmations = [];
  const navigations = [];
  let cursor = 0;
  let refreshes = 0;
  const component = await load("components/admin/OrdersTable.jsx", {
    react: {
      useTransition: () => [false, (fn) => fn()],
      useState(initial) {
        const index = cursor++;
        if (!(index in state)) state[index] = typeof initial === "function" ? initial() : initial;
        return [state[index], (next) => { state[index] = typeof next === "function" ? next(state[index]) : next; }];
      },
    },
    "next/navigation": { useRouter: () => ({ refresh: () => refreshes++, push: (url) => navigations.push(url) }) },
  }, {
    window: { confirm: (text) => { confirmations.push(text); return confirm; } },
    fetch: async (url, options) => {
      requests.push({ url, options });
      if (failure) throw new Error("Network failed");
      return { ok: response.ok, json: async () => response };
    },
  });
  const initialOrders = [
    { id: 7, name: "Review customer", status: "inreview" },
    { id: 8, name: "Other customer", status: "inreview" },
    { id: 9, name: "Verified customer", status: "pending" },
  ];
  const render = () => {
    cursor = 0;
    return component.default({ initialOrders, pagination, steadfastReady: false, delivery: {} });
  };
  const deleteButton = (tree) => nodes(tree, (n) => n.type === "button" && n.props["aria-label"] === "অর্ডার #7 Delete করুন")[0];
  return { render, deleteButton, requests, confirmations, state, navigations, refreshes: () => refreshes };
}

test("UI cancellation keeps order in review without sending a delete request", async () => {
  const view = await ui({ confirm: false });
  await view.deleteButton(view.render()).props.onClick();
  assert.equal(view.requests.length, 0);
  assert.equal(view.state[0].length, 3);
  assert.match(view.confirmations[0], /#7 — Review customer/);
  assert.ok(view.deleteButton(view.render()));
});

test("UI confirmed deletion removes only selected order and refreshes counts", async () => {
  const view = await ui();
  await view.deleteButton(view.render()).props.onClick();
  assert.equal(view.requests.length, 1);
  assert.equal(view.requests[0].url, "/api/admin/orders/7");
  assert.equal(view.requests[0].options.method, "DELETE");
  assert.equal(view.requests[0].options.headers["x-admin-action"], "delete-inreview-order");
  assert.deepEqual(view.state[0].map((o) => o.id), [8, 9]);
  assert.equal(view.deleteButton(view.render()), undefined);
  assert.equal(view.refreshes(), 1);
});

test("UI retains order and shows error on conflict or network failure", async () => {
  for (const options of [{ response: { ok: false, error: "Order changed" } }, { failure: true }]) {
    const view = await ui(options);
    await view.deleteButton(view.render()).props.onClick();
    assert.equal(view.state[0].length, 3);
    const tree = view.render();
    assert.ok(view.deleteButton(tree));
    assert.equal(view.deleteButton(tree).props.disabled, false);
    assert.ok(nodes(tree, (n) => n.props?.role === "status").length);
  }
});

test("UI verification still moves order to Pending with no Delete option there", async () => {
  const view = await ui();
  const verify = nodes(view.render(), (n) => n.type === "button" && n.props.children === "যাচাই সম্পন্ন → Pending করুন")[0];
  await verify.props.onClick();
  assert.equal(view.requests[0].url, "/api/admin/status");
  assert.deepEqual(JSON.parse(view.requests[0].options.body), { id: 7, status: "pending" });
  assert.equal(view.state[0].find((o) => o.id === 7).status, "pending");
  assert.equal(view.state[1], "pending");
  assert.equal(nodes(view.render(), (n) => n.type === "button" && String(n.props["aria-label"]).includes("Delete")).length, 0);
});

const pagination = {
  status: "inreview", page: 2, pageSize: 50, total: 251, totalPages: 6,
  counts: { inreview: 251, pending: 300, confirmed: 0, sent_to_courier: 0, delivered: 12, cancelled: 0 },
};

test("paginated tabs display database-wide counts instead of loaded row counts", async () => {
  const view = await ui({ pagination });
  const pending = nodes(view.render(), (n) => n.props?.id === "order-tab-pending")[0];
  assert.equal(pending.props.children[1].props.children, (300).toLocaleString("bn-BD"));
  pending.props.onClick();
  assert.equal(view.navigations[0], "/admin?status=pending&page=1");
});

test("pagination preserves the status and clears page-scoped selection", async () => {
  const view = await ui({ pagination });
  const next = nodes(view.render(), (n) => n.type === "button" && n.props.children === "পরের পৃষ্ঠা")[0];
  view.state[7].add(7);
  next.props.onClick();
  assert.equal(view.navigations[0], "/admin?status=inreview&page=3");
  assert.equal(view.state[7].size, 0);
});

test("pagination disables previous/next buttons at the ends", async () => {
  const view = await ui({ pagination: { ...pagination, page: 1, totalPages: 1 } });
  for (const label of ["আগের পৃষ্ঠা", "পরের পৃষ্ঠা"]) {
    assert.equal(nodes(view.render(), (n) => n.type === "button" && n.props.children === label)[0].props.disabled, true);
  }
});

test("review verification navigates to Pending page one, not an incomplete local list", async () => {
  const view = await ui({ pagination });
  const verify = nodes(view.render(), (n) => n.type === "button" && n.props.children === "যাচাই সম্পন্ন → Pending করুন")[0];
  await verify.props.onClick();
  assert.equal(view.navigations[0], "/admin?status=pending&page=1");
  assert.equal(view.requests[0].options.method, "POST");
});
