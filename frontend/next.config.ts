import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,

  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://13.233.118.206/api/:path*",
      },
    ];
  },
};

export default nextConfig;