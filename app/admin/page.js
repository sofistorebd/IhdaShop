import { listOrders, hasDb } from "@/lib/db";
import { steadfastReady } from "@/lib/steadfast";
import OrdersTable from "@/components/admin/OrdersTable";
import LogoutButton from "@/components/admin/LogoutButton";
import { site } from "@/config";

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
  const bdt = (n) => "৳" + Number(n).toLocaleString("bn-BD");

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-ink text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">🧕</span>
            <span className="font-bold">{site.brandName} — অ্যাডমিন</span>
          </div>
          <LogoutButton />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        {!hasDb() && (
          <Banner>
            ⚠️ DATABASE_URL সেট করা নেই — অর্ডার দেখা যাবে না। README দেখো।
          </Banner>
        )}
        {dbError && (
          <Banner>⚠️ ডেটাবেজে সংযোগ ব্যর্থ। DATABASE_URL যাচাই করো।</Banner>
        )}
        {!steadfastReady() && (
          <Banner>
            ℹ️ Steadfast API key সেট করা নেই — কুরিয়ার বাটন ডিজেবল থাকবে।
          </Banner>
        )}

        {/* স্ট্যাটস */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="মোট অর্ডার" value={stats.total.toLocaleString("bn-BD")} />
          <Stat label="পেন্ডিং" value={stats.pending.toLocaleString("bn-BD")} />
          <Stat label="কুরিয়ারে" value={stats.sent.toLocaleString("bn-BD")} />
          <Stat label="মোট বিক্রি" value={bdt(stats.revenue)} />
        </div>

        <div className="mt-6">
          <OrdersTable
            initialOrders={orders}
            steadfastReady={steadfastReady()}
          />
        </div>
      </main>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-ink">{value}</p>
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
