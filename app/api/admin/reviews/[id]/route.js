import { deleteReview } from "@/lib/reviews-db";

export async function DELETE(req, { params }) {
  const { id } = await params;
  await deleteReview(Number(id));
  return Response.json({ ok: true });
}
