import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const isDev = process.env.NODE_ENV !== "production";

// Inline scripts are needed by Next.js hydration ('unsafe-inline'); everything else is
// restricted to this origin. Images and 3D models may come from https URLs set in the admin.
// Paystack checkout is a full-page redirect, which CSP does not govern.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  `connect-src 'self' blob: data: https:${isDev ? " ws:" : ""}`,
  "media-src 'self' blob:",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  // Product images come from public assets or the R2 media route.
  images: {
    unoptimized: true,
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // Private pages and APIs must never be stored by shared caches.
      {
        source: "/(admin|account|cart|checkout)/:path*",
        headers: [
          { key: "Cache-Control", value: "private, no-store" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
      { source: "/api/(admin|auth|checkout)/:path*", headers: [{ key: "Cache-Control", value: "private, no-store" }] },
    ];
  },
  // Resource limits to prevent memory spikes & system freezing on machines with <= 4GB RAM
  experimental: {
    cpus: 1,
    workerThreads: false,
  },
  webpack: (config) => {
    config.parallelism = 1;
    return config;
  },
};

export default nextConfig;

// Exposes the D1 and R2 bindings from wrangler.jsonc to `next dev`.
initOpenNextCloudflareForDev();
