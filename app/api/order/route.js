// অর্ডার গ্রহণ করে Google Sheet এ পাঠায় (এবং চাইলে ইমেইল)।
// সেটআপ: .env.local এ GOOGLE_SHEET_WEBHOOK_URL দাও (নিচে README দেখো)।

export async function POST(req) {
  let data;
  try {
    data = await req.json();
  } catch {
    return Response.json({ ok: false, error: "invalid json" }, { status: 400 });
  }

  // বেসিক ভ্যালিডেশন
  if (!data?.name || !data?.phone || !data?.address) {
    return Response.json({ ok: false, error: "missing fields" }, { status: 400 });
  }

  const webhook = process.env.GOOGLE_SHEET_WEBHOOK_URL;

  // Google Sheet webhook সেট করা না থাকলেও dev এ কাজ করবে (শুধু লগ হবে)
  if (!webhook) {
    console.log("📦 নতুন অর্ডার (webhook সেট করা নেই):", data);
    return Response.json({ ok: true, saved: false });
  }

  try {
    const res = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("sheet webhook failed");
    return Response.json({ ok: true, saved: true });
  } catch (err) {
    console.error("অর্ডার সেভ ব্যর্থ:", err);
    return Response.json({ ok: false, error: "save failed" }, { status: 500 });
  }
}
