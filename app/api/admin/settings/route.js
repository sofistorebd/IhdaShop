// সাইট সেটিংস পড়া ও আপডেট (ব্র্যান্ড + ইন্টিগ্রেশন)
import { revalidatePath } from "next/cache";
import { getSettingsForAdmin, updateSettings } from "@/lib/settings";

export async function GET() {
  const settings = await getSettingsForAdmin();
  return Response.json({ ok: true, settings });
}

export async function POST(req) {
  const data = await req.json().catch(() => null);
  if (!data) {
    return Response.json({ ok: false, error: "invalid" }, { status: 400 });
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
