'use client';

import * as React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  canAccessAdmin,
  canAccessPortal,
  canAccessWorkOrders,
  isAdminPath,
  isPortalPath,
  isProtectedPath,
  isWorkOrdersPath,
  loginPath,
} from '@/lib/auth-routes';
import { hasAnySession } from '@/lib/auth-storage';
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

  const protectedRoute = isProtectedPath(pathname);
  const sessionHint = typeof window !== 'undefined' && hasAnySession();

  const needsLogin = React.useMemo(() => {
    if (!protectedRoute) return false;
    // Token present — wait for /me before treating as logged out.
    if (!user && sessionHint) return false;
    if (!user) return true;
    if (isAdminPath(pathname) && !canAccessAdmin(user.role, isDemo)) return true;
    if (isPortalPath(pathname) && !canAccessPortal(user.role, isPortalSession, isDemo)) {
      return true;
    }
    return false;
  }, [pathname, user, isDemo, isPortalSession, protectedRoute, sessionHint]);

  const deniedWorkOrders =
    !!user && isWorkOrdersPath(pathname) && !canAccessWorkOrders(user.role);

  const resolvingAuth = loading || (sessionHint && !user);

  // Role-based redirect — no full-page login fallback, no dashboard flash loop.
  React.useEffect(() => {
    if (!deniedWorkOrders) return;
    router.replace(`/${locale}/admin`);
  }, [deniedWorkOrders, router, locale]);

  // Login redirect only when auth check finished and there is no session token.
  React.useEffect(() => {
    if (resolvingAuth || !protectedRoute) return;
    if (!needsLogin) return;
    router.replace(loginPath(locale, pathname));
  }, [resolvingAuth, needsLogin, protectedRoute, router, locale, pathname]);

  if (deniedWorkOrders) {
    return null;
  }

  if (protectedRoute && resolvingAuth) {
    return <AuthLoading />;
  }

  if (!loading && needsLogin) {
    return <AuthLoading />;
  }

  return <>{children}</>;
}
