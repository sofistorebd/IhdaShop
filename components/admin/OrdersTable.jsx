"use client";

import { useState } from "react";

const STATUS_LABEL = {
  pending: { text: "পেন্ডিং", cls: "bg-amber-100 text-amber-700" },
  confirmed: { text: "কনফার্মড", cls: "bg-blue-100 text-blue-700" },
  sent_to_courier: { text: "কুরিয়ারে", cls: "bg-green-100 text-green-700" },
  delivered: { text: "ডেলিভারড", cls: "bg-emerald-100 text-emerald-700" },
  cancelled: { text: "বাতিল", cls: "bg-red-100 text-red-700" },
};

export default function OrdersTable({ initialOrders, steadfastReady }) {
  const [orders, setOrders] = useState(initialOrders);
  const [busy, setBusy] = useState(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [selected, setSelected] = useState(() => new Set());

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
      prev.size === orders.length ? new Set() : new Set(orders.map((o) => o.id))
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
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
    await fetch("/api/admin/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
  }

  if (!orders.length) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-10 text-center text-gray-500">
        এখনো কোনো অর্ডার নেই।
      </div>
    );
  }

  const allChecked = selected.size === orders.length;

  return (
    <div>
      {msg && (
        <div className="mb-3 rounded-xl bg-ink px-4 py-2 text-sm text-white">{msg}</div>
      )}

      {/* bulk অ্যাকশন বার */}
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
              <th className="px-4 py-3">গ্রাহক</th>
              <th className="px-4 py-3">প্রোডাক্ট</th>
              <th className="px-4 py-3">মোট</th>
              <th className="px-4 py-3">স্ট্যাটাস</th>
              <th className="px-4 py-3">কুরিয়ার</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {orders.map((o) => {
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
                  <td className="px-4 py-3">
                    <p className="font-medium text-ink">{o.name}</p>
                    <p className="text-xs text-gray-500">{o.phone}</p>
                    <p className="mt-1 max-w-[200px] text-xs text-gray-400">{o.address}</p>
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
    </div>
  );
}
