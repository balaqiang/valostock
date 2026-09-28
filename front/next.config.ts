import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Weapon-skin icons on /catalog/[id] come from the vinfo-api skin catalog
    // at runtime (src/lib/valorant/skins.ts).
    remotePatterns: [
      { protocol: "https", hostname: "vinfo-api.com", pathname: "/media/WeaponSkins/**" },
      // Catalog photos: public bucket of the local Supabase project "valostock".
      { protocol: "http", hostname: "127.0.0.1", port: "55321", pathname: "/storage/v1/object/public/**" },
      { protocol: "http", hostname: "localhost", port: "55321", pathname: "/storage/v1/object/public/**" },
    ],
    // next/image refuses private-network upstreams by default; the local Supabase is one.
    dangerouslyAllowLocalIP: true,
  },
  // Browsers request /favicon.ico by default — serve public/images/favicon.ico.
  async rewrites() {
    return [{ source: "/favicon.ico", destination: "/images/favicon.ico" }];
  },
};

export default nextConfig;
