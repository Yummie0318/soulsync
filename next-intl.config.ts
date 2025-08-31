// next-intl.config.ts
import { getRequestConfig } from 'next-intl/server';

export default getRequestConfig(async ({ locale }) => {
  const currentLocale = locale ?? 'en';

  return {
    locale: currentLocale,
    messages: (await import(`./src/messages/${currentLocale}.json`)).default
  };
});
