import type { Role } from './auth-context';

export const AUTH_PATHS = ['/login', '/signup', '/forgot-password'] as const;

export function stripLocale(pathname: string): string {
  const match = pathname.match(/^\/([a-z]{2})(\/.*)?$/);
  if (!match) return pathname;
  return match[2] || '/';
}

export function isAuthPath(pathname: string): boolean {
  const path = stripLocale(pathname);
  return AUTH_PATHS.some((p) => path === p || path.startsWith(`${p}/`));
}

export function isAdminPath(pathname: string): boolean {
  const path = stripLocale(pathname);
  return path === '/admin' || path.startsWith('/admin/');
}

export function isPortalPath(pathname: string): boolean {
  const path = stripLocale(pathname);
  return (
    path === '/feed' ||
    path.startsWith('/feed/') ||
    path === '/dashboard' ||
    path.startsWith('/dashboard/')
  );
}

export function isProtectedPath(pathname: string): boolean {
  return isAdminPath(pathname) || isPortalPath(pathname);
}

export function loginPath(locale: string, returnTo?: string): string {
  const base = `/${locale}/login`;
  if (!returnTo) return base;
  return `${base}?returnTo=${encodeURIComponent(returnTo)}`;
}

/** Use in middleware — pathname and query must be set separately on NextURL. */
export function applyLoginRedirect(url: URL, locale: string, returnTo?: string) {
  url.pathname = `/${locale}/login`;
  url.search = '';
  if (returnTo) {
    url.searchParams.set('returnTo', returnTo);
  }
}

export function isSafeReturnTo(returnTo: string | null): returnTo is string {
  if (!returnTo) return false;
  if (!returnTo.startsWith('/')) return false;
  if (returnTo.includes('://')) return false;
  return !returnTo.includes('?');
}

/** Repair paths like /en/login%3FreturnTo=%2Fen%2Fadmin → /en/login?returnTo=... */
export function repairEncodedQueryPath(pathname: string): { pathname: string; search: string } | null {
  if (!pathname.includes('%3F') && !pathname.includes('%3f')) return null;
  try {
    const decoded = decodeURIComponent(pathname);
    const qIndex = decoded.indexOf('?');
    if (qIndex === -1) return null;
    return {
      pathname: decoded.slice(0, qIndex),
      search: decoded.slice(qIndex),
    };
  } catch {
    return null;
  }
}

export function defaultRedirectForRole(role: Role, locale: string): string {
  switch (role) {
    case 'admin':
    case 'manager':
      return `/${locale}/admin`;
    case 'staff':
      return `/${locale}/admin/kassa`;
    case 'customer':
    default:
      return `/${locale}/feed`;
  }
}

export function defaultRedirectFromCookies(
  locale: string,
  hasStaff: boolean,
  hasPortal: boolean
): string {
  if (hasStaff) return `/${locale}/admin`;
  if (hasPortal) return `/${locale}/feed`;
  return `/${locale}/login`;
}

export function canAccessAdmin(role: Role | undefined, isDemo: boolean): boolean {
  if (!role) return false;
  if (isDemo) return role === 'admin' || role === 'manager' || role === 'staff';
  return role === 'admin' || role === 'manager' || role === 'staff';
}

export function canAccessPortal(
  role: Role | undefined,
  isPortalSession: boolean,
  isDemo: boolean
): boolean {
  if (isPortalSession) return true;
  if (isDemo && role === 'customer') return true;
  return role === 'customer';
}
