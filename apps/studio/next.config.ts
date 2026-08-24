import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@machina/core",
    "@machina/node-sdk",
    "@machina/plugin-core",
    "@machina/ui",
  ],
};

export default nextConfig;
