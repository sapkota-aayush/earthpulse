import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "services.arcgisonline.com" },
      { protocol: "https", hostname: "server.arcgisonline.com" },
      { protocol: "https", hostname: "tile.openstreetmap.org" },
    ],
  },
};

export default nextConfig;
