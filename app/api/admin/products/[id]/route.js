// একটি প্রোডাক্ট আপডেট / ডিলিট
import { revalidatePath } from "next/cache";
import { getProductById, updateProduct, deleteProduct } from "@/lib/products-db";

export async function GET(req, { params }) {
  const { id } = await params;
  const product = await getProductById(Number(id));
  if (!product) {
    return Response.json({ ok: false, error: "পাওয়া যায়নি" }, { status: 404 });
  }
  return Response.json({ ok: true, product });
}

export async function PUT(req, { params }) {
  const { id } = await params;
  const data = await req.json().catch(() => null);
  if (!data?.name || !data?.slug) {
    return Response.json({ ok: false, error: "নাম ও slug দরকার" }, { status: 400 });
  }
  try {
    const product = await updateProduct(Number(id), data);
    if (!product) {
      return Response.json({ ok: false, error: "পাওয়া যায়নি" }, { status: 404 });
    }
    revalidatePath("/", "layout");
    return Response.json({ ok: true, product });
  } catch {
    return Response.json({ ok: false, error: "আপডেট ব্যর্থ" }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  const { id } = await params;
  await deleteProduct(Number(id));
  revalidatePath("/", "layout");
  return Response.json({ ok: true });
}
