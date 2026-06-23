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
  const [msg, setMsg] = useState("");

  const bdt = (n) => "৳" + Number(n).toLocaleString("bn-BD");

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
      setOrders((prev) =>
        prev.map((o) =>
          o.id === id
            ? {
                ...o,
                status: "sent_to_courier",
                consignment_id: d.consignment_id,
                tracking_code: d.tracking_code,
              }
            : o
        )
      );
      setMsg(`✅ Steadfast এ পাঠানো হয়েছে — ট্র্যাকিং: ${d.tracking_code}`);
    } catch (err) {
      setMsg("❌ " + err.message);
    } finally {
      setBusy(null);
    }
  }

  async function changeStatus(id, status) {
    setOrders((prev) =>
      prev.map((o) => (o.id === id ? { ...o, status } : o))
    );
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

  return (
    <div>
      {msg && (
        <div className="mb-3 rounded-xl bg-ink px-4 py-2 text-sm text-white">
          {msg}
        </div>
      )}
      <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
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
              return (
                <tr key={o.id} className="align-top">
                  <td className="px-4 py-3 font-semibold text-gray-700">
                    {o.id}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-ink">{o.name}</p>
                    <p className="text-xs text-gray-500">{o.phone}</p>
                    <p className="mt-1 max-w-[200px] text-xs text-gray-400">
                      {o.address}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-gray-700">{o.product}</p>
                    <p className="text-xs text-gray-500">
                      {o.size} · {o.color} · {o.qty}টি
                    </p>
                    <p className="text-xs text-gray-400">{o.area}</p>
                  </td>
                  <td className="px-4 py-3 font-semibold text-ink">
                    {bdt(o.total)}
                  </td>
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
                        <p className="text-gray-500">
                          ট্র্যাকিং: {o.tracking_code}
                        </p>
                      </div>
                    ) : (
                      <button
                        disabled={!steadfastReady || busy === o.id}
                        onClick={() => sendToSteadfast(o.id)}
                        title={
                          steadfastReady
                            ? ""
                            : "Steadfast API key সেট করা নেই"
                        }
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
