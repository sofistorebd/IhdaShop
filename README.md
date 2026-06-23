# IHDA Shop 🧕

Next.js + Tailwind দিয়ে তৈরি মডেস্ট-ওয়্যার (বোরকা/হিজাব/নিকাব) অর্ডার সাইট।

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

কোনোটা সেট না থাকলেও সাইট চলবে — শুধু ওই ফিচারটা নিষ্ক্রিয় থাকবে (অ্যাডমিনে warning দেখাবে)।

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

## 🌐 নতুন GitHub + Vercel এ Live করা

### ধাপ ১ — GitHub এ তোলা
নতুন GitHub account এ খালি repo বানাও (যেমন `ihda-shop`), তারপর:

```bash
git add .
git commit -m "IHDA Shop"
git branch -M main
git remote add origin https://github.com/তোমার-ইউজারনেম/ihda-shop.git
git push -u origin main
```

### ধাপ ২ — Vercel এ deploy
1. নতুন Vercel account এ login করো (GitHub দিয়ে)।
2. **Add New → Project → Import** করো ওই repo।
3. **Environment Variables** এ উপরের সবগুলো (`DATABASE_URL`, `TELEGRAM_*`, `STEADFAST_*`, `ADMIN_PASSWORD`) যোগ করো।
4. **Deploy** → কিছুক্ষণ পর live লিঙ্ক পাবে।

> Vercel এ Neon Postgres এক ক্লিকে যোগ করা যায়: Project → **Storage → Create Database → Neon** (DATABASE_URL স্বয়ংক্রিয়ভাবে বসে)।

> পরে অন্য GitHub/Vercel account এ transfer:
> GitHub: Repo Settings → Transfer ownership · Vercel: নতুন account এ আবার Import বা Project Settings → Transfer।
