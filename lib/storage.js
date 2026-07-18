// ছবি VPS-এর local disk-এ সেভ করে (external Blob/S3 লাগে না)।
// Coolify-তে একটা persistent volume এই ডিরেক্টরিতে mount করতে হবে,
// নাহলে redeploy-এ আপলোড করা ছবি মুছে যাবে।
import { promises as fs } from "fs";
import path from "path";

// UPLOAD_DIR env দিয়ে বদলানো যায়; ডিফল্ট প্রজেক্টের বাইরে persistent path
const DIR = process.env.UPLOAD_DIR || "/app/storage/uploads";

export async function saveUpload(file, prefix = "img") {
  await fs.mkdir(DIR, { recursive: true });
  const safe = String(file.name || "image").replace(/[^a-zA-Z0-9._-]/g, "_");
  const name = `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}-${safe}`;
  const buf = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(path.join(DIR, name), buf);
  // same-origin URL — next/image remotePatterns লাগে না
  return `/api/media/${name}`;
}

export async function readUpload(name) {
  const safe = path.basename(name); // path traversal ঠেকায়
  return fs.readFile(path.join(DIR, safe));
}

export function contentType(name) {
  const ext = name.split(".").pop().toLowerCase();
  return (
    {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      webp: "image/webp",
      gif: "image/gif",
      avif: "image/avif",
      svg: "image/svg+xml",
    }[ext] || "application/octet-stream"
  );
}
