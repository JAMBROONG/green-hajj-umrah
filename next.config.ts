import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // output: 'standalone',
  reactCompiler: true,
  turbopack: {},
  images: {
    localPatterns: [
      { pathname: '/api/image-proxy/**' },
      // Static assets in /public — whitelist root files + subfolders
      { pathname: '/**' },
    ],
    remotePatterns: [
      { protocol: 'http', hostname: '**' },
      { protocol: 'https', hostname: '**' },
    ],
  },
  async headers() {
    // Allow Midtrans Snap iframe to use Clipboard API (copy VA numbers, etc.)
    const midtransOrigins = '"https://app.sandbox.midtrans.com" "https://app.midtrans.com"';
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Permissions-Policy',
            value: `clipboard-write=(self ${midtransOrigins}), clipboard-read=(self ${midtransOrigins})`,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
