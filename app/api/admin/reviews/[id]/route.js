import { revalidatePath } from "next/cache";
import { deleteReview } from "@/lib/reviews-db";

export async function DELETE(req, { params }) {
  const { id } = await params;
  await deleteReview(Number(id));
  revalidatePath("/", "layout");
  return Response.json({ ok: true });
}
