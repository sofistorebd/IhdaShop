// সাইট সেটিংস পড়া ও আপডেট (ব্র্যান্ড + ইন্টিগ্রেশন)
import { revalidatePath } from "next/cache";
import { getSettingsForAdmin, updateSettings } from "@/lib/settings";
import { HEADER_COLOR_KEYS, headerColor } from "@/lib/header-colors";
import { authorizeAdminRequest } from "@/lib/admin-request";
import { getCheckoutConfiguration } from "@/lib/settings";

export async function GET() {
  const settings = await getSettingsForAdmin();
  return Response.json({ ok: true, settings });
}

export async function POST(req) {
  const denied = await authorizeAdminRequest(req, { mutation: true, action: "save-settings" });
  if (denied) return denied;
  const data = await req.json().catch(() => null);
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return Response.json({ ok: false, error: "invalid" }, { status: 400 });
  }
  for (const key of HEADER_COLOR_KEYS) {
    if (!Object.hasOwn(data, key)) continue;
    if (typeof data[key] !== "string" || (data[key].trim() && !headerColor(data[key]))) {
      return Response.json({ ok: false, error: "হেডারের রঙ #RRGGBB ফরম্যাটে দিন অথবা ডিফল্ট রাখতে খালি রাখুন।" }, { status: 400 });
    }
    data[key] = headerColor(data[key]);
  }
  try {
    if (Object.hasOwn(data, "turnstileEnabled") && !["true", "false", true, false].includes(data.turnstileEnabled)) {
      return Response.json({ ok: false, error: "Turnstile setting সঠিক নয়।" }, { status: 400 });
    }
    for (const key of ["turnstileSiteKey", "turnstileSecretKey"]) {
      if (Object.hasOwn(data, key) && (typeof data[key] !== "string" || data[key].length > 256)) {
        return Response.json({ ok: false, error: "Turnstile key সঠিক নয়।" }, { status: 400 });
      }
    }
    if (["turnstileEnabled", "turnstileSiteKey", "turnstileSecretKey"].some((key) => Object.hasOwn(data, key))) {
      const current = await getCheckoutConfiguration();
      const enabled = Object.hasOwn(data, "turnstileEnabled") ? String(data.turnstileEnabled) === "true" : current.enabled;
      const siteKey = Object.hasOwn(data, "turnstileSiteKey") ? data.turnstileSiteKey.trim() : current.siteKey;
      if (enabled && (!siteKey || !(data.turnstileSecretKey?.trim() || current.secret) || !current.hostname)) {
        return Response.json({ ok: false, error: "Turnstile চালুর আগে Site Key, Secret Key এবং সাইটের URL সেট করুন।" }, { status: 400 });
      }
    }
    for (const key of ["turnstileSiteKey", "turnstileSecretKey"]) {
      if (typeof data[key] === "string") data[key] = data[key].trim();
    }
    await updateSettings(data);
    revalidatePath("/", "layout");
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json(
      { ok: false, error: err?.message || "সেভ ব্যর্থ" },
      { status: 500 }
    );
  }
}
