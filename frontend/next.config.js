/** @type {import('next').NextConfig} */
const nextConfig = {
  swcMinify: false,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:3001/api/:path*',
      },
    ];
  },
};

module.exports = nextConfig;