import type { NextConfig } from "next";
// Allow next/image (or fetches) from map tile / basemap hosts used in the app.

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
