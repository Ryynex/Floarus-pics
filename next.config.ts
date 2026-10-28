import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  // The generation route reads bundled catalog references from disk
  // (`public/reference_*`), so those files must ship inside the serverless
  // function bundle. Without this, local reference lookups 404 on hosts that
  // only publish `public/` to the CDN.
  outputFileTracingIncludes: {
    "/api/generate": [
      "./public/reference_shoots/**/*",
      "./public/reference_suits/**/*",
      "./public/reference_poses/**/*",
      "./public/reference_backgrounds/**/*",
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
        ],
      },
    ];
  },
};

export default nextConfig;
