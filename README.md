# STORE — E‑commerce Template 🛍️

Next.js + Tailwind দিয়ে তৈরি white‑label সিঙ্গেল-পেজ অর্ডার সাইট (landing + product page)। ব্র্যান্ড, রঙ, লোগো, প্রোডাক্ট, রিভিউ, ইন্টিগ্রেশন — সব admin থেকে। প্রতি দোকানের নিজস্ব PostgreSQL ও স্থায়ী আপলোড ভলিউমসহ Coolify-তে চালানোর জন্য।

**বৈশিষ্ট্য**
- ২ পেজ: মেইন পেজ (প্রোডাক্ট গ্রিড) + সিঙ্গেল প্রোডাক্ট পেজ (`/product/[slug]`) যেখানে অর্ডার ফর্ম
- পিংক / কালো / সাদা থিম, পুরো বাংলা, মোবাইল রেসপন্সিভ
- অর্ডার ফর্ম (Cash on Delivery) + WhatsApp অর্ডার
- গ্রাহক ফিডব্যাক স্ক্রিনশট গ্যালারি
- অর্ডার সাবমিটে **Telegram** নোটিফিকেশন
- অর্ডার **Neon Postgres** এ সেভ
- পাসওয়ার্ড-প্রোটেক্টেড **অ্যাডমিন প্যানেল** (`/admin`) — অর্ডার লিস্ট + এক ক্লিকে **Steadfast কুরিয়ার** এ এন্ট্রি

---

## 🚀 লোকালি চালানো

```bash
npm install
npm run dev
```

ব্রাউজারে খোলো: http://localhost:3000 · অ্যাডমিন: http://localhost:3000/admin

---

## ✏️ সাইট edit করা (কোডিং না জানলেও পারবে)

| কী বদলাবে | কোন ফাইল |
| --- | --- |
| ব্র্যান্ডের নাম, ফোন, WhatsApp, ডেলিভারি চার্জ | `config.js` |
| প্রোডাক্ট, দাম, সাইজ, কালার | `data/products.js` |
| ফিডব্যাক স্ক্রিনশট লিস্ট | `data/feedback.js` |
| রঙ (পিংক থিম) | `app/globals.css` (`--color-brand`) |

### প্রোডাক্টের ছবি যোগ করা
1. ছবি রাখো `public/products/` এ (যেমন `safa.jpg`)
2. `data/products.js` এ লেখো: `image: "/products/safa.jpg"`

### আসল ফিডব্যাক স্ক্রিনশট যোগ করা
1. স্ক্রিনশট রাখো `public/reviews/` এ (যেমন `customer1.jpg`)
2. `data/feedback.js` এর লিস্টে path দাও: `"/reviews/customer1.jpg"`
   (এখন ডেমো মকআপ দেখাচ্ছে — `mock1.svg` … `mock6.svg`)

---

## 🔑 পরিবেশ ভেরিয়েবল (`.env.local`)

`.env.example` কপি করে `.env.local` বানাও, তারপর মান বসাও:

```
DATABASE_URL=            # Neon connection string
TELEGRAM_BOT_TOKEN=      # @BotFather থেকে
TELEGRAM_CHAT_ID=        # তোমার চ্যাট/গ্রুপ আইডি
STEADFAST_API_KEY=
STEADFAST_SECRET_KEY=
ADMIN_PASSWORD=          # /admin এ লগইন পাসওয়ার্ড
```

অর্ডার ও অ্যাডমিন লগইনের জন্য PostgreSQL প্রয়োজন। প্রোডাকশনে ADMIN_PASSWORD, স্থায়ী ENCRYPTION_KEY ও HTTPS সাইটের NEXT_PUBLIC_SITE_URL সেট করুন।

### Database (Neon)
1. https://neon.tech এ ফ্রি account → নতুন project।
2. **Connection string** কপি করে `DATABASE_URL` এ দাও।
3. টেবিল নিজে নিজে তৈরি হবে (প্রথম অর্ডার/অ্যাডমিন লোডে)।

### Telegram নোটিফিকেশন
1. টেলিগ্রামে **@BotFather** → `/newbot` → token নাও → `TELEGRAM_BOT_TOKEN`।
2. বটকে একটা মেসেজ দাও, তারপর `https://api.telegram.org/bot<token>/getUpdates` খুলে `chat.id` বের করো → `TELEGRAM_CHAT_ID`।

### Steadfast Courier
- merchant প্যানেল থেকে **API Key** ও **Secret Key** নিয়ে `STEADFAST_API_KEY` / `STEADFAST_SECRET_KEY` এ বসাও।
- অ্যাডমিনে প্রতিটি অর্ডারের পাশে **"Steadfast এ পাঠান"** বাটন — এক ক্লিকে consignment তৈরি হয়, tracking code সেভ হয়।

---

## Coolify-তে ডিপ্লয়

