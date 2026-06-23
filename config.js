// ====================================================================
//  IHDA Shop — সাইটের মূল সেটিংস। এই ফাইলটা edit করলেই পুরো সাইট বদলাবে।
// ====================================================================

export const site = {
  // ব্র্যান্ডের নাম
  brandName: "IHDA Shop",
  tagline: "পর্দা এবং স্টাইল একই সাথে",
  description:
    "প্রিমিয়াম মানের বোরকা, হিজাব ও নিকাব — আরাম, পর্দা আর স্টাইল একসাথে। সারা বাংলাদেশে দ্রুত হোম ডেলিভারি।",

  // SEO: তোমার live ডোমেইন (Vercel এ NEXT_PUBLIC_SITE_URL দিয়েও সেট করা যায়)
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://ihdashop.com",
  keywords: [
    "বোরকা",
    "হিজাব",
    "নিকাব",
    "বোরকা অর্ডার",
    "মডেস্ট ওয়্যার",
    "burka",
    "hijab",
    "niqab",
    "Bangladesh",
    "IHDA Shop",
  ],

  // যোগাযোগ
  phone: "01XXXXXXXXX", // <-- তোমার ফোন নাম্বার দাও
  whatsapp: "8801XXXXXXXXX", // <-- WhatsApp নাম্বার (country code সহ, + ছাড়া)
  email: "ihdashop@example.com",
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
  { icon: "✨", title: "প্রিমিয়াম কোয়ালিটি", desc: "উন্নত মানের কাপড় ও নিখুঁত সেলাই" },
  { icon: "🧕", title: "১০০% পর্দা নিশ্চয়তা", desc: "পরিপূর্ণ পর্দা মেনে তৈরি ডিজাইন" },
  { icon: "🚚", title: "দ্রুত ডেলিভারি", desc: "সারা দেশে ২–৩ দিনে হোম ডেলিভারি" },
  { icon: "💬", title: "কাস্টমার সার্ভিস", desc: "যেকোনো প্রয়োজনে আমরা পাশে আছি" },
];
