"use client";

import { useEffect, useRef, useState } from "react";

const ACTION_HEADERS = { "x-admin-action": "google-drive-backup" };

function dateTime(value) {
  if (!value) return "এখনো হয়নি";
  return new Intl.DateTimeFormat("bn-BD", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Dhaka",
  }).format(new Date(value));
}

function fileSize(bytes) {
  const value = Number(bytes) || 0;
  if (!value) return "—";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  return `${(value / (1024 ** index)).toLocaleString("bn-BD", { maximumFractionDigits: 1 })} ${units[index]}`;
}

export default function BackupPanel({ initialStatus, autoRun = false, connectionError = "" }) {
  const [status, setStatus] = useState(initialStatus);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(connectionError ? "Google Drive connect করা যায়নি। আবার চেষ্টা করুন।" : "");
  const autoStarted = useRef(false);

  async function refreshStatus() {
    const response = await fetch("/api/admin/google-drive/status", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok || !data.ok) throw new Error(data.error || "Status পাওয়া যায়নি");
    setStatus(data.status);
    return data.status;
  }

  async function runBackup() {
    if (busy || !status.connected) return;
    setBusy(true);
    setMessage("Database ও uploaded files যাচাই করে Google Drive-এ পাঠানো হচ্ছে…");
    try {
      const response = await fetch("/api/admin/google-drive/run", {
        method: "POST",
        headers: ACTION_HEADERS,
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || "Backup ব্যর্থ");
      await refreshStatus();
      setMessage(data.warning ? `Backup সফল। সতর্কতা: ${data.warning}` : "Backup সফলভাবে Google Drive-এ সংরক্ষণ হয়েছে।");
    } catch (error) {
      await refreshStatus().catch(() => {});
      setMessage(`Backup ব্যর্থ: ${error.message}`);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (autoRun && status.connected && !autoStarted.current) {
      autoStarted.current = true;
      runBackup();
    }
    // OAuth callback-এর পর একবারই প্রথম backup চালানো হয়।
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRun, status.connected]);

  async function disconnect() {
    if (busy || !window.confirm("Google Drive disconnect করবেন? Drive-এ থাকা backup file delete হবে না।")) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/google-drive/disconnect", {
        method: "DELETE",
        headers: ACTION_HEADERS,
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || "Disconnect ব্যর্থ");
      await refreshStatus();
      setMessage("Google Drive disconnect হয়েছে। Drive-এর আগের backup file অপরিবর্তিত আছে।");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  const missing = [
    !status.server?.database && "DATABASE_URL",
    !status.server?.googleOAuth && "GOOGLE_CLIENT_ID ও GOOGLE_CLIENT_SECRET",
    !status.server?.encryption && "BACKUP_ENCRYPTION_KEY অথবা ENCRYPTION_KEY",
  ].filter(Boolean);
  const nextBackup = status.lastSuccessAt
    ? new Date(new Date(status.lastSuccessAt).getTime() + 24 * 60 * 60 * 1000)
    : null;

  return (
    <div className="space-y-5">
      {message && <div role="status" className="rounded-xl bg-ink px-4 py-3 text-sm text-white">{message}</div>}

      {missing.length > 0 && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <h2 className="font-bold text-amber-900">Coolify configuration দরকার</h2>
          <p className="mt-1 text-sm text-amber-800">নিচের environment variable সেট করে redeploy করুন:</p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-amber-900">
            {missing.map((item) => <li key={item}>{item}</li>)}
          </ul>
          <p className="mt-3 text-xs text-amber-700">Google OAuth redirect URI: <code className="break-all">https://আপনার-domain/api/admin/google-drive/callback</code></p>
        </section>
      )}

      <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-ink">Google Drive</h2>
            {status.connected ? (
              <p className="mt-1 text-sm text-emerald-700">সংযুক্ত: {status.email || "Google account"}</p>
            ) : (
              <p className="mt-1 text-sm text-gray-500">Google account connect করলে প্রতিদিন automatic backup হবে।</p>
            )}
          </div>
          {status.connected ? (
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={runBackup} disabled={busy || status.running || !status.ready} className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                {busy || status.running ? "Backup চলছে…" : "Backup Now"}
              </button>
              <button type="button" onClick={disconnect} disabled={busy || status.running} className="rounded-full border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 disabled:opacity-50">Disconnect</button>
            </div>
          ) : (
            <a href="/api/admin/google-drive/connect" aria-disabled={!status.ready} onClick={(event) => { if (!status.ready) event.preventDefault(); }} className={`rounded-full px-5 py-2.5 text-sm font-semibold text-white ${status.ready ? "bg-blue-600 hover:bg-blue-700" : "cursor-not-allowed bg-gray-300"}`}>Google account দিয়ে Connect করুন</a>
          )}
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Info label="সর্বশেষ সফল backup" value={dateTime(status.lastSuccessAt)} />
        <Info label="পরবর্তী backup" value={nextBackup ? dateTime(nextBackup) : "Connect করার পর শুরু হবে"} />
        <Info label="Drive-এ রাখা backup" value={`${Number(status.retainedCount || 0).toLocaleString("bn-BD")} / ৭`} />
        <Info label="সর্বশেষ file size" value={fileSize(status.lastFileSize)} />
      </div>

      {status.lastFileName && (
        <section className="rounded-2xl border border-gray-100 bg-white p-5 text-sm shadow-sm">
          <h2 className="font-bold text-ink">সর্বশেষ backup file</h2>
          <p className="mt-2 break-all text-gray-700">{status.lastFileName}</p>
          {status.lastChecksum && <p className="mt-1 break-all text-xs text-gray-400">Google Drive MD5: {status.lastChecksum}</p>}
        </section>
      )}

      {status.lastError && (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <strong>সর্বশেষ সমস্যা:</strong> {status.lastError}
        </section>
      )}

      <section className="rounded-2xl border border-gray-100 bg-white p-5 text-sm text-gray-600 shadow-sm">
        <h2 className="font-bold text-ink">Backup policy</h2>
        <p className="mt-2">প্রতিটি backup-এ সম্পূর্ণ PostgreSQL database এবং uploaded images/files থাকবে। File server-এ encrypt ও restore-check হওয়ার পরে Drive-এ upload হবে। Upload-এর size ও checksum মেলার পরই সাতটির বেশি পুরোনো backup delete হবে।</p>
      </section>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 font-bold text-ink">{value}</p>
    </div>
  );
}
