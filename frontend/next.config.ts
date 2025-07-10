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
  
  // Add redirects for better UX
  async redirects() {
    return [
      {
        source: '/board',
        destination: '/app/board',
        permanent: false,
      },
      {
        source: '/call',
        destination: '/app/call',
        permanent: false,
      },
      {
        source: '/session',
        destination: '/app/session',
        permanent: false,
      },
      {
        source: '/setup',
        destination: '/app/setup',
        permanent: false,
      },
      {
        source: '/overlay',
        destination: '/app/overlay',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
