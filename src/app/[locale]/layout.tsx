// src/app/[locale]/layout.tsx
import type { ReactNode } from "react";
import { NextIntlClientProvider } from "next-intl";
import { notFound } from "next/navigation";
import { use } from "react";

type Props = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

export default function LocaleLayout({ children, params }: Props) {
  const { locale } = use(params);
  console.log("📂 LocaleLayout -> Unwrapped params:", { locale });

  let messages;
  try {
    messages = require(`../../messages/${locale}.json`);
    console.log("✅ LocaleLayout -> Loaded messages:", messages);
  } catch (error) {
    console.error(`❌ No messages file found for locale: ${locale}`, error);
    notFound();
  }

  return (
    // ❌ don’t add <html> or <body> here
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
