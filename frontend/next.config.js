/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    cpus: 1,
    workerThreads: true,
    webpackBuildWorker: false,
  },
  async redirects() {
    return [
      {
        source: '/',
        destination: '/login',
        permanent: false,
      },
    ];
  },
  async rewrites() {
    const base = process.env.BACKEND_URL || 'http://localhost:3001';
    return [
      { source: '/api/auth/:path*', destination: `${base}/api/auth/:path*` },
      { source: '/api/ai/:path*', destination: `${base}/api/ai/:path*` },
      { source: '/api/models/:path*', destination: `${base}/api/models/:path*` },
      { source: '/api/chat/:path*', destination: `${base}/api/chat/:path*` },
    ];
  },
};

module.exports = nextConfig;
