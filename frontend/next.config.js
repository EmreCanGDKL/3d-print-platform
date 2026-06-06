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
  async rewrites() {
    const base =
      process.env.BACKEND_URL ||
      process.env.NEXT_PUBLIC_BACKEND_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3001');
    if (!base) return [];

    return [
      { source: '/api/auth/:path*', destination: `${base}/api/auth/:path*` },
      { source: '/api/ai/:path*', destination: `${base}/api/ai/:path*` },
      { source: '/api/models/:path*', destination: `${base}/api/models/:path*` },
      { source: '/api/chat/:path*', destination: `${base}/api/chat/:path*` },
      { source: '/api/examples/:path*', destination: `${base}/api/examples/:path*` },
      { source: '/api/images/:path*', destination: `${base}/api/images/:path*` },
      { source: '/api/admin/:path*', destination: `${base}/api/admin/:path*` },
      { source: '/api/print-quality/:path*', destination: `${base}/api/print-quality/:path*` },
    ];
  },
};

module.exports = nextConfig;
