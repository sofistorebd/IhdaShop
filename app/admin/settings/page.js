import { getSettingsForAdmin } from "@/lib/settings";
import { hasDb } from "@/lib/db";
import AdminNav from "@/components/admin/AdminNav";
import SettingsForm from "@/components/admin/SettingsForm";
import PasswordForm from "@/components/admin/PasswordForm";
import { AdminHeader } from "@/components/admin/AdminUI";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

export default async function AdminSettingsPage() {
  const settings = await getSettingsForAdmin();

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav active="settings" />
      <main className="mx-auto max-w-3xl px-4 py-6">
        <AdminHeader
          title="সাইট সেটিংস"
          subtitle="ব্র্যান্ড, রঙ, যোগাযোগ ও ইন্টিগ্রেশন — সব এক জায়গায়"
        />
        {!hasDb() && (
          <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            ⚠️ DATABASE_URL সেট করা নেই — সেটিংস সেভ হবে না।
          </p>
        )}
        <SettingsForm initial={settings} />
        <div className="mt-5">
          <PasswordForm />
        </div>
      </main>
    </div>
  );
}
