// Telegram bot এ মেসেজ পাঠায়।
// env: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID

export async function sendTelegram(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
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
    `সাইজ: ${o.size} | কালার: ${o.color}`,
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
