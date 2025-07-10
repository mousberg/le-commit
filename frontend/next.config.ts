import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: 'standalone',
  
  // Add rewrites for subdomain handling
  async rewrites() {
    return [
      {
        source: '/app/:path*',
        destination: '/app/:path*',
      },
    ];
  },
  
  // Redirects removed to allow middleware to handle waitlist protection
};

export default nextConfig;
