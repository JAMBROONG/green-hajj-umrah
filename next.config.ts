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
  // Backward-compat: old DB records store URLs like /certificates/carbon-thankyou-xxx.jpg
  // but that path collides with the dynamic page route /certificates/[id] (pages win
  // over static files in Next.js). Rewrite those legacy filenames to the new API route
  // which can serve from disk without ambiguity.
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/certificates/:filename((?:carbon-thankyou|csr-cert)[^/]+\\.(?:jpe?g|png|webp))',
          destination: '/api/cert-files/:filename',
        },
      ],
    };
  },
};

export default nextConfig;
