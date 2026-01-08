import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { IntlProvider } from "@/components/providers/intl-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { locales } from "@/i18n/routing";
import "../globals.css";

export const metadata: Metadata = {
  title: "JMAP Webmail",
  description: "Minimalist webmail client using JMAP protocol",
};

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Validate that the incoming `locale` parameter is valid
  if (!(locales as readonly string[]).includes(locale)) notFound();

  // Load messages for the current locale
  let messages;
  try {
    messages = (await import(`@/locales/${locale}/common.json`)).default;
  } catch {
    notFound();
  }

  return (
    <>
      <script
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: `document.documentElement.lang = '${locale}';`,
        }}
      />
      <IntlProvider locale={locale} messages={messages}>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </IntlProvider>
    </>
  );
}
