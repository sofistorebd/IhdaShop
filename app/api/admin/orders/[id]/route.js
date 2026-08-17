// অ্যাডমিন — একটি অর্ডার এডিট (proxy middleware দিয়ে সুরক্ষিত)
import { updateOrderFields } from "@/lib/db";

export async function PUT(req, { params }) {
  const { id } = await params;
  const data = await req.json().catch(() => null);

  if (!data?.name || !data?.phone || !data?.address) {
    return Response.json({ ok: false, error: "নাম, ফোন, ঠিকানা দরকার" }, { status: 400 });
  }
  // ফোন যাচাই — বাংলাদেশি ১১ ডিজিট
  const phoneDigits = String(data.phone).replace(/\D/g, "").replace(/^88/, "");
  if (!/^01\d{9}$/.test(phoneDigits)) {
    return Response.json({ ok: false, error: "সঠিক ১১ ডিজিটের ফোন দিন" }, { status: 400 });
  }

  try {
    const order = await updateOrderFields(Number(id), data);
    if (!order) {
      return Response.json({ ok: false, error: "পাওয়া যায়নি" }, { status: 404 });
    }
    return Response.json({ ok: true, order });
  } catch (err) {
    console.error("অর্ডার আপডেট ব্যর্থ:", err);
    return Response.json({ ok: false, error: "আপডেট ব্যর্থ" }, { status: 500 });
  }
}
