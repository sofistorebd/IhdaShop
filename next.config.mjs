/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone", // Docker/VPS deploy — ছোট self-contained build
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
    ],
  },
};

export default nextConfig;
