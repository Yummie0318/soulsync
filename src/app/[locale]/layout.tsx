// src/app/[locale]/layout.tsx
import type { ReactNode } from "react";
import { NextIntlClientProvider } from "next-intl";
import { notFound } from "next/navigation";

type Props = {
  children: ReactNode;
  params: { locale: string };
};

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = params;
  console.log("📂 LocaleLayout -> Params:", { locale });

  let messages: Record<string, string>;
  try {
    messages = (await import(`../../messages/${locale}.json`)).default;
    console.log("✅ LocaleLayout -> Loaded messages:", messages);
  } catch (error) {
    console.error(`❌ No messages file found for locale: ${locale}`, error);
    notFound();
  }

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
