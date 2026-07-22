import { StatCard, Card } from "./AdminUI";

const bn = (n) => Number(n || 0).toLocaleString("bn-BD");
const taka = (n) => "৳" + bn(n);

// হালকা CSS বার-চার্ট (কোনো লাইব্রেরি নেই)
function BarChart({ data, keys, labels, colors }) {
  const max = Math.max(1, ...data.flatMap((d) => keys.map((k) => d[k] || 0)));
  if (!data.length)
    return <p className="py-8 text-center text-sm text-gray-400">কোনো ডেটা নেই</p>;
  return (
    <div>
      <div className="flex items-end gap-2 overflow-x-auto pb-2" style={{ height: 160 }}>
        {data.map((d, i) => (
          <div key={i} className="flex min-w-[26px] flex-1 flex-col items-center justify-end gap-1">
            <div className="flex w-full items-end justify-center gap-0.5" style={{ height: 130 }}>
              {keys.map((k, ki) => (
                <div
                  key={k}
                  title={`${labels[ki]}: ${d[k] || 0}`}
                  className="w-3 rounded-t"
                  style={{
                    height: `${((d[k] || 0) / max) * 100}%`,
                    minHeight: d[k] ? 3 : 0,
                    background: colors[ki],
                  }}
                />
              ))}
            </div>
            <span className="whitespace-nowrap text-[10px] text-gray-400">{d.day}</span>
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-center gap-4">
        {labels.map((l, i) => (
          <span key={l} className="flex items-center gap-1 text-xs text-gray-500">
            <span className="h-2.5 w-2.5 rounded" style={{ background: colors[i] }} />
            {l}
          </span>
        ))}
      </div>
    </div>
  );
}

function Ranked({ rows, render, empty }) {
  if (!rows || !rows.length)
    return <p className="py-6 text-center text-sm text-gray-400">{empty}</p>;
  const max = Math.max(1, ...rows.map((r) => r.n));
  return (
    <ul className="space-y-2">
      {rows.map((r, i) => (
        <li key={i}>
          <div className="mb-1 flex items-center justify-between gap-2 text-sm">
            <span className="truncate text-gray-700">{render(r)}</span>
            <span className="shrink-0 font-semibold text-ink">{bn(r.n)}</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
            <div className="h-full rounded-full bg-brand" style={{ width: `${(r.n / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function AnalyticsView({ visitors, orders }) {
  const v = visitors || {};
  const o = orders || {};
  const st = o.status || {};

  return (
    <div className="space-y-6">
      {/* লাইভ + ভিজিটর */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          icon="🟢"
          tone="green"
          label="এখন অনলাইনে (৫ মিনিট)"
          value={bn(v.live)}
        />
        <StatCard icon="👣" label="আজকের ভিজিট" value={bn(v.pvToday)} />
        <StatCard icon="👤" tone="ink" label="আজ ইউনিক ভিজিটর" value={bn(v.uvToday)} />
        <StatCard icon="📅" tone="amber" label="৩০ দিনে ভিজিটর" value={bn(v.uv30d)} />
      </div>

      {/* বিক্রি */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon="💰" tone="green" label="আজকের বিক্রি" value={taka(o.revToday)} />
        <StatCard icon="📦" label="আজকের অর্ডার" value={bn(o.ordersToday)} />
        <StatCard icon="🧮" tone="ink" label="গড় অর্ডার (৩০দি.)" value={taka(o.aov)} />
        <StatCard icon="🏦" tone="amber" label="৩০ দিনে বিক্রি" value={taka(o.rev30)} />
      </div>

      {/* চার্ট: ভিজিটর + অর্ডার */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <h3 className="mb-3 text-sm font-semibold text-ink">শেষ ১৪ দিনের ভিজিটর</h3>
          <BarChart
            data={v.daily || []}
            keys={["pv", "uv"]}
            labels={["ভিজিট", "ইউনিক"]}
            colors={["var(--color-brand)", "#94a3b8"]}
          />
        </Card>
        <Card className="p-4">
          <h3 className="mb-3 text-sm font-semibold text-ink">শেষ ১৪ দিনের অর্ডার</h3>
          <BarChart
            data={o.daily || []}
            keys={["orders"]}
            labels={["অর্ডার"]}
            colors={["#16a34a"]}
          />
        </Card>
      </div>

      {/* অর্ডার স্ট্যাটাস */}
      <Card className="p-4">
        <h3 className="mb-3 text-sm font-semibold text-ink">অর্ডার স্ট্যাটাস</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {[
            ["⏳", "পেন্ডিং", st.pending],
            ["✅", "কনফার্ম", st.confirmed],
            ["🚚", "কুরিয়ারে", st.sent],
            ["🎉", "ডেলিভার্ড", st.delivered],
            ["❌", "বাতিল", st.cancelled],
          ].map(([ic, lb, val]) => (
            <div key={lb} className="rounded-xl bg-gray-50 p-3 text-center">
              <div className="text-xl">{ic}</div>
              <div className="mt-1 text-lg font-bold text-ink">{bn(val)}</div>
              <div className="text-xs text-gray-500">{lb}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* সোর্স + টপ প্রোডাক্ট + টপ পেজ */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-4">
          <h3 className="mb-3 text-sm font-semibold text-ink">ট্রাফিক সোর্স (৩০দি.)</h3>
          <Ranked
            rows={v.sources}
            empty="এখনো ভিজিট নেই"
            render={(r) => (r.source === "direct" ? "সরাসরি / অ্যাপ" : r.source)}
          />
        </Card>
        <Card className="p-4">
          <h3 className="mb-3 text-sm font-semibold text-ink">বেস্ট সেলিং (৩০দি.)</h3>
          <Ranked
            rows={o.top}
            empty="এখনো অর্ডার নেই"
            render={(r) => r.product || "—"}
          />
        </Card>
        <Card className="p-4">
          <h3 className="mb-3 text-sm font-semibold text-ink">জনপ্রিয় পেজ (৩০দি.)</h3>
          <Ranked
            rows={v.topPages}
            empty="এখনো ভিজিট নেই"
            render={(r) => r.path}
          />
        </Card>
      </div>

      <p className="text-center text-xs text-gray-400">
        ভিজিটর ডেটা প্রাইভেসি-বান্ধব — কোনো ব্যক্তিগত তথ্য সেভ হয় না।
      </p>
    </div>
  );
}
