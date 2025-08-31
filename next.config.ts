import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./next-intl.config.ts');

const nextConfig = {
  // any Next.js config you want to add later
};

export default withNextIntl(nextConfig);
