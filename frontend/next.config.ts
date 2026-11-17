import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Keep page generation within the shared server's memory budget.
  experimental: { cpus: 2 },
};

export default nextConfig;
