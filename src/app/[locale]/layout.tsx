// src/app/[locale]/layout.tsx
import type { ReactNode } from "react";
import { NextIntlClientProvider } from "next-intl";
import { notFound } from "next/navigation";

type LocaleLayoutProps = {
  children: ReactNode;
  params: Promise<{ locale: string }>; // ✅ params is a Promise
};

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale } = await params; // ✅ must await
  // console.log("📂 LocaleLayout -> Params:", { locale });

  let messages: Record<string, string>;
  try {
    messages = (await import(`../../messages/${locale}.json`)).default;
    // console.log("✅ LocaleLayout -> Loaded messages:", messages);
  } catch (error) {
    // console.error(`❌ No messages file found for locale: ${locale}`, error);
    notFound();
  }

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
