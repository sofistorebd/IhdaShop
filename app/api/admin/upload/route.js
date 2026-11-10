// ছবি আপলোড → VPS local disk → public URL (/api/media/...)
// VPS-এ Node server চলে বলে বড় ছবিতেও 4.5MB সীমা নেই।
import { saveUpload } from "@/lib/storage";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"]);
const MAX_BYTES = 10 * 1024 * 1024;

export async function POST(req) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!file || typeof file === "string") {
      return Response.json({ ok: false, error: "ফাইল নেই" }, { status: 400 });
    }
    if (!ALLOWED_TYPES.has(file.type) || Number(file.size) > MAX_BYTES) {
      return Response.json({ ok: false, error: "unsupported image type or image exceeds 10MB" }, { status: 400 });
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
