// ছবি আপলোড → Vercel Blob → public URL
import { put } from "@vercel/blob";

export async function POST(req) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return Response.json(
      {
        ok: false,
        error:
          "ছবি আপলোড চালু নেই। Vercel এ Storage → Blob যোগ করো, অথবা ছবির URL সরাসরি পেস্ট করো।",
      },
      { status: 400 }
    );
  }
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!file || typeof file === "string") {
      return Response.json({ ok: false, error: "ফাইল নেই" }, { status: 400 });
    }
    const safe = (file.name || "image").replace(/[^a-zA-Z0-9._-]/g, "_");
    const blob = await put(`products/${Date.now()}-${safe}`, file, {
      access: "public",
    });
    return Response.json({ ok: true, url: blob.url });
  } catch (err) {
    return Response.json(
      { ok: false, error: err?.message || "আপলোড ব্যর্থ" },
      { status: 500 }
    );
  }
}
