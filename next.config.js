/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      'cdn.shopify.com', // Shopify CDN
      'placehold.co',    // Placeholder images
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.shopify.com',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: 'placehold.co',
        pathname: '**',
      },
    ],
  },
  // Ensure CSS modules are properly processed
  webpack: (config) => {
    return config;
  },
};

module.exports = nextConfig;
