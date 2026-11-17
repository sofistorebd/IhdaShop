// অ্যাডমিন — একটি অর্ডার এডিট (proxy middleware দিয়ে সুরক্ষিত)
import { deleteInReviewOrder, updateOrderFields } from "@/lib/db";
import { authorizeAdminRequest } from "@/lib/admin-request";

export async function DELETE(req, { params }) {
  const denied = await authorizeAdminRequest(req, { mutation: true, action: "delete-inreview-order" });
  if (denied) return denied;

  const { id } = await params;
  const orderId = Number(id);
  if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(orderId) || orderId > 2147483647) {
    return Response.json({ ok: false, error: "সঠিক অর্ডার নম্বর দিন" }, { status: 400 });
  }

  try {
    const deleted = await deleteInReviewOrder(orderId);
    if (!deleted) {
      return Response.json({ ok: false, error: "অর্ডারটি নেই, In Review-তে নেই অথবা কুরিয়ারে যুক্ত আছে। তালিকা রিফ্রেশ করে দেখুন।" }, { status: 409 });
    }
    return Response.json({ ok: true, id: deleted.id });
  } catch (err) {
    console.error("অর্ডার ডিলিট ব্যর্থ:", err);
    return Response.json({ ok: false, error: "অর্ডার ডিলিট করা যায়নি। আবার চেষ্টা করুন।" }, { status: 500 });
  }
}

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
