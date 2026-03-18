import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredBy: false,

  // Security headers applied to all routes
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },

  // Limit server actions body size
  serverExternalPackages: [],

  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.secondme.io",
      },
    ],
  },
};

export default nextConfig;
