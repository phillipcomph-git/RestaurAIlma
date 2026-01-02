
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Garante que imagens externas (como as do Google) funcionem
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
};

module.exports = nextConfig;
