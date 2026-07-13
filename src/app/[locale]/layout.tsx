import { notFound } from 'next/navigation';
import { IntlProvider } from '@/i18n/IntlProvider';
import { getMessages, isLocale } from '@/i18n/getMessages';
import { locales } from '@/i18n/config';
import { AuthProvider } from '@/lib/auth-context';
import { ToastProvider } from '@/components/ui/ToastProvider';
import { CmsProvider } from '@/components/cms/CmsProvider';
import { CmsToolbar } from '@/components/cms/CmsToolbar';

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const messages = getMessages(locale);

  return (
    <IntlProvider locale={locale} messages={messages}>
      <ToastProvider>
        <AuthProvider>
          <CmsProvider>
            <CmsToolbar />
            {children}
          </CmsProvider>
        </AuthProvider>
      </ToastProvider>
    </IntlProvider>
  );
}
