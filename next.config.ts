import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // output: 'standalone',
  reactCompiler: true,
  turbopack: {},
  images: {
    localPatterns: [
      { pathname: '/api/image-proxy/**' },
    ],
    remotePatterns: [
      { protocol: 'http', hostname: '**' },
      { protocol: 'https', hostname: '**' },
    ],
  },
};

export default nextConfig;
