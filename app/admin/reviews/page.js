import { listReviews } from "@/lib/reviews-db";
import AdminNav from "@/components/admin/AdminNav";
import ReviewsManager from "@/components/admin/ReviewsManager";
import { AdminHeader } from "@/components/admin/AdminUI";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

export default async function AdminReviewsPage() {
  let reviews = [];
  try {
    reviews = await listReviews();
  } catch {
    reviews = [];
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav active="reviews" />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <AdminHeader
          title="গ্রাহক রিভিউ"
          subtitle="মেসেজ/কমেন্ট/রিভিউর স্ক্রিনশট আপলোড করো — সাইটে দেখাবে"
        />
        <ReviewsManager initial={reviews} />
      </main>
    </div>
  );
}
