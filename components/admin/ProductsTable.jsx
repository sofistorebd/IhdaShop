"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ProductsTable({ initial }) {
  const [products, setProducts] = useState(initial);
  const [busy, setBusy] = useState(null);
  const router = useRouter();
  const bdt = (n) => "৳" + Number(n).toLocaleString("bn-BD");

  async function remove(id, name) {
    if (!confirm(`"${name}" মুছে ফেলবে?`)) return;
    setBusy(id);
    await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
    setProducts((p) => p.filter((x) => x.id !== id));
    setBusy(null);
    router.refresh();
  }

  if (!products.length) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-10 text-center text-gray-500">
        কোনো প্রোডাক্ট নেই। উপরে থেকে যোগ করো।
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="bg-gray-50 text-xs uppercase text-gray-500">
          <tr>
            <th className="px-4 py-3">ছবি</th>
            <th className="px-4 py-3">নাম</th>
            <th className="px-4 py-3">দাম</th>
            <th className="px-4 py-3">স্ট্যাটাস</th>
            <th className="px-4 py-3 text-right">অ্যাকশন</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {products.map((p) => (
            <tr key={p.id ?? p.slug}>
              <td className="px-4 py-3">
                <div className="h-12 w-12 overflow-hidden rounded-lg bg-gray-100">
                  {p.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.image} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-lg">🧕</div>
                  )}
                </div>
              </td>
              <td className="px-4 py-3">
                <p className="font-medium text-ink">{p.name}</p>
                <p className="text-xs text-gray-400">/{p.slug}</p>
              </td>
              <td className="px-4 py-3 font-semibold text-brand">{bdt(p.price)}</td>
              <td className="px-4 py-3">
                {p.active ? (
                  <span className="rounded-full bg-green-100 px-2 py-1 text-xs text-green-700">দৃশ্যমান</span>
                ) : (
                  <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-500">লুকানো</span>
                )}
              </td>
              <td className="px-4 py-3">
                <div className="flex justify-end gap-2">
                  <Link href={`/admin/products/${p.id}`}
                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:border-brand hover:text-brand">
                    এডিট
                  </Link>
                  <button disabled={busy === p.id} onClick={() => remove(p.id, p.name)}
                    className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50">
                    {busy === p.id ? "..." : "মুছো"}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
