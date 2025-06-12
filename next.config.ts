import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co', // For placeholder images
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com', // For Firebase Storage images
        port: '',
        pathname: '/**',
      },
    ],
  },
  // allowedDevOrigins: [ 
  //   'http://localhost:5000',
  //   'http://3001-idx-studio-1746374189150.cluster-nzwlpk54dvagsxetkvxzbvslyi.cloudworkstations.dev',
  // ],
};

export default nextConfig;
