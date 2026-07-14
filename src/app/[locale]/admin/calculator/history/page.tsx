'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useIntl } from '@/i18n/IntlProvider';

export default function CalculatorHistoryPage() {
  const { locale } = useIntl();
  const router = useRouter();
  React.useEffect(() => {
    router.replace(`/${locale}/admin/calculator`);
  }, [locale, router]);
  return null;
}
