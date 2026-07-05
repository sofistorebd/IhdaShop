export const metadata = {
  robots: { index: false, follow: false },
  manifest: "/admin/manifest.webmanifest",
};

export default function AdminLayout({ children }) {
  return children;
}
