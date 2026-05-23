'use client';

import * as React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  canAccessAdmin,
  canAccessPortal,
  isAdminPath,
  isPortalPath,
  loginPath,
} from '@/lib/auth-routes';
import { useIntl } from '@/i18n/IntlProvider';

function AuthLoading() {
  return (
    <div className="app-canvas flex min-h-screen items-center justify-center">
      <div className="surface-float flex flex-col items-center gap-3 px-8 py-10">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-navy-200 border-t-navy-700" />
        <span className="text-sm font-medium text-navy-500">Loading…</span>
      </div>
    </div>
  );
}

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading, isDemo, isPortalSession } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const { locale } = useIntl();

  React.useEffect(() => {
    if (loading) return;

    const admin = isAdminPath(pathname);
    const portal = isPortalPath(pathname);

    if (admin && !canAccessAdmin(user?.role, isDemo)) {
      router.replace(loginPath(locale, pathname));
      return;
    }

    if (portal && !canAccessPortal(user?.role, isPortalSession, isDemo)) {
      router.replace(loginPath(locale, pathname));
      return;
    }

    if (!user && (admin || portal)) {
      router.replace(loginPath(locale, pathname));
    }
  }, [loading, user, isDemo, isPortalSession, pathname, router, locale]);

  if (loading) return <AuthLoading />;
  if (!user && (isAdminPath(pathname) || isPortalPath(pathname))) return <AuthLoading />;

  if (isAdminPath(pathname) && !canAccessAdmin(user?.role, isDemo)) return <AuthLoading />;
  if (isPortalPath(pathname) && !canAccessPortal(user?.role, isPortalSession, isDemo)) {
    return <AuthLoading />;
  }

  return <>{children}</>;
}
