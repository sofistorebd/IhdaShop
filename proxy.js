import { NextResponse } from "next/server";
import { ADMIN_COOKIE, expectedToken } from "@/lib/auth";

export async function proxy(req) {
  const { pathname } = req.nextUrl;

  // লগইন রুট সবসময় খোলা
  if (pathname === "/admin/login" || pathname === "/api/admin/login") {
    return NextResponse.next();
  }

  const cookie = req.cookies.get(ADMIN_COOKIE)?.value;
  const ok =
    process.env.ADMIN_PASSWORD && cookie && cookie === (await expectedToken());

  if (!ok) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { ok: false, error: "unauthorized" },
        { status: 401 }
      );
    }
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin", "/admin/:path*", "/api/admin/:path*"],
};
