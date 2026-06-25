"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
    colorPrimary: initial.colorPrimary || "#e23a7a",
    colorSecondary: initial.colorSecondary || "#be185d",
    colorGlobal: initial.colorGlobal || "#111111",
    // সিক্রেট — খালি রাখলে আগেরটা থাকবে
    telegramBotToken: "",
    steadfastApiKey: "",
    steadfastSecretKey: "",
  });
  const [logoUrl, setLogoUrl] = useState(initial.logoUrl || "");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState("");

  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const secretsSet = initial.secretsSet || {};

  async function uploadLogo(file) {
    setUploading(true);
    setMsg("");
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const d = await res.json();
      if (d.ok) setLogoUrl(d.url);
      else setMsg("❌ " + (d.error || "লোগো আপলোড ব্যর্থ"));
    } catch {
      setMsg("❌ লোগো আপলোড ব্যর্থ");
    }
    setUploading(false);
  }

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...f, logoUrl }),
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

  function Section({ title, children }) {
    return (
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-bold text-ink">{title}</h2>
        <div className="space-y-4">{children}</div>
      </div>
    );
  }

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
