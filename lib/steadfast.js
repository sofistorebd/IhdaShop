// Steadfast Courier API — এক ক্লিকে consignment তৈরি।
// env: STEADFAST_API_KEY, STEADFAST_SECRET_KEY
// ডকস: https://steadfast.com.bd/  (Merchant API)

const BASE = "https://portal.packzy.com/api/v1";

export function steadfastReady() {
  return Boolean(
    process.env.STEADFAST_API_KEY && process.env.STEADFAST_SECRET_KEY
  );
}

export async function createConsignment(order) {
  if (!steadfastReady()) {
    throw new Error("Steadfast API key সেট করা নেই");
  }

  const res = await fetch(`${BASE}/create_order`, {
    method: "POST",
    headers: {
      "Api-Key": process.env.STEADFAST_API_KEY,
      "Secret-Key": process.env.STEADFAST_SECRET_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      invoice: `IHDA-${order.id}`,
      recipient_name: order.name,
      recipient_phone: order.phone,
      recipient_address: order.address,
      // COD = মোট টাকা (গ্রাহকের কাছ থেকে কুরিয়ার তুলবে)
      cod_amount: Number(order.total) || 0,
      note: `${order.product} | সাইজ: ${order.size} | কালার: ${order.color} | পরিমাণ: ${order.qty}`,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.status !== 200) {
    throw new Error(data.message || "Steadfast অর্ডার তৈরি ব্যর্থ");
  }
  // { status, message, consignment: { consignment_id, tracking_code, status, ... } }
  return data.consignment;
}
