import { features } from "@/config";

export default function Features() {
  return (
    <section className="border-y border-gray-100 bg-white">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-4 px-4 py-10 md:grid-cols-4">
        {features.map((f) => (
          <div
            key={f.title}
            className="flex flex-col items-center rounded-2xl p-4 text-center transition hover:bg-brand-light"
          >
            <span className="text-3xl">{f.icon}</span>
            <h3 className="mt-3 font-semibold text-brand-dark">{f.title}</h3>
            <p className="mt-1 text-xs text-gray-500">{f.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
