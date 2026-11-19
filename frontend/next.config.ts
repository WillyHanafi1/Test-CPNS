import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  cacheMaxMemorySize: 8 * 1024 * 1024,
  // Keep page generation within the shared server's memory budget.
  experimental: { cpus: 2 },
  ...(process.env.EXAM_STUDIO_ENABLED === "true" && { devIndicators: false as const }),
};

export default nextConfig;
