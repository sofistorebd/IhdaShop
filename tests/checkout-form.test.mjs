import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import test from "node:test";
import { loadModule } from "./helpers/load-module.mjs";

function nodes(tree, predicate) {
  if (!tree || typeof tree !== "object") return [];
  if (Array.isArray(tree)) return tree.flatMap((child) => nodes(child, predicate));
  return [...(predicate(tree) ? [tree] : []), ...nodes(tree.props?.children, predicate)];
}

async function formHarness({ enabled = false, reply = async () => Response.json({ ok: true, id: 10, replayed: false }) } = {}) {
  const state = [], refs = [], effects = [], pending = [], requests = [], events = [], storage = new Map();
  let s = 0, r = 0, e = 0;
  const Form = (await loadModule("components/OrderForm.jsx", {
    react: {
      useState(initial) {
        const index = s++;
        if (!(index in state)) state[index] = typeof initial === "function" ? initial() : initial;
        return [state[index], (next) => { state[index] = typeof next === "function" ? next(state[index]) : next; }];
      },
      useRef(initial) { const index = r++; return refs[index] ||= { current: initial }; },
      useEffect(fn, deps) {
        const index = e++;
        if (!effects[index] || deps.some((v, i) => v !== effects[index][i])) { pending.push(fn); effects[index] = deps; }
      },
    },
    "./ProductImage": () => null, "./TurnstileChallenge": () => null,
    "@/lib/fbpixel": { track: (...args) => events.push(args), trackCustom: (...args) => events.push(args) },
  }, {
    crypto: webcrypto, AbortController, Uint8Array,
    sessionStorage: { getItem: (key) => storage.get(key) || null, setItem: (key, value) => storage.set(key, value), removeItem: (key) => storage.delete(key) },
    window: { confirm: () => true },
    fetch: async (url, options) => {
      if (url === "/api/checkout/config") return Response.json({ ok: true, enabled, siteKey: "public" });
      requests.push(JSON.parse(options.body));
      return reply(requests.length);
    },
  })).default;
  function render() {
    s = r = e = 0;
    return Form({ product: { slug: "test", name: "Test", price: 1000, sizes: ["48"], variants: [{ name: "Full", price: 1000 }] }, settings: { delivery: { insideDhaka: 60, outsideDhaka: 120 } } });
  }
  let tree = render();
  for (const effect of pending.splice(0)) effect();
  await new Promise(setImmediate);
  tree = render();
  for (const [placeholder, value] of [["আপনার নাম", "Buyer"], ["মোবাইল নাম্বার (১১ ডিজিট, যেমন 01712345678)", "01700000000"], ["সম্পূর্ণ ঠিকানা (গ্রাম/বাসা, থানা, জেলা)", "Address"]]) {
    nodes(tree, (n) => n.props?.placeholder === placeholder)[0].props.onChange({ target: { value } });
  }
  const submit = () => nodes(render(), (n) => n.type === "form")[0].props.onSubmit({ preventDefault() {} });
  return { render, submit, requests, events, storage };
}

test("checkout retry keeps one request key and never fires Purchase", async () => {
  const ui = await formHarness({ reply: async (count) => {
    if (count === 1) throw new Error("response lost");
    return Response.json({ ok: true, id: 10, replayed: true });
  } });
  await ui.submit();
  assert.equal(ui.storage.size, 1);
  assert.ok(![...ui.storage.values()][0].includes("01700000000"));
  await ui.submit();
  assert.equal(ui.requests[0].requestKey, ui.requests[1].requestKey);
  assert.equal(ui.storage.size, 0);
  assert.equal(ui.events.filter((event) => event[0] === "Purchase").length, 0);
  assert.equal(ui.events.filter((event) => event[0] === "OrderSubmitted").length, 0);
});

test("successful fresh order fires OrderSubmitted, not Purchase", async () => {
  const ui = await formHarness();
  await ui.submit();
  assert.equal(ui.requests.length, 1);
  assert.equal(ui.events[0][0], "OrderSubmitted");
});

test("enabled Turnstile prevents submission without token", async () => {
  const ui = await formHarness({ enabled: true });
  await ui.submit();
  assert.equal(ui.requests.length, 0);
  assert.ok(nodes(ui.render(), (n) => n.props?.role === "alert").length);
});

test("duplicate warning offers a deliberate second order with explicit confirmation", async () => {
  const ui = await formHarness({ reply: async (count) => count === 1
    ? Response.json({ ok: false, code: "duplicate_order", error: "Duplicate" }, { status: 409 })
    : Response.json({ ok: true, id: 11, replayed: false }) });
  await ui.submit();
  const repeat = nodes(ui.render(), (n) => n.type === "button" && n.props.children === "সত্যিই আরেকটি অর্ডার করতে চাই")[0];
  // The UI click handler starts the asynchronous submit; wait for its request.
  repeat.props.onClick({ preventDefault() {} });
  for (let n = 0; n < 20 && ui.requests.length < 2; n++) await new Promise(setImmediate);
  assert.equal(ui.requests[1].allowRepeat, true);
  assert.equal(ui.requests[0].requestKey, ui.requests[1].requestKey);
});
