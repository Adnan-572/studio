
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
        hostname: 'placehold.co', // For placeholder images
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com', // For Firebase Storage images
        port: '',
        pathname: '/**',
      }
    ],
  },
  // Remove allowedDevOrigins if not needed for specific Genkit/Firebase emulator setups
  // allowedDevOrigins: [ 
  //   'http://localhost:5000',
  //   'http://3001-idx-studio-1746374189150.cluster-nzwlpk54dvagsxetkvxzbvslyi.cloudworkstations.dev',
  // ],
};

export default nextConfig;
