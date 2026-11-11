import AdminNav from "@/components/admin/AdminNav";
import BackupPanel from "@/components/admin/BackupPanel";
import { AdminHeader } from "@/components/admin/AdminUI";
import { getBackupStatus } from "@/lib/backup-db";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

export default async function AdminBackupsPage({ searchParams }) {
  const query = await searchParams;
  let status;
  try {
    status = await getBackupStatus();
  } catch (error) {
    status = {
      connected: false,
      ready: false,
      server: { database: true, googleOAuth: false, encryption: false },
      lastError: error?.message || "Backup status পাওয়া যায়নি",
    };
  }
  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav active="backups" />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <AdminHeader title="Automatic Backup" subtitle="Google Drive-এ প্রতিদিন encrypted backup—সর্বশেষ ৭টি রাখা হবে" />
        <BackupPanel
          initialStatus={status}
          autoRun={query?.connected === "1"}
          connectionError={query?.error || ""}
        />
      </main>
    </div>
  );
}
