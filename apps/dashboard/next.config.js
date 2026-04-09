/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  distDir: 'dist',
  images: {
    unoptimized: true,
  },
  // Since we're serving from the same domain as the API
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/api/:path*',
          destination: 'http://localhost:3000/api/:path*',
        },
        {
          source: '/ws/:path*',
          destination: 'ws://localhost:3000/ws/:path*',
        },
      ],
    };
  },
};

module.exports = nextConfig;
