import AdminNav from "@/components/admin/AdminNav";
import { AdminHeader } from "@/components/admin/AdminUI";
import AnalyticsView from "@/components/admin/AnalyticsView";
import RangePicker from "@/components/admin/RangePicker";
import { getVisitorStats } from "@/lib/analytics-db";
import { getOrderStats, hasDb } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

const PRESET_LABELS = { 1: "আজ", 7: "৭ দিন", 30: "৩০ দিন", 90: "৯০ দিন", 365: "১ বছর" };

// searchParams → { from, to, label, current } (ডিফল্ট ৩০ দিন)
function resolveRange(sp) {
  const parse = (s) => {
    const d = s ? new Date(s) : null;
    return d && !Number.isNaN(d.getTime()) ? d : null;
  };
  const fromD = parse(sp?.from);
  const toD = parse(sp?.to);
  if (fromD && toD) {
    toD.setHours(23, 59, 59, 999);
    return { from: fromD, to: toD, label: `${sp.from} — ${sp.to}`, current: "custom" };
  }
  let days = Number(sp?.range);
  if (!days || days < 1) days = 30;
  const now = new Date();
  const from = days === 1 ? new Date(new Date().setHours(0, 0, 0, 0)) : new Date(now - days * 86400000);
  return { from, to: now, label: PRESET_LABELS[days] || `${days} দিন`, current: String(days) };
}

export default async function AnalyticsPage({ searchParams }) {
  const sp = (await searchParams) || {};
  const range = resolveRange(sp);

  let visitors = null;
  let orders = null;
  if (hasDb()) {
    try {
      [visitors, orders] = await Promise.all([
        getVisitorStats({ from: range.from, to: range.to }),
        getOrderStats({ from: range.from, to: range.to }),
      ]);
    } catch {
      /* খালি দেখাবে */
    }
  }
  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav active="analytics" />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <AdminHeader
          title="অ্যানালিটিক্স"
          subtitle="ভিজিটর, বিক্রি ও অর্ডারের সারসংক্ষেপ"
        />
        {!hasDb() ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            ⚠️ DATABASE_URL সেট করা নেই।
          </p>
        ) : (
          <>
            <RangePicker current={range.current} />
            <AnalyticsView visitors={visitors} orders={orders} rangeLabel={range.label} />
          </>
        )}
      </main>
    </div>
  );
}
