import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Browsers request /favicon.ico by default — serve public/images/favicon.ico.
  async rewrites() {
    return [{ source: "/favicon.ico", destination: "/images/favicon.ico" }];
  },
  // The game list lives on the home page (docs/SITEMAP.md).
  async redirects() {
    return [{ source: "/topup", destination: "/", permanent: false }];
  },
};

export default nextConfig;
