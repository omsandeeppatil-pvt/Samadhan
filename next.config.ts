import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Allows production builds to succeed even with ESLint errors.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;