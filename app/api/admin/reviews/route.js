// রিভিউ স্ক্রিনশট লিস্ট + যোগ
import { revalidatePath } from "next/cache";
import { listReviews, createReview } from "@/lib/reviews-db";

export async function GET() {
  const reviews = await listReviews();
  return Response.json({ ok: true, reviews });
}

export async function POST(req) {
  const { imageUrl } = await req.json().catch(() => ({}));
  if (!imageUrl) {
    return Response.json({ ok: false, error: "ছবি দরকার" }, { status: 400 });
  }
  try {
    const review = await createReview(imageUrl);
    revalidatePath("/", "layout");
    return Response.json({ ok: true, review });
  } catch {
    return Response.json({ ok: false, error: "যোগ ব্যর্থ" }, { status: 500 });
  }
}
