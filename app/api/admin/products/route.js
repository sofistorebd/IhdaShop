// প্রোডাক্ট লিস্ট + নতুন প্রোডাক্ট তৈরি
import { listProducts, createProduct } from "@/lib/products-db";

export async function GET() {
  const products = await listProducts();
  return Response.json({ ok: true, products });
}

export async function POST(req) {
  const data = await req.json().catch(() => null);
  if (!data?.name || !data?.slug) {
    return Response.json(
      { ok: false, error: "নাম ও slug দরকার" },
      { status: 400 }
    );
  }
  try {
    const product = await createProduct(data);
    return Response.json({ ok: true, product });
  } catch (err) {
    const msg = String(err?.message || "").includes("duplicate")
      ? "এই slug আগে থেকেই আছে"
      : "তৈরি ব্যর্থ";
    return Response.json({ ok: false, error: msg }, { status: 500 });
  }
}
