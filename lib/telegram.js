// Telegram bot এ মেসেজ পাঠায়।
// টোকেন/চ্যাট আইডি admin settings (DB) থেকে, না থাকলে env থেকে।
import { getSecret } from "./settings";

export async function sendTelegram(text) {
  const token = await getSecret("telegramBotToken");
  const chatId = await getSecret("telegramChatId");
  if (!token || !chatId) {
    console.log("Telegram সেট করা নেই — মেসেজ স্কিপ করা হলো");
    return false;
  }
  try {
    const res = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: "HTML",
        }),
      }
    );
    return res.ok;
  } catch (err) {
    console.error("Telegram পাঠানো ব্যর্থ:", err);
    return false;
  }
}

export function formatOrder(o) {
  const bdt = (n) => "৳" + Number(n).toLocaleString("bn-BD");
  return [
    `🛍️ <b>নতুন অর্ডার #${o.id ?? ""}</b>`,
    ``,
    `📦 <b>${o.product}</b>`,
    `সাইজ: ${o.size}`,
    `পরিমাণ: ${o.qty}`,
    ``,
    `👤 ${o.name}`,
    `📞 ${o.phone}`,
    `📍 ${o.address}`,
    ``,
    `🚚 ${o.area} — ${bdt(o.deliveryCharge ?? o.delivery_charge)}`,
    `💰 <b>সর্বমোট: ${bdt(o.total)}</b>`,
  ].join("\n");
}