1. রিপোজিটরি যুক্ত করে Dockerfile build pack ও port 3000 নির্বাচন করুন। প্রতিটি দোকানের জন্য আলাদা PostgreSQL ব্যবহার করুন।
2. Coolify-এর environment settings-এ `.env.example` অনুযায়ী মান দিন। প্রথম লগইনের জন্য শক্তিশালী ADMIN_PASSWORD দিন। ENCRYPTION_KEY নিরাপদে সংরক্ষণ করুন। সাইটের আসল HTTPS ডোমেইন দিন।
3. একটি persistent volume ঠিক `/app/storage/uploads`-এ mount করুন। UPLOAD_DIR বদলালে mount-ও বদলান। ব্যাকআপ ও Meta retry worker চালানোর জন্য অন্তত একটি app instance সর্বক্ষণ চালু রাখুন।
4. ডিপ্লয়ের পর অ্যাডমিনে লগইন করে একটি ছবি আপলোড করুন। পুনরায় ডিপ্লয়ের পর একই ছবি খুলুন। স্টেজিংয়ে অর্ডার জমা, যাচাই ও স্ট্যাটাস মিলিয়ে দেখুন। সেশন আপডেটের পর আগের ডিভাইসগুলোকে আবার লগইন করতে হবে।

### SMS OTP

ডিফল্টে বন্ধ। SMS.net.bd অ্যাকাউন্টের API key Coolify-তে SMS_NET_BD_API_KEY নামে সেট করে redeploy করুন। অনুমোদিত Sender ID থাকলে SMS_NET_BD_SENDER_ID সেট করতে পারেন। ৬ সংখ্যার কোড ১০ মিনিট কার্যকর। এরপর **অ্যাডমিন → সেটিংস → অর্ডার সুরক্ষা → প্রতিটি ওয়েব অর্ডারে SMS OTP যাচাই করুন** নির্বাচন করে সেভ করুন। বন্ধ করতে টিক তুলে সেভ করুন। চালু অবস্থায় একটি আসল নম্বর দিয়ে ডেলিভারি পরীক্ষা করুন। OTP যাচাইয়ের পরেও অর্ডার In Review-তে যায়।

### কুরিয়ার ও হিসাব

Pending বা Confirmed অর্ডার Steadfast-এ পাঠানো যায়। সংযোগ বিচ্ছিন্ন হলে তালিকা রিফ্রেশ করে `ORD-<id>` ইনভয়েস পোর্টালে খুঁজুন। পাঁচ মিনিট পরে **ইনভয়েস মিলিয়ে নিন** থেকে বিদ্যমান consignment ID দিন। বুকিং হয়নি নিশ্চিত হলেই NONE লিখে পুনরায় পাঠান। Delivered অর্ডারে **কুরিয়ার পেমেন্ট লিখুন** থেকে স্টেটমেন্ট অনুযায়ী প্রাপ্ত টাকা ও রেফারেন্স লিখুন। রিপোর্টে ডেলিভার্ড মূল্য অর্ডার তৈরির তারিখ অনুযায়ী দেখানো হয়।

### ব্যাকআপ ফিরিয়ে দেখা

স্টেজিংয়ের জন্য আলাদা খালি ডেটাবেস ও ভলিউম তৈরি করুন। লাইভ সেটিংস বা গ্রাহক নোটিফিকেশন চালু করবেন না। Google Drive থেকে ব্যাকআপ এনে প্রকল্পের checkout-এ Node 22+, npm dependencies ও PostgreSQL client দিয়ে চালান। মূল ব্যাকআপের BACKUP_ENCRYPTION_KEY (অথবা ENCRYPTION_KEY) এবং খালি স্টেজিং ডেটাবেসের RESTORE_DATABASE_URL আগে environment-এ সেট করুন।

```bash
mkdir restore-check
chmod 700 restore-check
node --input-type=module -e 'import {decryptBackupFile} from "./lib/backup-artifact.js"; await decryptBackupFile(process.argv[1], "restore-check/archive.tar.gz")' ./backup.tar.gz.enc
tar -xzf restore-check/archive.tar.gz -C restore-check
pg_restore --single-transaction --no-owner --no-acl --dbname="$RESTORE_DATABASE_URL" restore-check/database.dump
```

স্টেজিং ভলিউমে restore-check/uploads-এর ভেতরের ফাইলগুলো রাখুন। বাইরের ইন্টিগ্রেশনে সংযোগ বন্ধ রেখে স্টেজিং অ্যাপে একটি অর্ডার ও তার পণ্যের ছবি খুলে যাচাই করুন। ব্যাকআপে গ্রাহকের তথ্য থাকে, তাই রিস্টোর করা কপি সুরক্ষিত রাখুন।

### পরিবর্তন যাচাই

```bash
npm ci
npm test
npm run build
```
