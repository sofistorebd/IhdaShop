"use client";

import { useState } from "react";

const STATUS_LABEL = {
  inreview: { text: "In Review", cls: "bg-purple-100 text-purple-700" },
  pending: { text: "পেন্ডিং", cls: "bg-amber-100 text-amber-700" },
  confirmed: { text: "কনফার্মড", cls: "bg-blue-100 text-blue-700" },
  sent_to_courier: { text: "কুরিয়ারে", cls: "bg-green-100 text-green-700" },
  delivered: { text: "ডেলিভারড", cls: "bg-emerald-100 text-emerald-700" },
  cancelled: { text: "বাতিল", cls: "bg-red-100 text-red-700" },
};

function formatOrderDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("bn-BD", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Dhaka",
  }).format(date);
}

export default function OrdersTable({ initialOrders, steadfastReady, delivery }) {
  const [orders, setOrders] = useState(initialOrders);
  const [busy, setBusy] = useState(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [selected, setSelected] = useState(() => new Set());
  const [editing, setEditing] = useState(null); // যে অর্ডারটি এডিট হচ্ছে
  const reviewOrders = orders.filter((o) => o.status === "inreview");
  const activeOrders = orders.filter((o) => o.status !== "inreview");

  function onSaved(updated) {
    setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
    setEditing(null);
    setMsg(`✅ অর্ডার #${updated.id} আপডেট হয়েছে`);
  }

  const bdt = (n) => "৳" + Number(n).toLocaleString("bn-BD");

  function toggle(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }
  function toggleAll() {
    setSelected((prev) =>
      prev.size === activeOrders.length ? new Set() : new Set(activeOrders.map((o) => o.id))
    );
  }

  function applyResults(results) {
    setOrders((prev) =>
      prev.map((o) => {
        const r = results.find((x) => x.id === o.id && x.ok && x.consignment_id);
        return r
          ? {
              ...o,
              status: "sent_to_courier",
              consignment_id: r.consignment_id,
              tracking_code: r.tracking_code,
            }
          : o;
      })
    );
  }

  async function sendToSteadfast(id) {
    setBusy(id);
    setMsg("");
    try {
      const res = await fetch("/api/admin/steadfast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const d = await res.json();
      if (!res.ok || !d.ok) throw new Error(d.error || "ব্যর্থ");
      applyResults([{ id, ok: true, ...d }]);
      setMsg(`✅ পাঠানো হয়েছে — Consignment: ${d.consignment_id}`);
    } catch (err) {
      setMsg("❌ " + err.message);
    } finally {
      setBusy(null);
    }
  }

  async function bulkSend() {
    const ids = [...selected];
    if (!ids.length) return;
    setBulkBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/admin/steadfast/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      const d = await res.json();
      if (!res.ok || !d.ok) throw new Error(d.error || "ব্যর্থ");
      applyResults(d.results);
      setMsg(`✅ ${d.sent}টি পাঠানো হয়েছে${d.failed ? `, ${d.failed}টি ব্যর্থ` : ""}।`);
    } catch (err) {
      setMsg("❌ " + err.message);
    } finally {
      setBulkBusy(false);
    }
  }

  function printLabels() {
    const ids = orders
      .filter((o) => selected.has(o.id) && o.consignment_id)
      .map((o) => o.id);
    if (!ids.length) {
      setMsg("❌ লেবেল প্রিন্ট করতে আগে কুরিয়ারে পাঠানো অর্ডার নির্বাচন করো।");
      return;
    }
    window.open(`/admin/labels?ids=${ids.join(",")}`, "_blank");
  }

  async function changeStatus(id, status) {
    const prevStatus = orders.find((o) => o.id === id)?.status;
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
    try {
      const res = await fetch("/api/admin/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (!res.ok) throw new Error();
    } catch {
      // ব্যর্থ হলে আগের status ফিরিয়ে আনি — নাহলে UI ভুল দেখায়
      setOrders((prev) =>
        prev.map((o) => (o.id === id ? { ...o, status: prevStatus } : o))
      );
      setMsg("❌ স্ট্যাটাস সেভ হয়নি — আবার চেষ্টা করো।");
    }
  }

  if (!orders.length) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-10 text-center text-gray-500">
        এখনো কোনো অর্ডার নেই।
      </div>
    );
  }

  const allChecked = activeOrders.length > 0 && selected.size === activeOrders.length;

  return (
    <div>
      {msg && (
        <div className="mb-3 rounded-xl bg-ink px-4 py-2 text-sm text-white">{msg}</div>
      )}

      {/* bulk অ্যাকশন বার */}
      {reviewOrders.length > 0 && (
        <section className="mb-5 rounded-2xl border border-purple-200 bg-purple-50 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-base font-bold text-purple-900">In Review</h2>
            <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-700">{reviewOrders.length} pending verification</span>
          </div>
          <div className="space-y-2">
            {reviewOrders.map((o) => (
              <div key={o.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-white px-3 py-3 text-sm shadow-sm">
                <span className="font-semibold text-purple-900">#{o.id}</span>
                <span className="font-medium text-ink">{o.name}</span>
                <span className="text-gray-600">{o.phone}</span>
                <span className="min-w-[180px] flex-1 text-gray-600">{o.product}</span>
                <span className="text-xs text-gray-500">{formatOrderDateTime(o.created_at)}</span>
                <button onClick={() => changeStatus(o.id, "pending")} className="rounded-full bg-purple-700 px-4 py-1.5 text-xs font-semibold text-white hover:bg-purple-800">Confirm -&gt; Pending</button>
              </div>
            ))}
          </div>
        </section>
      )}

      {selected.size > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-3 rounded-xl border border-brand bg-brand-light px-4 py-2.5">
          <span className="text-sm font-semibold text-brand-dark">
            {selected.size.toLocaleString("bn-BD")}টি নির্বাচিত
          </span>
          <button
            disabled={!steadfastReady || bulkBusy}
            onClick={bulkSend}
            className="rounded-full bg-brand px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-40"
            title={steadfastReady ? "" : "Steadfast API key সেট করা নেই"}
          >
            {bulkBusy ? "পাঠানো হচ্ছে..." : "🚚 Steadfast এ পাঠাও"}
          </button>
          <button
            onClick={printLabels}
            className="rounded-full border border-brand bg-white px-4 py-1.5 text-sm font-semibold text-brand hover:bg-brand-light"
          >
            🖨️ লেবেল প্রিন্ট (৫০×৭৫mm)
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="ml-auto text-sm text-gray-500 hover:text-ink"
          >
            বাতিল
          </button>
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm">
        <table className="w-full min-w-[880px] text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-3 py-3">
                <input
                  type="checkbox"
                  checked={allChecked}
                  onChange={toggleAll}
                  className="h-4 w-4 accent-brand"
                  aria-label="সব নির্বাচন"
                />
              </th>
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">{"\u09a4\u09be\u09b0\u09bf\u0996 \u0993 \u09b8\u09ae\u09af\u09bc"}</th>
              <th className="px-4 py-3">গ্রাহক</th>
              <th className="px-4 py-3">প্রোডাক্ট</th>
              <th className="px-4 py-3">মোট</th>
              <th className="px-4 py-3">স্ট্যাটাস</th>
              <th className="px-4 py-3">কুরিয়ার</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {activeOrders.map((o) => {
              const st = STATUS_LABEL[o.status] || STATUS_LABEL.pending;
              const checked = selected.has(o.id);
              return (
                <tr key={o.id} className={`align-top ${checked ? "bg-brand-light/40" : ""}`}>
                  <td className="px-3 py-3">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(o.id)}
                      className="h-4 w-4 accent-brand"
                      aria-label={`অর্ডার ${o.id}`}
                    />
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-700">{o.id}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">{formatOrderDateTime(o.created_at)}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-ink">{o.name}</p>
                    <p className="text-xs text-gray-500">{o.phone}</p>
                    <p className="mt-1 max-w-[200px] text-xs text-gray-400">{o.address}</p>
                    <button
                      onClick={() => setEditing(o)}
                      className="mt-1 text-xs font-semibold text-brand hover:underline"
                    >
                      ✏️ এডিট
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-gray-700">{o.product}</p>
                    <p className="text-xs text-gray-500">
                      {o.size} · {o.qty}টি
                    </p>
                    <p className="text-xs text-gray-400">{o.area}</p>
                  </td>
                  <td className="px-4 py-3 font-semibold text-ink">{bdt(o.total)}</td>
                  <td className="px-4 py-3">
                    <select
                      value={o.status}
                      onChange={(e) => changeStatus(o.id, e.target.value)}
                      className={`rounded-full px-2 py-1 text-xs font-semibold ${st.cls}`}
                    >
                      {Object.entries(STATUS_LABEL).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v.text}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    {o.consignment_id ? (
                      <div className="text-xs">
                        <p className="font-semibold text-green-700">পাঠানো ✓</p>
                        <p className="text-gray-600">CN: {o.consignment_id}</p>
                        {o.tracking_code && (
                          <p className="text-gray-400">ট্র্যাকিং: {o.tracking_code}</p>
                        )}
                      </div>
                    ) : (
                      <button
                        disabled={!steadfastReady || busy === o.id}
                        onClick={() => sendToSteadfast(o.id)}
                        title={steadfastReady ? "" : "Steadfast API key সেট করা নেই"}
                        className="rounded-full bg-brand px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {busy === o.id ? "..." : "Steadfast এ পাঠান"}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {editing && (
        <EditOrderModal
          order={editing}
          delivery={delivery}
          onClose={() => setEditing(null)}
          onSaved={onSaved}
        />
      )}
    </div>
  );
}

// ---- অর্ডার এডিট মডাল ----
function EditOrderModal({ order, delivery, onClose, onSaved }) {
  const dc0 = Number(order.delivery_charge) || 0;
  const [f, setF] = useState({
    name: order.name || "",
    phone: order.phone || "",
    address: order.address || "",
    product: order.product || "",
    size: order.size || "",
    qty: order.qty || 1,
    area: order.area || "",
    deliveryCharge: dc0,
    subtotal: (Number(order.total) || 0) - dc0, // প্রোডাক্টের দাম (ডেলিভারি বাদে)
  });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const total = (Number(f.subtotal) || 0) + (Number(f.deliveryCharge) || 0);
  const bdt = (n) => "৳" + Number(n).toLocaleString("bn-BD");

  // এরিয়া বদলালে ডেলিভারি চার্জ অটো (সেটিংস থেকে)
  function pickArea(area) {
    let dc = f.deliveryCharge;
    if (delivery) {
      if (area === "ঢাকার ভিতরে") dc = delivery.insideDhaka;
      else if (area === "ঢাকার বাইরে") dc = delivery.outsideDhaka;
    }
    setF((p) => ({ ...p, area, deliveryCharge: dc }));
  }

  async function save() {
    if (!f.name || !f.phone || !f.address) return setErr("নাম, ফোন, ঠিকানা দরকার");
    const digits = String(f.phone).replace(/\D/g, "").replace(/^88/, "");
    if (!/^01\d{9}$/.test(digits)) return setErr("সঠিক ১১ ডিজিটের মোবাইল নাম্বার দিন");
    setBusy(true);
    setErr("");
    try {
      const res = await fetch(`/api/admin/orders/${order.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: f.name,
          phone: f.phone,
          address: f.address,
          product: f.product,
          size: f.size,
          qty: Number(f.qty) || 1,
          area: f.area,
          deliveryCharge: Number(f.deliveryCharge) || 0,
          total,
        }),
      });
      const d = await res.json();
      if (!res.ok || !d.ok) throw new Error(d.error || "ব্যর্থ");
      onSaved(d.order);
    } catch (e) {
      setErr("❌ " + e.message);
      setBusy(false);
    }
  }

  const inp = "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand";
  const lbl = "mb-1 block text-xs font-semibold text-gray-600";
  const areas = ["ঢাকার ভিতরে", "ঢাকার বাইরে"];
  if (f.area && !areas.includes(f.area)) areas.push(f.area);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
      <div className="my-8 w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-ink">অর্ডার #{order.id} এডিট</h3>
          <button onClick={onClose} className="text-xl text-gray-400 hover:text-ink">✕</button>
        </div>

        {err && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{err}</p>}
        {order.consignment_id && (
          <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
            ⚠️ এটি কুরিয়ারে পাঠানো হয়ে গেছে — এখানে বদলালে শুধু রেকর্ডে বদলাবে, কুরিয়ারে নয়।
          </p>
        )}

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>নাম</label>
              <input className={inp} value={f.name} onChange={(e) => set("name", e.target.value)} />
            </div>
            <div>
              <label className={lbl}>ফোন</label>
              <input className={inp} value={f.phone} onChange={(e) => set("phone", e.target.value)} inputMode="tel" />
            </div>
          </div>

          <div>
            <label className={lbl}>ঠিকানা</label>
            <textarea rows={2} className={inp} value={f.address} onChange={(e) => set("address", e.target.value)} />
          </div>

          <div>
            <label className={lbl}>প্রোডাক্ট</label>
            <input className={inp} value={f.product} onChange={(e) => set("product", e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>সাইজ</label>
              <input className={inp} value={f.size} onChange={(e) => set("size", e.target.value)} />
            </div>
            <div>
              <label className={lbl}>পরিমাণ</label>
              <input type="number" min="1" className={inp} value={f.qty} onChange={(e) => set("qty", e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>ডেলিভারি এলাকা</label>
              <select className={inp} value={f.area} onChange={(e) => pickArea(e.target.value)}>
                <option value="">— নির্বাচন —</option>
                {areas.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={lbl}>ডেলিভারি চার্জ (৳)</label>
              <input type="number" className={inp} value={f.deliveryCharge} onChange={(e) => set("deliveryCharge", e.target.value)} />
            </div>
          </div>

          <div>
            <label className={lbl}>প্রোডাক্টের দাম / সাবটোটাল (৳)</label>
            <input type="number" className={inp} value={f.subtotal} onChange={(e) => set("subtotal", e.target.value)} />
          </div>

          <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm">
            <span className="font-semibold text-gray-600">সর্বমোট (অটো)</span>
            <span className="text-base font-bold text-ink">{bdt(total)}</span>
          </div>
        </div>

        <div className="mt-5 flex gap-3">
          <button
            disabled={busy}
            onClick={save}
            className="flex-1 rounded-full bg-brand py-2.5 font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
          >
            {busy ? "সেভ হচ্ছে..." : "সেভ করো"}
          </button>
          <button
            onClick={onClose}
            className="rounded-full border border-gray-300 px-6 py-2.5 font-semibold text-gray-600"
          >
            বাতিল
          </button>
        </div>
      </div>
    </div>
  );
}
