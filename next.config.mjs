import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Product images come from public assets or the R2 media route.
  images: {
    unoptimized: true,
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
