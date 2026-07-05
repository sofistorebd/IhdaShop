import { NextResponse } from "next/server";
import { ADMIN_COOKIE, sessionToken } from "@/lib/auth";

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

  const cookie = req.cookies.get(ADMIN_COOKIE)?.value;
  const ok = cookie && cookie === (await sessionToken());

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
