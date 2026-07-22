import AdminNav from "@/components/admin/AdminNav";
import { AdminHeader } from "@/components/admin/AdminUI";
import AnalyticsView from "@/components/admin/AnalyticsView";
import { getVisitorStats } from "@/lib/analytics-db";
import { getOrderStats } from "@/lib/db";
import { hasDb } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

export default async function AnalyticsPage() {
  let visitors = null;
  let orders = null;
  if (hasDb()) {
    try {
      [visitors, orders] = await Promise.all([getVisitorStats(), getOrderStats()]);
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
          <AnalyticsView visitors={visitors} orders={orders} />
        )}
      </main>
    </div>
  );
}
