import { NextResponse } from "next/server";
import { ADMIN_COOKIE, validSession } from "@/lib/auth";

export async function proxy(req) {
  const { pathname } = req.nextUrl;

  // লগইন রুট ও PWA manifest সবসময় খোলা (manifest fetch কুকি ছাড়াই হয়)
  if (
    pathname === "/admin/login" ||
    pathname === "/api/admin/login" ||
    pathname === "/admin/manifest.webmanifest"
  ) {
    return NextResponse.next();
  }

  const ok = await validSession(req.cookies.get(ADMIN_COOKIE)?.value);

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
