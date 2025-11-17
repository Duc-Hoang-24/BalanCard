import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_UNSPLASH_ACCESS_KEY: process.env.UNSPLASH_ACCESS_KEY,
  }
};

export default nextConfig;
