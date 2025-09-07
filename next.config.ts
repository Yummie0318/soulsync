import createNextIntlPlugin from 'next-intl/plugin';
import { NextConfig } from 'next';

const withNextIntl = createNextIntlPlugin('./next-intl.config.ts');

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lpwfs3utrcvoqhxx.public.blob.vercel-storage.com',
        pathname: '/**',
      },
    ],
  },
};

export default withNextIntl(nextConfig);
