import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Weapon-skin icons on /catalog/[id] come from the vinfo-api skin catalog
    // at runtime (src/lib/valorant/skins.ts) — the only remote image source.
    remotePatterns: [
      { protocol: "https", hostname: "vinfo-api.com", pathname: "/media/WeaponSkins/**" },
    ],
  },
  // Browsers request /favicon.ico by default — serve public/images/favicon.ico.
  async rewrites() {
    return [{ source: "/favicon.ico", destination: "/images/favicon.ico" }];
  },
};

export default nextConfig;
