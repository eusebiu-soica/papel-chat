import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Skip ESLint during production builds to avoid build failures from dev-only lint rules
    // This keeps the build working on Vercel while allowing local linting during development.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
