import { cache } from "react";
import { sql, hasDb } from "./db";
import { encrypt, decrypt } from "./crypto";
import { site } from "@/config";

// কোন কী গুলো সিক্রেট (এনক্রিপ্ট করে রাখা হবে)
const SECRET_KEYS = [
  "telegramBotToken",
  "steadfastApiKey",
  "steadfastSecretKey",
];

// সিক্রেট কী → env fallback নাম
const ENV_FALLBACK = {
  telegramBotToken: "TELEGRAM_BOT_TOKEN",
  telegramChatId: "TELEGRAM_CHAT_ID",
  steadfastApiKey: "STEADFAST_API_KEY",
  steadfastSecretKey: "STEADFAST_SECRET_KEY",
};

// পাবলিক (ব্র্যান্ড) ফিল্ডের ডিফল্ট — config.js থেকে
function defaults() {
  return {
    brandName: site.brandName,
    tagline: site.tagline,
    description: site.description,
    url: site.url,
    logoUrl: "",
    footerText: site.tagline,
    phone: site.phone,
    whatsapp: site.whatsapp,
    facebook: site.facebook,
    instagram: site.instagram,
    deliveryInside: String(site.delivery.insideDhaka),
    deliveryOutside: String(site.delivery.outsideDhaka),
    telegramChatId: "",
  };
}

let _ready = null;
async function ensureSettingsSchema() {
  if (_ready) return _ready;
  _ready = sql`
    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT
    )
  `;
  return _ready;
}

async function readMap() {
  await ensureSettingsSchema();
  const rows = await sql`SELECT key, value FROM settings`;
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

// পাবলিক সেটিংস (সিক্রেট ছাড়া) — কম্পোনেন্ট/পেজে ব্যবহারযোগ্য। per-request cached।
export const getSettings = cache(async () => {
  const d = defaults();
  let map = {};
  if (hasDb()) {
    try {
      map = await readMap();
    } catch {
      map = {};
    }
  }
  const get = (k) => (map[k] != null && map[k] !== "" ? map[k] : d[k]);
  return {
    brandName: get("brandName"),
    tagline: get("tagline"),
    description: get("description"),
    url: get("url"),
    logoUrl: map.logoUrl || "",
    footerText: get("footerText"),
    phone: get("phone"),
    whatsapp: get("whatsapp"),
    facebook: get("facebook"),
    instagram: get("instagram"),
    keywords: site.keywords,
    delivery: {
      insideDhaka: Number(get("deliveryInside")) || 0,
      outsideDhaka: Number(get("deliveryOutside")) || 0,
    },
  };
});

// একটি ইন্টিগ্রেশন সিক্রেট (ডিক্রিপ্ট করে), না থাকলে env fallback
export async function getSecret(name) {
  if (hasDb()) {
    try {
      await ensureSettingsSchema();
      const rows = await sql`SELECT value FROM settings WHERE key = ${name}`;
      const v = rows[0]?.value;
      if (v) return decrypt(v);
    } catch {
      /* fall through to env */
    }
  }
  return process.env[ENV_FALLBACK[name]] || "";
}

// অ্যাডমিনের জন্য: পাবলিক মান + সিক্রেট সেট আছে কিনা (মান নয়)
export async function getSettingsForAdmin() {
  const pub = await getSettings();
  let map = {};
  if (hasDb()) {
    try {
      map = await readMap();
    } catch {
      map = {};
    }
  }
  const isSet = (k) => Boolean(map[k]) || Boolean(process.env[ENV_FALLBACK[k]]);
  return {
    ...pub,
    telegramChatId: map.telegramChatId || "",
    secretsSet: {
      telegramBotToken: isSet("telegramBotToken"),
      steadfastApiKey: isSet("steadfastApiKey"),
      steadfastSecretKey: isSet("steadfastSecretKey"),
    },
  };
}

// সেটিংস আপডেট — সিক্রেট খালি হলে আগেরটা থাকবে
export async function updateSettings(data) {
  await ensureSettingsSchema();
  const entries = Object.entries(data);
  for (const [key, raw] of entries) {
    const val = raw == null ? "" : String(raw);
    if (SECRET_KEYS.includes(key)) {
      if (!val) continue; // খালি = অপরিবর্তিত
      const enc = encrypt(val);
      await sql`
        INSERT INTO settings (key, value) VALUES (${key}, ${enc})
        ON CONFLICT (key) DO UPDATE SET value = ${enc}
      `;
    } else {
      await sql`
        INSERT INTO settings (key, value) VALUES (${key}, ${val})
        ON CONFLICT (key) DO UPDATE SET value = ${val}
      `;
    }
  }
}
