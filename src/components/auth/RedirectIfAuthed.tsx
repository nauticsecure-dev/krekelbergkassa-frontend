'use client';

import * as React from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  defaultRedirectForRole,
  isAuthPath,
  isSafeReturnTo,
} from '@/lib/auth-routes';
import { useIntl } from '@/i18n/IntlProvider';

export function RedirectIfAuthed({ children }: { children: React.ReactNode }) {
  const { user, loading, isPortalSession } = useAuth();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { locale } = useIntl();

  React.useEffect(() => {
    if (loading || !user) return;
    if (!isAuthPath(pathname)) return;

    const returnTo = searchParams.get('returnTo');
    if (isSafeReturnTo(returnTo)) {
      router.replace(returnTo);
      return;
    }

    if (isPortalSession || user.role === 'customer') {
      router.replace(`/${locale}/feed`);
      return;
    }

    router.replace(defaultRedirectForRole(user.role, locale));
  }, [loading, user, isPortalSession, pathname, searchParams, router, locale]);

  if (loading && isAuthPath(pathname)) {
    return (
      <div className="flex min-h-[280px] items-center justify-center">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-navy-200 border-t-navy-700" />
      </div>
    );
  }

  if (!loading && user && isAuthPath(pathname)) {
    return (
      <div className="flex min-h-[280px] items-center justify-center">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-navy-200 border-t-navy-700" />
      </div>
    );
  }

  return <>{children}</>;
}
