# IHDA Shop 🧕

Next.js + Tailwind দিয়ে তৈরি একটি single landing page অর্ডার সাইট (বোরকা/হিজাব/নিকাব)।
বৈশিষ্ট্য: প্রোডাক্ট গ্রিড, অর্ডার ফর্ম (Cash on Delivery), WhatsApp অর্ডার, Google Sheet এ অর্ডার সংরক্ষণ।

---

## 🚀 লোকালি চালানো

```bash
npm install
npm run dev
```

ব্রাউজারে খোলো: http://localhost:3000

---

## ✏️ সাইট edit করা (কোডিং না জানলেও পারবে)

| কী বদলাবে | কোন ফাইল |
| --- | --- |
| ব্র্যান্ডের নাম, ফোন, WhatsApp, ডেলিভারি চার্জ | `config.js` |
| প্রোডাক্ট, দাম, সাইজ, কালার | `data/products.js` |
| রিভিউ/মতামত | `components/Reviews.jsx` |
| রঙ (সবুজ থিম) | `app/globals.css` (`--color-brand`) |

### প্রোডাক্টের ছবি যোগ করা
1. ছবি রাখো `public/products/` ফোল্ডারে (যেমন `safa.jpg`)
2. `data/products.js` এ ওই প্রোডাক্টে লেখো: `image: "/products/safa.jpg"`

ছবি না দিলে সুন্দর placeholder এমনিতেই দেখাবে।

---

## 📦 অর্ডার Google Sheet এ পাঠানো

1. একটা Google Sheet খোলো।
2. উপরে **Extensions → Apps Script** এ যাও, এই কোড বসাও:

   ```js
   function doPost(e) {
     const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
     const d = JSON.parse(e.postData.contents);
     sheet.appendRow([
       new Date(), d.name, d.phone, d.address,
       d.product, d.size, d.color, d.qty, d.area, d.total
     ]);
     return ContentService.createTextOutput("ok");
   }
   ```

3. **Deploy → New deployment → Web app** → Access: **Anyone** → Deploy।
4. যে URL পাবে সেটা কপি করে `.env.local` ফাইলে দাও:

   ```
   GOOGLE_SHEET_WEBHOOK_URL=https://script.google.com/macros/s/xxxx/exec
   ```

ব্যস! এখন প্রতিটি অর্ডার Sheet এ সারি হয়ে জমা হবে।
(URL সেট না করলেও সাইট চলবে, অর্ডার শুধু WhatsApp/সার্ভার লগে যাবে।)

---

## 🌐 নতুন GitHub + Vercel এ Live করা

### ধাপ ১ — GitHub এ তোলা
নতুন GitHub account এ একটা খালি repo বানাও (যেমন `ihda-shop`), তারপর:

```bash
git add .
git commit -m "IHDA Shop landing page"
git branch -M main
git remote add origin https://github.com/তোমার-ইউজারনেম/ihda-shop.git
git push -u origin main
```

### ধাপ ২ — Vercel এ deploy
1. নতুন Vercel account এ login করো (GitHub দিয়ে)।
2. **Add New → Project → Import** করো ওই repo।
3. **Environment Variables** এ `GOOGLE_SHEET_WEBHOOK_URL` যোগ করো।
4. **Deploy** চাপো → কিছুক্ষণ পর live লিঙ্ক পাবে।

> পরে অন্য GitHub/Vercel account এ transfer করতে চাইলে:
> GitHub: Repo Settings → Transfer ownership।
> Vercel: নতুন account এ আবার Import, অথবা Project Settings → Transfer।
