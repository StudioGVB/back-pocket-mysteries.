import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  outputFileTracingExcludes: {
    "*": [
      "./public/**/*",
      "public/**/*",
      "./.git/**/*",
      "./.next/cache/**/*",
    ],
  },
  images: {
    dangerouslyAllowSVG: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  experimental: {
    instantNavigationDevToolsToggle: true,
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
};

export default nextConfig;

