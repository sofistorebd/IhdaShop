"use client";

import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();
  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }
  return (
    <button
      onClick={logout}
      className="rounded-full border border-gray-300 px-4 py-1.5 text-sm text-gray-600 transition hover:border-red-300 hover:bg-red-50 hover:text-red-600"
    >
      লগআউট
    </button>
  );
}
