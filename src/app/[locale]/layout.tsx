import { notFound } from 'next/navigation';
import { IntlProvider } from '@/i18n/IntlProvider';
import { getMessages, isLocale } from '@/i18n/getMessages';
import { locales } from '@/i18n/config';
import { AuthProvider } from '@/lib/auth-context';

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  if (!isLocale(params.locale)) notFound();
  const messages = getMessages(params.locale);

  return (
    <IntlProvider locale={params.locale} messages={messages}>
      <AuthProvider>{children}</AuthProvider>
    </IntlProvider>
  );
}
