import { getSettingsForAdmin } from "@/lib/settings";
import { hasDb } from "@/lib/db";
import AdminNav from "@/components/admin/AdminNav";
import SettingsForm from "@/components/admin/SettingsForm";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

export default async function AdminSettingsPage() {
  const settings = await getSettingsForAdmin();

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav active="settings" />
      <main className="mx-auto max-w-3xl px-4 py-6">
        <h1 className="mb-5 text-xl font-bold text-ink">সাইট সেটিংস</h1>
        {!hasDb() && (
          <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            ⚠️ DATABASE_URL সেট করা নেই — সেটিংস সেভ হবে না।
          </p>
        )}
        <SettingsForm initial={settings} />
      </main>
    </div>
  );
}
