import { NextResponse } from "next/server";
import { getCheckoutConfiguration } from "@/lib/settings";
import { sessionCookie } from "@/lib/checkout-security";

export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    const config = await getCheckoutConfiguration();
    const response = NextResponse.json({ ok: true, enabled: config.enabled, siteKey: config.siteKey }, {
      headers: { "Cache-Control": "no-store", Vary: "Cookie" },
    });
    response.cookies.set("checkout_session", sessionCookie(req.cookies.get("checkout_session")?.value), {
      httpOnly: true, secure: process.env.NODE_ENV === "production",
      sameSite: "lax", path: "/", maxAge: 30 * 86400,
    });
    return response;
  } catch {
    return NextResponse.json({ ok: false, error: "অর্ডার সেবা প্রস্তুত হচ্ছে। আবার চেষ্টা করুন।" }, { status: 503 });
  }
}
