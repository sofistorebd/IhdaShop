// ভিজিট beacon গ্রহণ করে DB-তে log করে। public, দ্রুত, ব্যর্থ হলেও চুপচাপ।
import { logVisit } from "@/lib/analytics-db";

export async function POST(req) {
  try {
    const { path, ref } = await req.json().catch(() => ({}));
    // admin পেজ ট্র্যাক করি না
    if (typeof path === "string" && path.startsWith("/admin")) {
      return Response.json({ ok: true });
    }
    const xff = req.headers.get("x-forwarded-for") || "";
    await logVisit({
      path: path || "/",
      ref: ref || req.headers.get("referer") || "",
      ip: xff.split(",")[0].trim(),
      ua: req.headers.get("user-agent") || "",
    });
  } catch {
    /* analytics ব্যর্থ হলেও সাইট চলবে */
  }
  return Response.json({ ok: true });
}
