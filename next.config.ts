import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
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
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
  allowedDevOrigins: [
    'http://localhost:5000',
    'http://9005-idx-studio-1746374189150.cluster-nzwlpk54dvagsxetkvxzbvslyi.cloudworkstations.dev',
  ],
};

export default nextConfig;
