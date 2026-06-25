// Steadfast Courier API — এক ক্লিকে consignment তৈরি।
// API key/secret admin settings (DB) থেকে, না থাকলে env থেকে।
import { getSecret } from "./settings";

const BASE = "https://portal.packzy.com/api/v1";

export async function getSteadfastKeys() {
  return {
    apiKey: await getSecret("steadfastApiKey"),
    secretKey: await getSecret("steadfastSecretKey"),
  };
}

export async function steadfastReady() {
  const { apiKey, secretKey } = await getSteadfastKeys();
  return Boolean(apiKey && secretKey);
}

export async function createConsignment(order) {
  const { apiKey, secretKey } = await getSteadfastKeys();
  if (!apiKey || !secretKey) {
    throw new Error("Steadfast API key সেট করা নেই");
  }

  const res = await fetch(`${BASE}/create_order`, {
    method: "POST",
    headers: {
      "Api-Key": apiKey,
      "Secret-Key": secretKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      invoice: `IHDA-${order.id}`,
      recipient_name: order.name,
      recipient_phone: order.phone,
      recipient_address: order.address,
      cod_amount: Number(order.total) || 0,
      note: `${order.product} | সাইজ: ${order.size} | পরিমাণ: ${order.qty}`,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.status !== 200) {
    throw new Error(data.message || "Steadfast অর্ডার তৈরি ব্যর্থ");
  }
  return data.consignment;
}
