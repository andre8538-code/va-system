import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config) => {
    config.externals.push("deno");
    return config;
  },
};

export default nextConfig;
