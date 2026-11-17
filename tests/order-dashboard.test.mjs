import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import swc from "next/dist/build/swc/index.js";

const require = createRequire(import.meta.url);
await swc.loadBindings();

async function load(file, mocks = {}) {
  const source = await readFile(new URL(`../${file}`, import.meta.url), "utf8");
  const { code } = await swc.transform(source, {
    filename: file,
    jsc: { parser: { syntax: "ecmascript", jsx: true }, transform: { react: { runtime: "automatic" } } },
    module: { type: "commonjs" },
  });
  const module = { exports: {} };
  vm.runInNewContext(code, {
    module, exports: module.exports, console,
    process: { env: { DATABASE_URL: "postgres://isolated-test" } },
    require: (name) => Object.hasOwn(mocks, name) ? mocks[name] : require(name),
  });
  return module.exports;
}

const fixtures = Array.from({ length: 451 }, (_, index) => ({
  id: index + 1, created_at: "2026-11-17T00:00:00Z", total: 100,
  status: index < 230 ? "pending" : index < 350 ? "inreview" : index < 450 ? "delivered" : "sent_to_courier",
}));

async function database(rows = fixtures) {
  const queries = [];
  const db = await load("lib/db.js", { postgres: () => async (parts, ...values) => {
    const text = parts.join("?").replace(/\s+/g, " ").trim();
    queries.push({ text, values });
    if (text.startsWith("CREATE TABLE IF NOT EXISTS")) return [];
    if (text === "SELECT status, count(*) AS count, COALESCE(sum(total), 0) AS revenue FROM orders GROUP BY status") {
      const groups = new Map();
      for (const row of rows) {
        const group = groups.get(row.status) || { status: row.status, count: 0, revenue: 0 };
        group.count++;
        group.revenue += row.total;
        groups.set(row.status, group);
      }
      return [...groups.values()].map((g) => ({ ...g, count: String(g.count), revenue: String(g.revenue) }));
    }
    assert.equal(text, "SELECT * FROM orders WHERE status = ? ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?");
    const [status, limit, offset] = values;
    assert.equal(limit, 50);
    assert.ok(Number.isSafeInteger(offset) && offset >= 0);
    return rows.filter((o) => o.status === status).sort((a, b) => b.id - a.id).slice(offset, offset + limit);
  } });
  return { db, queries };
}

test("dashboard counts all 331 verified orders, excluding all 120 review orders", async () => {
  const { db, queries } = await database();
  const result = await db.getOrderDashboard({ status: "pending", page: "1" });
  assert.equal(result.stats.total, 331);
  assert.equal(result.stats.pending, 230);
  assert.equal(result.stats.sent, 1);
  assert.equal(result.stats.revenue, 33100);
  assert.equal(result.pagination.counts.inreview, 120);
  assert.equal(result.pagination.counts.delivered, 100);
  assert.equal(result.orders.length, 50);
  assert.equal(result.pagination.totalPages, 5);
  assert.equal(queries.filter((q) => !q.text.startsWith("CREATE")).length, 2);
  assert.ok(queries.every((q) => !/DELETE|UPDATE|DROP|TRUNCATE/.test(q.text)));
});

test("all pending orders including orders older than 200 are accessible across pages", async () => {
  const { db } = await database();
  const ids = [];
  for (let page = 1; page <= 5; page++) {
    const result = await db.getOrderDashboard({ status: "pending", page: String(page) });
    assert.equal(result.stats.total, 331);
    assert.equal(result.pagination.total, 230);
    ids.push(...result.orders.map((o) => o.id));
  }
  assert.equal(ids.length, 230);
  assert.equal(new Set(ids).size, 230);
  assert.equal(ids.at(-1), 1);
  assert.equal(ids[0], 230);
});

test("review tab fetches only review orders and does not change overall revenue", async () => {
  const { db } = await database();
  const result = await db.getOrderDashboard({ status: "inreview", page: "3" });
  assert.equal(result.orders.length, 20);
  assert.ok(result.orders.every((o) => o.status === "inreview"));
  assert.equal(result.stats.revenue, 33100);
});

test("invalid query parameters are safe and excessive pages clamp to last page", async () => {
  const { db } = await database();
  for (const page of ["-1", "0", "1.5", "1e2", "NaN", "9007199254740992", ["2", "3"]]) {
    const result = await db.getOrderDashboard({ status: "pending", page });
    assert.equal(result.pagination.page, 1);
  }
  assert.equal((await db.getOrderDashboard({ status: "pending", page: "9999" })).pagination.page, 5);
  assert.equal((await db.getOrderDashboard({ status: "pending'; DROP TABLE orders;--" })).pagination.status, "inreview");
  assert.equal((await db.getOrderDashboard({ status: ["pending", "delivered"] })).pagination.status, "inreview");
});

test("empty statuses and a deleted final-page row clamp without invalid offsets", async () => {
  const { db } = await database(fixtures.filter((o) => o.status === "pending").slice(0, 200));
  assert.equal((await db.getOrderDashboard({ status: "pending", page: "5" })).pagination.page, 4);
  const empty = await db.getOrderDashboard({ status: "inreview", page: "5" });
  assert.equal(empty.pagination.page, 1);
  assert.equal(empty.pagination.totalPages, 1);
  assert.equal(empty.pagination.total, 0);
  assert.equal(empty.orders.length, 0);
});

function nodes(tree, predicate) {
  if (!tree || typeof tree !== "object") return [];
  if (Array.isArray(tree)) return tree.flatMap((child) => nodes(child, predicate));
  return [...(predicate(tree) ? [tree] : []), ...nodes(tree.props?.children, predicate)];
}

test("server page renders global totals, passes pagination and resets stale snapshots", async () => {
  const { db } = await database();
  const Table = () => null;
  const Card = () => null;
  const { default: Page } = await load("app/admin/page.js", {
    "@/lib/db": db,
    "@/lib/settings": { getSettings: async () => ({ delivery: {} }) },
    "@/lib/steadfast": { steadfastReady: async () => false },
    "@/components/admin/OrdersTable": Table,
    "@/components/admin/AdminNav": () => null,
    "@/components/admin/AdminUI": { AdminHeader: () => null, StatCard: Card },
  });
  const first = await Page({ searchParams: Promise.resolve({ status: "pending", page: "1" }) });
  const second = await Page({ searchParams: Promise.resolve({ status: "pending", page: "5" }) });
  for (const tree of [first, second]) {
    assert.equal(nodes(tree, (n) => n.type === Card && n.props.label === "মোট অর্ডার")[0].props.value, (331).toLocaleString("bn-BD"));
  }
  const firstTable = nodes(first, (n) => n.type === Table)[0];
  const lastTable = nodes(second, (n) => n.type === Table)[0];
  assert.equal(firstTable.props.initialOrders.length, 50);
  assert.equal(lastTable.props.initialOrders.length, 30);
  assert.equal(lastTable.props.pagination.page, 5);
  assert.notEqual(firstTable.key, lastTable.key);
});
