// অ্যাডমিনের শেয়ার্ড UI কম্পোনেন্ট (প্রেজেন্টেশনাল)

export function AdminHeader({ title, subtitle, action }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold text-ink">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Card({ children, className = "" }) {
  return (
    <div
      className={`rounded-2xl border border-gray-100 bg-white shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}

export function StatCard({ icon, label, value, tone = "brand" }) {
  const tones = {
    brand: "bg-brand-light text-brand",
    amber: "bg-amber-100 text-amber-700",
    green: "bg-green-100 text-green-700",
    ink: "bg-gray-100 text-ink",
  };
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl ${tones[tone]}`}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p className="truncate text-xs text-gray-500">{label}</p>
        <p className="text-lg font-bold text-ink">{value}</p>
      </div>
    </div>
  );
}
