import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'sk-assets.s3.amazonaws.com' },
    ],
  },
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
