// গ্রাহকের মতামত — চাইলে এখানে নিজের রিভিউ/স্ক্রিনশট বসাও।
const reviews = [
  {
    name: "Fatema Akter",
    text: "কাপড়ের মান অসাধারণ! পর্দাও পরিপূর্ণ। আবার অর্ডার করব ইনশাআল্লাহ।",
    stars: 5,
  },
  {
    name: "Sumaiya Islam",
    text: "ডেলিভারি অনেক দ্রুত পেয়েছি। সাইজও একদম ঠিক ছিল। ধন্যবাদ।",
    stars: 5,
  },
  {
    name: "Nusrat Jahan",
    text: "এই দামে এত ভালো কোয়ালিটি আশা করিনি। খুবই সন্তুষ্ট।",
    stars: 5,
  },
];

export default function Reviews() {
  return (
    <section id="reviews" className="bg-white">
      <div className="mx-auto max-w-6xl px-4 py-14">
        <div className="mb-10 text-center">
          <span className="text-sm font-medium text-brand">বিশ্বস্ততা</span>
          <h2 className="mt-1 text-3xl font-bold text-brand-dark">
            গ্রাহকের প্রকৃত মতামত
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {reviews.map((r) => (
            <div
              key={r.name}
              className="rounded-2xl border border-gray-100 bg-gray-50 p-5 shadow-sm"
            >
              <p className="text-accent">{"★".repeat(r.stars)}</p>
              <p className="mt-3 text-sm text-gray-600">“{r.text}”</p>
              <div className="mt-4 flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-sm font-semibold text-white">
                  {r.name[0]}
                </span>
                <span className="text-sm font-semibold text-brand-dark">
                  {r.name}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
