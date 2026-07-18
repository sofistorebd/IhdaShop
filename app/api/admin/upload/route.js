// ছবি আপলোড → VPS local disk → public URL (/api/media/...)
// VPS-এ Node server চলে বলে বড় ছবিতেও 4.5MB সীমা নেই।
import { saveUpload } from "@/lib/storage";

export async function POST(req) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!file || typeof file === "string") {
      return Response.json({ ok: false, error: "ফাইল নেই" }, { status: 400 });
    }
    const prefix = form.get("prefix") || "img";
    const url = await saveUpload(file, String(prefix));
    return Response.json({ ok: true, url });
  } catch (err) {
    return Response.json(
      { ok: false, error: err?.message || "আপলোড ব্যর্থ" },
      { status: 500 }
    );
  }
}
