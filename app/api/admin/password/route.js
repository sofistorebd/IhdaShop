// অ্যাডমিন পাসওয়ার্ড পরিবর্তন
import { verifyAdminPassword, setAdminPassword } from "@/lib/admin-auth";
import { hasDb } from "@/lib/db";

export async function POST(req) {
  if (!hasDb()) {
    return Response.json(
      { ok: false, error: "DATABASE_URL সেট করা নেই — পাসওয়ার্ড সেভ হবে না।" },
      { status: 400 }
    );
  }
  const { current, next } = await req.json().catch(() => ({}));
  if (!(await verifyAdminPassword(current))) {
    return Response.json(
      { ok: false, error: "বর্তমান পাসওয়ার্ড ভুল" },
      { status: 401 }
    );
  }
  if (!next || String(next).length < 4) {
    return Response.json(
      { ok: false, error: "নতুন পাসওয়ার্ড অন্তত ৪ অক্ষরের হতে হবে" },
      { status: 400 }
    );
  }
  await setAdminPassword(String(next));
  return Response.json({ ok: true });
}
