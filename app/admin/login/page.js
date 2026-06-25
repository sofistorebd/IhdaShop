"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { site } from "@/config";

export default function AdminLogin() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setLoading(false);
    if (res.ok) {
      router.push("/admin");
      router.refresh();
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "লগইন ব্যর্থ");
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-ink px-4">
      {/* decorative glow */}
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-brand/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-brand/20 blur-3xl" />

      <form
        onSubmit={submit}
        className="relative w-full max-w-sm rounded-3xl bg-white p-8 shadow-2xl"
      >
        <div className="mb-6 text-center">
          <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand text-3xl text-white shadow-lg">
            🧕
          </span>
          <h1 className="text-xl font-bold text-ink">{site.brandName}</h1>
          <p className="mt-1 text-sm text-gray-500">অ্যাডমিন প্যানেলে লগইন করুন</p>
        </div>
        <label className="mb-1.5 block text-sm font-semibold text-gray-700">
          পাসওয়ার্ড
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          autoFocus
          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
        />
        {error && (
          <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        )}
        <button
          disabled={loading}
          className="mt-5 w-full rounded-xl bg-brand py-3 font-semibold text-white shadow-md transition hover:bg-brand-dark disabled:opacity-60"
        >
          {loading ? "প্রবেশ করছি..." : "লগইন"}
        </button>
      </form>
    </div>
  );
}
