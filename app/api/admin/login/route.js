import { cookies } from "next/headers";
import { ADMIN_COOKIE, sessionToken } from "@/lib/auth";
import { verifyAdminPassword } from "@/lib/admin-auth";

export async function POST(req) {
  const { password } = await req.json().catch(() => ({}));

  const token = await sessionToken();
  if (!token) {
    return Response.json(
      { ok: false, error: "সার্ভারে ENCRYPTION_KEY সেট করা নেই — Vercel env এ যোগ করো।" },
      { status: 500 }
    );
  }

  const ok = await verifyAdminPassword(password);
  if (!ok) {
    return Response.json({ ok: false, error: "ভুল পাসওয়ার্ড" }, { status: 401 });
  }

  const jar = await cookies();
  jar.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // ৭ দিন
  });
  return Response.json({ ok: true });
}
