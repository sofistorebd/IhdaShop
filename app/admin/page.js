import { createHash } from "node:crypto";
import { getOrderDashboard, hasDb } from "@/lib/db";
import { attachCheckoutInfo } from "@/lib/checkout-db";
import { getSettings } from "@/lib/settings";
import { steadfastReady } from "@/lib/steadfast";
import OrdersTable from "@/components/admin/OrdersTable";
import AdminNav from "@/components/admin/AdminNav";
import { AdminHeader, StatCard } from "@/components/admin/AdminUI";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

export default async function AdminPage({ searchParams }) {
  const filters = (await searchParams) || {};
  let dashboard = null;
  let dbError = false;
  if (hasDb()) {
    try {
      dashboard = await getOrderDashboard({ status: filters.status, page: filters.page });
      dashboard.orders = await attachCheckoutInfo(dashboard.orders);
    } catch {
      dbError = true;
    }
  }

  const stats = dashboard?.stats || {};
  const bn = (n) => n == null ? "—" : Number(n).toLocaleString("bn-BD");
  const bdt = (n) => n == null ? "—" : "৳" + bn(n);
  const [sfReady, site] = await Promise.all([steadfastReady(), getSettings()]);
  // Refreshes must replace local row/selection state, not retain an old page.
  const snapshotKey = dashboard ? createHash("sha256").update(JSON.stringify(dashboard)).digest("hex") : "empty";

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav active="orders" />

      <main className="mx-auto max-w-6xl px-4 py-6">
        <AdminHeader title="ড্যাশবোর্ড" subtitle="অর্ডার দেখুন, কুরিয়ারে পাঠান, লেবেল প্রিন্ট করুন" />

        {!hasDb() && (
          <Banner>⚠️ DATABASE_URL সেট করা নেই — অর্ডার দেখা যাবে না।</Banner>
        )}
        {dbError && <Banner>⚠️ ডেটাবেজে সংযোগ ব্যর্থ।</Banner>}
        {!sfReady && (
          <Banner>ℹ️ Steadfast API key সেট করা নেই — সেটিংসে যোগ করুন।</Banner>
        )}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatCard icon="🧾" label="মোট অর্ডার" value={bn(stats.total)} tone="ink" />
          <StatCard icon="⏳" label="পেন্ডিং" value={bn(stats.pending)} tone="amber" />
          <StatCard icon="🚚" label="কুরিয়ারে" value={bn(stats.sent)} tone="green" />
          <StatCard icon="💰" label="ডেলিভারি হওয়া অর্ডারের মূল্য" value={bdt(stats.revenue)} tone="brand" />
          <StatCard label="চলমান অর্ডারের মূল্য" value={bdt(stats.openValue)} tone="amber" />
          <StatCard label="কুরিয়ারের হিসাবে প্রাপ্ত টাকা" value={bdt(stats.settled)} tone="green" />
        </div>

        <div className="mt-6">
          {dashboard && <OrdersTable key={snapshotKey} initialOrders={dashboard.orders} pagination={dashboard.pagination} steadfastReady={sfReady} delivery={site.delivery} />}
        </div>
      </main>
    </div>
  );
}

function Banner({ children }) {
  return (
    <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
      {children}
    </div>
  );
}
