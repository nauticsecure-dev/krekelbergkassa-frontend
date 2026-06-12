'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { authService } from '@/lib/services';
import { auth } from '@/lib/api';
import { useIntl } from '@/i18n/IntlProvider';

type State = 'verifying' | 'success' | 'error';

function VerifyInner() {
  const { locale, t } = useIntl();
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token');
  const [state, setState] = React.useState<State>('verifying');
  const ranRef = React.useRef(false);

  React.useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;
    if (!token) {
      setState('error');
      return;
    }
    void (async () => {
      try {
        const res = await authService.verifyMagicLink(token);
        if (!res.portal_token) throw new Error('no token');
        auth.setPortalSession(res.portal_token);
        setState('success');
        const dest = res.customer?.preferred_locale?.startsWith('en')
          ? 'en'
          : res.customer?.preferred_locale?.startsWith('de')
            ? 'de'
            : locale;
        setTimeout(() => router.replace(`/${dest}/feed`), 600);
      } catch {
        setState('error');
      }
    })();
  }, [token, locale, router]);

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-navy-100 bg-white p-8 text-center shadow-card">
        {state === 'verifying' ? (
          <>
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-marine-500" />
            <h1 className="mt-4 text-lg font-semibold text-navy-900">
              {t('verify.verifying')}
            </h1>
            <p className="mt-1 text-sm text-navy-500">{t('verify.verifyingHint')}</p>
          </>
        ) : state === 'success' ? (
          <>
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" />
            <h1 className="mt-4 text-lg font-semibold text-navy-900">{t('verify.success')}</h1>
            <p className="mt-1 text-sm text-navy-500">{t('verify.redirecting')}</p>
          </>
        ) : (
          <>
            <XCircle className="mx-auto h-10 w-10 text-rose-500" />
            <h1 className="mt-4 text-lg font-semibold text-navy-900">{t('verify.failed')}</h1>
            <p className="mt-1 text-sm text-navy-500">{t('verify.failedHint')}</p>
            <Link
              href={`/${locale}/login`}
              className="mt-5 inline-flex rounded-lg bg-navy-900 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-800"
            >
              {t('verify.backToLogin')}
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

export default function PortalVerifyPage() {
  return (
    <React.Suspense fallback={null}>
      <VerifyInner />
    </React.Suspense>
  );
}
