'use client';


import { TranslatedText } from '@/components/cms/TranslatedText';
import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { customerReturnTo, loginPath } from '@/lib/auth-routes';
import { Logo } from '@/components/ui/Logo';
import { useIntl } from '@/i18n/IntlProvider';

type State = 'verifying' | 'success' | 'error';

function VerifyInner() {
  const { locale } = useIntl();
  const { verifyCustomerMagicLink } = useAuth();
  const params = useSearchParams();
  const token = params.get('token');
  const returnTo = customerReturnTo(params.get('returnTo'));
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
        const customer = await verifyCustomerMagicLink(token);
        const preferredLocale = customer.locale?.slice(0, 2);
        const destinationLocale = preferredLocale && ['nl', 'en', 'de', 'fr'].includes(preferredLocale) ? preferredLocale : locale;
        setState('success');
        window.location.replace(returnTo ?? `/${destinationLocale}/feed`);
      } catch {
        setState('error');
      }
    })();
  }, [token, locale, returnTo, verifyCustomerMagicLink]);

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-navy-100 bg-white p-8 text-center shadow-card">
        <Logo editable={false} />
        {state === 'verifying' ? (
          <>
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-marine-500" />
            <h1 className="mt-4 text-lg font-semibold text-navy-900">
              {<TranslatedText textKey={'verify.verifying'} />}
            </h1>
            <p className="mt-1 text-sm text-navy-500">{<TranslatedText textKey={'verify.verifyingHint'} />}</p>
          </>
        ) : state === 'success' ? (
          <>
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" />
            <h1 className="mt-4 text-lg font-semibold text-navy-900">{<TranslatedText textKey={'verify.success'} />}</h1>
            <p className="mt-1 text-sm text-navy-500">{<TranslatedText textKey={'verify.redirecting'} />}</p>
          </>
        ) : (
          <>
            <XCircle className="mx-auto h-10 w-10 text-rose-500" />
            <h1 className="mt-4 text-lg font-semibold text-navy-900">{<TranslatedText textKey={'verify.failed'} />}</h1>
            <p className="mt-1 text-sm text-navy-500">{<TranslatedText textKey={'verify.failedHint'} />}</p>
            <Link
              href={loginPath(locale, returnTo)}
              className="mt-5 inline-flex rounded-lg bg-navy-900 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-800"
            >
              {<TranslatedText textKey={'verify.backToLogin'} />}
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
