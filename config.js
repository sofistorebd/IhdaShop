// ====================================================================
//  STORE — ডেমো টেমপ্লেট ডিফল্ট সেটিংস।
//  এগুলো শুধু fallback; আসল মান client admin → Settings থেকে দেবে।
// ====================================================================

export const site = {
  // ব্র্যান্ডের নাম (client admin Settings থেকে বদলাবে)
  brandName: "STORE",
  tagline: "আপনার পছন্দের সেরা কালেকশন",
  description:
    "প্রিমিয়াম মানের প্রোডাক্ট — দ্রুত হোম ডেলিভারি সারা বাংলাদেশে।",

  // SEO: live ডোমেইন (Vercel এ NEXT_PUBLIC_SITE_URL দিয়েও সেট করা যায়)
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://store.example.com",
  keywords: ["online shop", "bangladesh", "ecommerce", "STORE"],

  // যোগাযোগ (admin Settings থেকে দাও)
  phone: "01XXXXXXXXX",
  whatsapp: "8801XXXXXXXXX", // country code সহ, + ছাড়া
  email: "store@example.com",
  facebook: "https://facebook.com/",
  instagram: "https://instagram.com/",

  // ডেলিভারি চার্জ (টাকা)
  delivery: {
    insideDhaka: 60,
    outsideDhaka: 120,
  },
};

// trust badges (হিরোর নিচের ৪টা আইকন সেকশন)
export const features = [
  { icon: "✨", title: "প্রিমিয়াম কোয়ালিটি", desc: "উন্নত মানের প্রোডাক্ট" },
  { icon: "✅", title: "১০০% নিশ্চয়তা", desc: "যাচাই করা মান" },
  { icon: "🚚", title: "দ্রুত ডেলিভারি", desc: "সারা দেশে ২–৩ দিনে হোম ডেলিভারি" },
  { icon: "💬", title: "কাস্টমার সার্ভিস", desc: "যেকোনো প্রয়োজনে আমরা পাশে আছি" },
];
