// ক্লায়েন্ট-সাইড (ডিরেক্ট) Blob আপলোডের টোকেন দেয়।
// ব্রাউজার থেকে সরাসরি Vercel Blob-এ ছবি যায় → serverless-এর 4.5MB body সীমা থাকে না,
// তাই বড় product ছবিও আপলোড হয়। রুটটি middleware (proxy.js) দিয়ে অ্যাডমিন-অথ সুরক্ষিত।
import { handleUpload } from "@vercel/blob/client";

export async function POST(request) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return Response.json(
      { error: "ছবি আপলোড চালু নেই। Vercel এ Storage → Blob যোগ করো।" },
      { status: 400 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid body" }, { status: 400 });
  }

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: [
          "image/jpeg",
          "image/png",
          "image/webp",
          "image/gif",
          "image/avif",
        ],
        addRandomSuffix: true,
        maximumSizeInBytes: 15 * 1024 * 1024, // 15MB পর্যন্ত ছবি
      }),
      // প্রোডাকশনে Blob কলব্যাক করে; লোকালে চুপচাপ স্কিপ হয়।
      onUploadCompleted: async () => {},
    });
    return Response.json(jsonResponse);
  } catch (err) {
    return Response.json(
      { error: err?.message || "আপলোড ব্যর্থ" },
      { status: 400 }
    );
  }
}
