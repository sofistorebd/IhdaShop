"use client";

import { useState } from "react";

export default function PasswordForm() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function submit(e) {
    e.preventDefault();
    setMsg("");
    if (next !== confirm) {
      setMsg("❌ নতুন পাসওয়ার্ড দুটো মিলছে না");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/admin/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current, next }),
      });
      const d = await res.json();
      if (!d.ok) throw new Error(d.error || "ব্যর্থ");
      setMsg("✅ পাসওয়ার্ড পরিবর্তন হয়েছে।");
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch (err) {
      setMsg("❌ " + err.message);
    }
    setBusy(false);
  }

  const inp =
    "w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-brand";
  const lbl = "mb-1 block text-sm font-semibold text-gray-700";

  return (
    <form onSubmit={submit} className="rounded-2xl bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-base font-bold text-ink">🔒 পাসওয়ার্ড পরিবর্তন</h2>
      {msg && (
        <div className="mb-3 rounded-lg bg-gray-50 px-3 py-2 text-sm">{msg}</div>
      )}
      <div className="space-y-4">
        <div>
          <label className={lbl}>বর্তমান পাসওয়ার্ড</label>
          <input type="password" className={inp} value={current} onChange={(e) => setCurrent(e.target.value)} required />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={lbl}>নতুন পাসওয়ার্ড</label>
            <input type="password" className={inp} value={next} onChange={(e) => setNext(e.target.value)} required />
          </div>
          <div>
            <label className={lbl}>নতুন পাসওয়ার্ড (আবার)</label>
            <input type="password" className={inp} value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
          </div>
        </div>
        <button disabled={busy}
          className="rounded-full bg-ink px-6 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60">
          {busy ? "পরিবর্তন হচ্ছে..." : "পাসওয়ার্ড পরিবর্তন করো"}
        </button>
      </div>
    </form>
  );
}
