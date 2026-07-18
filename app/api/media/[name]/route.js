// আপলোড করা ছবি serve করে (public, auth লাগে না — এগুলো সাইটে দেখানোর ছবি)
import { readUpload, contentType } from "@/lib/storage";

export async function GET(req, { params }) {
  const { name } = await params;
  try {
    const buf = await readUpload(name);
    return new Response(buf, {
      headers: {
        "Content-Type": contentType(name),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
