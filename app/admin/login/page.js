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
    <div className="flex min-h-screen items-center justify-center bg-ink px-4">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-3xl bg-white p-8 shadow-xl"
      >
        <div className="mb-6 text-center">
          <span className="text-2xl">🧕</span>
          <h1 className="mt-2 text-xl font-bold text-ink">
            {site.brandName} অ্যাডমিন
          </h1>
          <p className="text-sm text-gray-500">লগইন করুন</p>
        </div>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="পাসওয়ার্ড"
          autoFocus
          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-brand"
        />
        {error && <p className="mt-2 text-sm text-brand">{error}</p>}
        <button
          disabled={loading}
          className="mt-4 w-full rounded-xl bg-brand py-3 font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
        >
          {loading ? "..." : "লগইন"}
        </button>
      </form>
    </div>
  );
}
