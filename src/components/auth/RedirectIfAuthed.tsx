'use client';

import * as React from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  customerReturnTo,
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

  const hasResetToken = pathname.endsWith("/forgot-password") && (searchParams.has("token") || searchParams.has("setup"));
  React.useEffect(() => {
    if (hasResetToken) return;
    if (loading || !user) return;
    if (!isAuthPath(pathname)) return;

    const value = searchParams.get('returnTo');
    const returnTo = user.role === 'customer' ? customerReturnTo(value) ?? null : value;
    if (isSafeReturnTo(returnTo)) {
      router.replace(returnTo);
      return;
    }

    if (isPortalSession || user.role === 'customer') {
      router.replace(`/${locale}/feed`);
      return;
    }

    router.replace(defaultRedirectForRole(user.role, locale));
  }, [loading, user, isPortalSession, pathname, searchParams, router, locale, hasResetToken]);

  if (hasResetToken) return <>{children}</>;

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
