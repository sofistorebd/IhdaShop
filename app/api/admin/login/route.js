import { cookies } from "next/headers";
import { ADMIN_COOKIE, SESSION_SECONDS } from "@/lib/auth";
import { loginAdmin } from "@/lib/admin-auth";

export async function POST(req) {
  const { password } = await req.json().catch(() => ({}));

  let token;
  try { token = await loginAdmin(password); }
  catch { return Response.json({ ok: false, error: "লগইন সেবা সাময়িকভাবে বন্ধ।" }, { status: 503 }); }
  if (!token) {
    return Response.json({ ok: false, error: "ভুল পাসওয়ার্ড" }, { status: 401 });
  }

  const jar = await cookies();
  jar.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_SECONDS, // ৭ দিন
  });
  return Response.json({ ok: true });
}
