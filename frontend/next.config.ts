import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: 'standalone',
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    ignoreBuildErrors: true,
  },
  // Reduce build complexity to avoid memory issues
  experimental: {
    optimizePackageImports: [],
  },
  // Disable some optimizations that might cause memory issues
  compiler: {
    removeConsole: false,
  },
};

export default nextConfig;
