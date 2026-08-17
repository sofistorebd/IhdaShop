import { listOrders, hasDb } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { steadfastReady } from "@/lib/steadfast";
import OrdersTable from "@/components/admin/OrdersTable";
import AdminNav from "@/components/admin/AdminNav";
import { AdminHeader, StatCard } from "@/components/admin/AdminUI";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

export default async function AdminPage() {
  let orders = [];
  let dbError = false;
  if (hasDb()) {
    try {
      orders = await listOrders();
    } catch {
      dbError = true;
    }
  }

  const stats = {
    total: orders.length,
    pending: orders.filter((o) => o.status === "pending").length,
    sent: orders.filter((o) => o.status === "sent_to_courier").length,
    revenue: orders.reduce((s, o) => s + (Number(o.total) || 0), 0),
  };
  const bn = (n) => Number(n).toLocaleString("bn-BD");
  const bdt = (n) => "৳" + bn(n);
  const sfReady = await steadfastReady();
  const site = await getSettings();

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

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard icon="🧾" label="মোট অর্ডার" value={bn(stats.total)} tone="ink" />
          <StatCard icon="⏳" label="পেন্ডিং" value={bn(stats.pending)} tone="amber" />
          <StatCard icon="🚚" label="কুরিয়ারে" value={bn(stats.sent)} tone="green" />
          <StatCard icon="💰" label="মোট বিক্রি" value={bdt(stats.revenue)} tone="brand" />
        </div>

        <div className="mt-6">
          <OrdersTable initialOrders={orders} steadfastReady={sfReady} delivery={site.delivery} />
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
