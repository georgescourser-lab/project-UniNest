import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: '/index.html',
        destination: '/',
        permanent: true,
      },
      {
        source: '/home',
        destination: '/',
        permanent: true,
      },
      {
        source: '/index',
        destination: '/',
        permanent: true,
      },
      {
        source: '/marketplace',
        destination: '/marketplace.html',
        permanent: false,
      },
      {
        source: '/property',
        destination: '/search',
        permanent: false,
      },
      {
        source: '/dashboard',
        destination: '/profile',
        permanent: false,
      },
      {
        source: '/search.html',
        destination: '/search',
        permanent: true,
      },
      {
        source: '/agents.html',
        destination: '/agents',
        permanent: true,
      },
    ];
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
    proxyClientMaxBodySize: '50mb',
  },
};

export default nextConfig;
