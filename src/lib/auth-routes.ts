import { userCan } from './permission-check';
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
    path.startsWith('/dashboard/') ||
    // Operational planning is internal — customers only see their own
    // appointments here; anonymous visitors are sent to login.
    path === '/planning' ||
    path.startsWith('/planning/')
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
  if (!returnTo.startsWith('/') || returnTo.startsWith('//')) return false;
  if (returnTo.includes('\\') || returnTo.includes('://')) return false;
  const path = returnTo.split(/[?#]/)[0] ?? '';
  if (!path.startsWith('/') || path.startsWith('//') || path.includes('@')) return false;
  return true;
}

/** Split a same-origin return path into pathname and search (`?view=week&date=...`). */
export function returnToParts(returnTo: string): { pathname: string; search: string } {
  const withoutHash = returnTo.split('#')[0] ?? returnTo;
  const queryIndex = withoutHash.indexOf('?');
  if (queryIndex === -1) return { pathname: withoutHash, search: '' };
  return {
    pathname: withoutHash.slice(0, queryIndex),
    search: withoutHash.slice(queryIndex),
  };
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
    case 'super_admin':
    case 'finance':
    case 'manager':
      return `/${locale}/admin`;
    case 'employee':
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
  if (isDemo) return role === 'admin' || role === 'super_admin' || role === 'manager' || role === 'finance' || role === 'employee' || role === 'staff';
  return role === 'admin' || role === 'super_admin' || role === 'manager' || role === 'finance' || role === 'employee' || role === 'staff';
}

const SUPER_ADMIN_PREFIXES = [
  '/audit',
  '/beveiliging',
  '/api-credentials',
  '/incidenten',
  '/systeem',
  '/systeembeheer',
];

export function isSuperAdminPath(pathname: string): boolean {
  const path = stripLocale(pathname);
  const adminPath = path.replace(/^\/admin(?=\/|$)/, '') || '/';
  return SUPER_ADMIN_PREFIXES.some(
    (prefix) => adminPath === prefix || adminPath.startsWith(`${prefix}/`),
  );
}

export function canAccessAdminRoute(role: Role | undefined, pathname: string, permissions?: readonly string[] | null): boolean {
  if (!canAccessAdmin(role, false)) return false;
  const path = stripLocale(pathname);
  const adminPath = path.replace(/^\/admin(?=\/|$)/, '') || '/';

  if (adminPath === '/instellingen') return role === 'admin' || role === 'super_admin' || !!permissions?.some(p => ['*', 'settings.view', 'settings.financial.view'].includes(p));

  if (adminPath === '/beheer/dashboard-shortcuts') return userCan({ role, permissions: permissions == null ? undefined : [...permissions] }, 'settings.update');

  const adminOnlyPrefixes = [
    '/beheer',
    '/gebruikers',
    '/audit',
    '/beveiliging',
    '/api-credentials',
    '/incidenten',
    '/systeem',
    '/sync',
    '/scan-logs',
  ];
  if (SUPER_ADMIN_PREFIXES.some((prefix) => adminPath === prefix || adminPath.startsWith(`${prefix}/`))) {
    return role === 'super_admin';
  }

  if (adminOnlyPrefixes.some((prefix) => adminPath === prefix || adminPath.startsWith(`${prefix}/`))) {
    return role === 'admin' || role === 'super_admin';
  }

  if (adminPath === '/') return canAccessAdmin(role, false);
  const routes: [string, string | readonly string[]][] = [
    ['/calculator', 'pricing.view'], ['/producten/nieuw', 'products.write'],
    ['/producten', 'products.view'], ['/product-stats', 'products.view'],
    ['/klanten', 'customers.view'], ['/boten', 'boats.view'],
    ['/stalling', 'stalling.view'], ['/kassa', 'kassa.view'],
    ['/facturen', 'invoice.view'], ['/betalingen', 'payment.view'],
    ['/financieel', 'invoice.view'], ['/rapportages', 'reports.view'],
    ['/werkorders', 'work_orders.view'], ['/planning', 'planning.view'],
    ['/kalender', 'planning.view'], ['/afspraken', 'planning.view'],
    ['/diensten-prijzen', 'products.view'], ['/diensten', 'products.view'],
    ['/product-groepen', 'products.view'], ['/bundels', 'products.view'],
    ['/makelaardij', 'settings.update'], ['/verkopen', 'settings.update'],
    ['/reminders', 'reminders.view'], ['/leveranciers', ['products.view', 'invoice.view']],
  ];
  for (const [prefix, permission] of routes) {
    if (adminPath === prefix || adminPath.startsWith(prefix + '/')) {
      return userCan({ role, permissions: permissions == null ? undefined : [...permissions] }, permission);
    }
  }
  return role === 'admin' || role === 'super_admin' || role === 'manager';
}

/** Verified sessions must also check work_orders.view. */
export function canAccessWorkOrders(role: Role | undefined): boolean {
  return userCan({ role }, 'work_orders.view');
}

export function isWorkOrdersPath(pathname: string): boolean {
  const path = stripLocale(pathname);
  return path === '/admin/werkorders' || path.startsWith('/admin/werkorders/');
}

export function canAccessPortal(
  role: Role | undefined,
  isPortalSession: boolean,
  isDemo: boolean
): boolean {
  if (isPortalSession) return true;
  if (isDemo && role === 'customer') return true;
  if (role === 'customer') return true;
  // Staff/admin may preview the customer portal while logged into the back office.
  if (canAccessAdmin(role, isDemo)) return true;
  return false;
}
