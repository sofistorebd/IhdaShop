import { cookies } from "next/headers";
import { ADMIN_COOKIE, tokenFor } from "@/lib/auth";

export async function POST(req) {
  const { password } = await req.json().catch(() => ({}));
  if (!process.env.ADMIN_PASSWORD) {
    return Response.json(
      { ok: false, error: "ADMIN_PASSWORD সেট করা নেই" },
      { status: 500 }
    );
  }
  if (password !== process.env.ADMIN_PASSWORD) {
    return Response.json({ ok: false, error: "ভুল পাসওয়ার্ড" }, { status: 401 });
  }

  const token = await tokenFor(password);
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
