import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@machina/client",
    "@machina/core",
    "@machina/graph",
    "@machina/node-sdk",
    "@machina/plugin-core",
    "@machina/ui",
  ],
  async rewrites() {
    const runtime = process.env.MACHINA_RUNTIME_URL ?? "http://localhost:4000";
    return [
      {
        source: "/api/runtime/:path*",
        destination: `${runtime}/:path*`,
      },
    ];
  },
};

export default nextConfig;
