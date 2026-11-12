// সাইট সেটিংস পড়া ও আপডেট (ব্র্যান্ড + ইন্টিগ্রেশন)
import { revalidatePath } from "next/cache";
import { getSettingsForAdmin, updateSettings } from "@/lib/settings";
import { HEADER_COLOR_KEYS, headerColor } from "@/lib/header-colors";

export async function GET() {
  const settings = await getSettingsForAdmin();
  return Response.json({ ok: true, settings });
}

export async function POST(req) {
  const data = await req.json().catch(() => null);
  if (!data) {
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
