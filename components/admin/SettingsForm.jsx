"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { headerColor } from "@/lib/header-colors";

// মডিউল-লেভেল (কম্পোনেন্টের বাইরে) — নাহলে প্রতি রেন্ডারে re-mount হয়ে স্ক্রল/ফোকাস হারায়
function Section({ title, children }) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-base font-bold text-ink">{title}</h2>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

export default function SettingsForm({ initial }) {
  const router = useRouter();
  const [f, setF] = useState({
    brandName: initial.brandName || "",
    tagline: initial.tagline || "",
    description: initial.description || "",
    url: initial.url || "",
    footerText: initial.footerText || "",
    phone: initial.phone || "",
    whatsapp: initial.whatsapp || "",
    facebook: initial.facebook || "",
    instagram: initial.instagram || "",
    deliveryInside: String(initial.delivery?.insideDhaka ?? ""),
    deliveryOutside: String(initial.delivery?.outsideDhaka ?? ""),
    telegramChatId: initial.telegramChatId || "",
    facebookPixelId: initial.facebookPixelId || "",
    capiTestCode: initial.capiTestCode || "",
    merchantName: initial.merchantName || "",
    merchantId: initial.merchantId || "",
    colorPrimary: initial.colorPrimary || "#5a1436",
    colorSecondary: initial.colorSecondary || "#7a2349",
    colorGlobal: initial.colorGlobal || "#2c1a22",
    headerBackgroundColor: initial.headerBackgroundColor || "",
    headerTextColor: initial.headerTextColor || "",
    logoHeight: String(initial.logoHeight ?? 40),
    // সিক্রেট — খালি রাখলে আগেরটা থাকবে
    telegramBotToken: "",
    steadfastApiKey: "",
    steadfastSecretKey: "",
    capiAccessToken: "",
  });
  const [logoUrl, setLogoUrl] = useState(initial.logoUrl || "");
  const [faviconUrl, setFaviconUrl] = useState(initial.faviconUrl || "");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState("");

  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const secretsSet = initial.secretsSet || {};

  async function uploadBranding(file, kind, setUrl) {
    setUploading(true);
    setMsg("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("prefix", kind);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const d = await res.json();
      if (d.ok) setUrl(d.url);
      else setMsg("❌ " + (d.error || "আপলোড ব্যর্থ"));
    } catch (err) {
      setMsg("❌ " + (err?.message || "আপলোড ব্যর্থ"));
    }
    setUploading(false);
  }
  const uploadLogo = (file) => uploadBranding(file, "logo", setLogoUrl);
  const uploadFavicon = (file) => uploadBranding(file, "favicon", setFaviconUrl);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...f, logoUrl, faviconUrl }),
      });
      const d = await res.json();
      if (!d.ok) throw new Error(d.error || "সেভ ব্যর্থ");
      setMsg("✅ সেটিংস সেভ হয়েছে।");
      router.refresh();
    } catch (err) {
      setMsg("❌ " + err.message);
    }
    setBusy(false);
  }

  const inp =
    "w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-brand";
  const lbl = "mb-1 block text-sm font-semibold text-gray-700";

  return (
    <form onSubmit={submit} className="space-y-5">
      {msg && (
        <div className="rounded-xl bg-ink px-4 py-2 text-sm text-white">{msg}</div>
      )}

      <Section title="🏷️ ব্র্যান্ড পরিচিতি">
        <div>
          <label className={lbl}>সাইটের নাম</label>
          <input className={inp} value={f.brandName} onChange={(e) => set("brandName", e.target.value)} />
        </div>
        <div>
          <label className={lbl}>ট্যাগলাইন</label>
          <input className={inp} value={f.tagline} onChange={(e) => set("tagline", e.target.value)} />
        </div>
        <div>
          <label className={lbl}>বর্ণনা</label>
          <textarea rows={2} className={inp} value={f.description} onChange={(e) => set("description", e.target.value)} />
        </div>
        <div>
          <label className={lbl}>লোগো</label>
          <div className="flex items-center gap-3">
            {logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="logo" className="h-12 w-auto max-w-[140px] rounded bg-ink object-contain p-1" />
            )}
            <label className="cursor-pointer rounded-xl border-2 border-dashed border-gray-300 px-4 py-2 text-sm text-gray-500 hover:border-brand">
              {uploading ? "আপলোড হচ্ছে..." : logoUrl ? "লোগো বদলাও" : "+ লোগো আপলোড"}
              <input type="file" accept="image/*" className="hidden"
                onChange={(e) => e.target.files?.[0] && uploadLogo(e.target.files[0])} />
            </label>
            {logoUrl && (
              <button type="button" onClick={() => setLogoUrl("")} className="text-xs text-red-500 underline">
                সরাও
              </button>
            )}
          </div>
        </div>

        {/* লোগোর সাইজ */}
        <div>
          <label className={lbl}>লোগোর সাইজ (উচ্চতা): {f.logoHeight}px</label>
          <input
            type="range"
            min="24"
            max="80"
            value={f.logoHeight}
            onChange={(e) => set("logoHeight", e.target.value)}
            className="w-full accent-brand"
          />
          <p className="text-xs text-gray-400">কম–বেশি করতে স্লাইড করো (২৪–৮০px)</p>
        </div>

        {/* favicon / web icon */}
        <div>
          <label className={lbl}>ওয়েব আইকন (favicon — ব্রাউজার ট্যাবে)</label>
          <div className="flex items-center gap-3">
            {faviconUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={faviconUrl} alt="favicon" className="h-8 w-8 rounded border border-gray-200 object-contain" />
            )}
            <label className="cursor-pointer rounded-xl border-2 border-dashed border-gray-300 px-4 py-2 text-sm text-gray-500 hover:border-brand">
              {uploading ? "আপলোড হচ্ছে..." : faviconUrl ? "আইকন বদলাও" : "+ আইকন আপলোড"}
              <input type="file" accept="image/*" className="hidden"
                onChange={(e) => e.target.files?.[0] && uploadFavicon(e.target.files[0])} />
            </label>
            {faviconUrl && (
              <button type="button" onClick={() => setFaviconUrl("")} className="text-xs text-red-500 underline">
                সরাও
              </button>
            )}
          </div>
          <p className="text-xs text-gray-400">বর্গাকার (square) ছবি দাও, যেমন ৫১২×৫১২</p>
        </div>

        <div>
          <label className={lbl}>Footer টেক্সট</label>
          <input className={inp} value={f.footerText} onChange={(e) => set("footerText", e.target.value)} />
        </div>
        <div>
          <label className={lbl}>সাইট URL (SEO)</label>
          <input className={inp} value={f.url} onChange={(e) => set("url", e.target.value)} placeholder="https://yourdomain.com" />
        </div>
      </Section>

      <Section title="🎨 থিম রঙ">
        <p className="text-xs text-gray-500">
          রঙ বদলালে পুরো সাইটের বাটন, হোভার, লিঙ্ক, হেডার সব সেই অনুযায়ী বদলে যাবে।
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            ["colorPrimary", "Primary (বাটন/অ্যাকসেন্ট)"],
            ["colorSecondary", "Secondary (হোভার)"],
            ["colorGlobal", "Global (টেক্সট/হেডার)"],
          ].map(([k, label]) => (
            <div key={k}>
              <label className={lbl}>{label}</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={f[k]}
                  onChange={(e) => set(k, e.target.value)}
                  className="h-10 w-12 shrink-0 cursor-pointer rounded-lg border border-gray-200"
                />
                <input
                  className={inp}
                  value={f[k]}
                  onChange={(e) => set(k, e.target.value)}
                  placeholder="#e23a7a"
                />
              </div>
            </div>
          ))}
        </div>
        {/* লাইভ প্রিভিউ */}
        <div className="rounded-xl border border-gray-100 p-3" style={{ background: f.colorGlobal }}>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" style={{ background: f.colorPrimary }}
              className="rounded-full px-4 py-2 text-sm font-semibold text-white">
              অর্ডার করুন
            </button>
            <button type="button" style={{ background: f.colorSecondary }}
              className="rounded-full px-4 py-2 text-sm font-semibold text-white">
              হোভার রঙ
            </button>
            <span className="text-sm" style={{ color: "#fff" }}>প্রিভিউ</span>
          </div>
        </div>
      </Section>

      <Section title="হেডার ও মেনুর রঙ">
        <p className="text-sm text-gray-500">
          রঙ নির্বাচন না করলে বর্তমান হেডার অপরিবর্তিত থাকবে। ডিফল্টে ফিরতে রঙটি খালি করে সেভ করুন।
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            ["headerBackgroundColor", "হেডারের ব্যাকগ্রাউন্ড", "#ffffff"],
            ["headerTextColor", "হেডারের নাম ও মেনু লিঙ্কের রঙ", "#4b5563"],
          ].map(([key, label, fallback]) => (
            <div key={key}>
              <label htmlFor={key} className={lbl}>{label}</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  aria-label={`${label} নির্বাচন করুন`}
                  value={headerColor(f[key]) || fallback}
                  onChange={(e) => set(key, e.target.value)}
                  className="h-10 w-12 shrink-0 cursor-pointer rounded-lg border border-gray-200"
                />
                <input
                  id={key}
                  className={inp}
                  value={f[key]}
                  onChange={(e) => set(key, e.target.value)}
                  placeholder="খালি = বর্তমান ডিফল্ট"
                  pattern="#[0-9a-fA-F]{6}"
                  title="#RRGGBB ফরম্যাটে রঙ দিন, যেমন #ffffff"
                  maxLength={7}
                />
              </div>
              <button type="button" onClick={() => set(key, "")} className="mt-2 text-xs text-brand underline">
                ডিফল্টে ফিরুন
              </button>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-500">প্রিভিউ — লোগোর ছবির রঙ এবং অর্ডার বাটনের রঙ আগের মতো থাকবে।</p>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-100 p-4"
          style={{ backgroundColor: headerColor(f.headerBackgroundColor) || "#ffffff" }}>
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={f.brandName} className="h-10 max-w-[140px] object-contain" />
          ) : (
            <span className="font-bold" style={{ color: headerColor(f.headerTextColor) || f.colorGlobal }}>{f.brandName || "সাইটের নাম"}</span>
          )}
          <div className="flex gap-4 text-sm text-gray-600" style={{ color: headerColor(f.headerTextColor) || undefined }}>
            <span>প্রোডাক্ট</span><span>রিভিউ</span>
          </div>
          <span className="rounded-full px-4 py-2 text-sm font-semibold text-white" style={{ backgroundColor: f.colorPrimary }}>অর্ডার করুন</span>
        </div>
      </Section>

      <Section title="📞 যোগাযোগ">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={lbl}>ফোন</label>
            <input className={inp} value={f.phone} onChange={(e) => set("phone", e.target.value)} placeholder="01XXXXXXXXX" />
          </div>
          <div>
            <label className={lbl}>WhatsApp (country code সহ)</label>
            <input className={inp} value={f.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} placeholder="8801XXXXXXXXX" />
          </div>
          <div>
            <label className={lbl}>Facebook লিঙ্ক</label>
            <input className={inp} value={f.facebook} onChange={(e) => set("facebook", e.target.value)} />
          </div>
          <div>
            <label className={lbl}>Instagram লিঙ্ক</label>
            <input className={inp} value={f.instagram} onChange={(e) => set("instagram", e.target.value)} />
          </div>
        </div>
      </Section>

      <Section title="🚚 ডেলিভারি চার্জ">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={lbl}>ঢাকার ভিতরে (৳)</label>
            <input type="number" className={inp} value={f.deliveryInside} onChange={(e) => set("deliveryInside", e.target.value)} />
          </div>
          <div>
            <label className={lbl}>ঢাকার বাইরে (৳)</label>
            <input type="number" className={inp} value={f.deliveryOutside} onChange={(e) => set("deliveryOutside", e.target.value)} />
          </div>
        </div>
      </Section>

      <Section title="🏷️ কুরিয়ার লেবেল">
        <p className="text-xs text-gray-500">
          ৫০×৭৫mm লেবেলে যে ব্যবসার নাম ও মার্চেন্ট আইডি ছাপা হবে।
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={lbl}>ব্যবসার নাম (লেবেলে)</label>
            <input className={inp} value={f.merchantName} onChange={(e) => set("merchantName", e.target.value)} placeholder="খালি রাখলে সাইটের নাম" />
          </div>
          <div>
            <label className={lbl}>মার্চেন্ট আইডি</label>
            <input className={inp} value={f.merchantId} onChange={(e) => set("merchantId", e.target.value)} placeholder="যেমন: M-12345" />
          </div>
        </div>
      </Section>

      <Section title="🔌 ইন্টিগ্রেশন (সিক্রেট — এনক্রিপ্টেড)">
        <p className="text-xs text-gray-500">
          সিক্রেট ফিল্ড খালি রাখলে আগেরটাই থাকবে। বদলাতে নতুন মান দিন।
        </p>
        <div>
          <label className={lbl}>
            Telegram Bot Token {secretsSet.telegramBotToken && <span className="text-green-600">✓ সেট করা আছে</span>}
          </label>
          <input type="password" className={inp} value={f.telegramBotToken}
            onChange={(e) => set("telegramBotToken", e.target.value)}
            placeholder={secretsSet.telegramBotToken ? "•••••• (অপরিবর্তিত)" : "BotFather থেকে টোকেন"} />
        </div>
        <div>
          <label className={lbl}>Telegram Chat ID</label>
          <input className={inp} value={f.telegramChatId} onChange={(e) => set("telegramChatId", e.target.value)} placeholder="123456789" />
        </div>
        <div>
          <label className={lbl}>Facebook Pixel ID (ads ট্র্যাকিং)</label>
          <input className={inp} value={f.facebookPixelId} onChange={(e) => set("facebookPixelId", e.target.value)} placeholder="1234567890" />
        </div>
        <div>
          <label className={lbl}>
            Conversions API Token (CAPI) {secretsSet.capiAccessToken && <span className="text-green-600">✓ সেট করা আছে</span>}
          </label>
          <input type="password" className={inp} value={f.capiAccessToken}
            onChange={(e) => set("capiAccessToken", e.target.value)}
            placeholder={secretsSet.capiAccessToken ? "•••••• (অপরিবর্তিত)" : "Events Manager → Settings → Generate access token"} />
          <p className="mt-1 text-xs text-gray-500">
            Pixel ID + এই টোকেন থাকলে অর্ডার সার্ভার থেকেও Meta-তে যাবে (iOS/ad-blocker মিস কমায়)।
          </p>
        </div>
        <div>
          <label className={lbl}>CAPI Test Event Code (যাচাইয়ের সময়, পরে খালি)</label>
          <input className={inp} value={f.capiTestCode} onChange={(e) => set("capiTestCode", e.target.value)} placeholder="যেমন: TEST12345" />
        </div>
        <div>
          <label className={lbl}>
            Steadfast API Key {secretsSet.steadfastApiKey && <span className="text-green-600">✓ সেট করা আছে</span>}
          </label>
          <input type="password" className={inp} value={f.steadfastApiKey}
            onChange={(e) => set("steadfastApiKey", e.target.value)}
            placeholder={secretsSet.steadfastApiKey ? "•••••• (অপরিবর্তিত)" : ""} />
        </div>
        <div>
          <label className={lbl}>
            Steadfast Secret Key {secretsSet.steadfastSecretKey && <span className="text-green-600">✓ সেট করা আছে</span>}
          </label>
          <input type="password" className={inp} value={f.steadfastSecretKey}
            onChange={(e) => set("steadfastSecretKey", e.target.value)}
            placeholder={secretsSet.steadfastSecretKey ? "•••••• (অপরিবর্তিত)" : ""} />
        </div>
      </Section>

      <div className="sticky bottom-4">
        <button disabled={busy}
          className="w-full rounded-full bg-brand py-3.5 text-base font-bold text-white shadow-lg transition hover:bg-brand-dark disabled:opacity-60">
          {busy ? "সেভ হচ্ছে..." : "সব সেটিংস সেভ করো"}
        </button>
      </div>
    </form>
  );
}
