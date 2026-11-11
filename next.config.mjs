import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Product images come from public assets or the R2 media route.
  images: {
    unoptimized: true,
  },
};

export default nextConfig;

// Exposes the D1 and R2 bindings from wrangler.jsonc to `next dev`.
initOpenNextCloudflareForDev();
