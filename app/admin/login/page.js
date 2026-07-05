// server component — DB থেকে ব্র্যান্ড নাম নিয়ে ফর্মে দেয়
// (আগে static config-এর "STORE" দেখাত, admin-এ সেট করা নাম না)
import { getSettings } from "@/lib/settings";
import LoginForm from "@/components/admin/LoginForm";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

export default async function AdminLogin() {
  const site = await getSettings();
  return <LoginForm brandName={site.brandName} />;
}
