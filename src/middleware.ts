import { NextRequest, NextResponse } from 'next/server';
import { defaultLocale, locales } from '@/i18n/config';
import { AUTH_COOKIE, PORTAL_COOKIE } from '@/lib/api';
import {
  applyLoginRedirect,
  defaultRedirectFromCookies,
  isAdminPath,
  isAuthPath,
  isPortalPath,
  isProtectedPath,
  isSafeReturnTo,
  returnToParts,
  repairEncodedQueryPath,
} from '@/lib/auth-routes';

const PUBLIC_FILE = /\.(.*)$/;
const LOCALE_COOKIE = 'krek_locale';

function localeFromPath(pathname: string): string {
  const seg = pathname.split('/')[1];
  if (seg && locales.includes(seg as (typeof locales)[number])) return seg;
  return defaultLocale;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  // Enforce this before rewrites, including encoded paths. A catch-all route
  // alone runs after rewrites and cannot protect the backend network boundary.
  let decodedPath = pathname;
  try { decodedPath = decodeURIComponent(decodeURIComponent(pathname)).toLowerCase(); } catch { /* Invalid paths fail below. */ }
  if (/^\/api\/v1\/(?:admin\/)?quality(?:\/|$)/i.test(decodedPath)) {
    return new NextResponse(null, { status: 404, headers: { 'Cache-Control': 'private, no-store' } });
  }

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/icons') ||
    pathname === '/manifest.webmanifest' ||
    pathname === '/sw.js' ||
    pathname === '/offline' ||
    pathname === '/favicon.svg' ||
    pathname === '/favicon.ico' ||
    PUBLIC_FILE.test(pathname)
  ) {
    return NextResponse.next();
  }

  let activeLocales: readonly string[] = locales;
  let configuredDefault: string = defaultLocale;
  try {
    const response = await fetch(new URL('/api/v1/i18n/locales', req.url), { cache: 'no-store', signal: AbortSignal.timeout(2000) });
    if (response.ok) {
      const configuration = await response.json();
      const enabled = configuration.supported_locales?.filter((item: { enabled: boolean }) => item.enabled).map((item: { code: string }) => item.code.split('-')[0]).filter((code: string) => locales.includes(code as typeof locales[number]));
      if (enabled?.length) {
        activeLocales = enabled;
        const candidate = configuration.default_locale?.split('-')[0];
        configuredDefault = enabled.includes(candidate) ? candidate : enabled[0];
      }
    }
  } catch { /* Keep routes available during a backend outage. */ }
  const pathLocale = pathname.split('/')[1];
  if (locales.includes(pathLocale as typeof locales[number]) && !activeLocales.includes(pathLocale)) {
    const url = req.nextUrl.clone();
    url.pathname = '/' + configuredDefault + pathname.slice(pathLocale.length + 1);
    return NextResponse.redirect(url);
  }
  const hasLocale = locales.some(
    (l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`)
  );

  if (!hasLocale) {
    const cookieLocale = req.cookies.get(LOCALE_COOKIE)?.value;
    const acceptLang = req.headers.get('accept-language') ?? '';
    const detected =
      cookieLocale && activeLocales.includes(cookieLocale)
        ? cookieLocale
        : activeLocales.find((l) => acceptLang.toLowerCase().includes(l)) ?? configuredDefault;

    const url = req.nextUrl.clone();
    url.pathname = `/${detected}${pathname === '/' ? '' : pathname}`;
    return NextResponse.redirect(url);
  }

  const locale = localeFromPath(pathname);

  const repaired = repairEncodedQueryPath(pathname);
  if (repaired) {
    const url = req.nextUrl.clone();
    url.pathname = repaired.pathname;
    url.search = repaired.search;
    return NextResponse.redirect(url);
  }

  const staffToken = req.cookies.get(AUTH_COOKIE)?.value;
  const portalToken = req.cookies.get(PORTAL_COOKIE)?.value;
  const hasStaffSession = !!staffToken;
  const hasPortalSession = !!portalToken;

  if (isAdminPath(pathname) && !hasStaffSession) {
    const url = req.nextUrl.clone();
    applyLoginRedirect(url, locale, `${pathname}${req.nextUrl.search}`);
    return NextResponse.redirect(url);
  }

  if (isPortalPath(pathname) && !hasPortalSession && !hasStaffSession) {
    const url = req.nextUrl.clone();
    applyLoginRedirect(url, locale, `${pathname}${req.nextUrl.search}`);
    return NextResponse.redirect(url);
  }

  const hasSession = hasStaffSession || hasPortalSession;

  if (isAuthPath(pathname) && hasSession) {
    const url = req.nextUrl.clone();
    const returnTo = url.searchParams.get('returnTo');
    if (isSafeReturnTo(returnTo)) {
      const parts = returnToParts(returnTo);
      url.pathname = parts.pathname;
      url.search = parts.search;
      return NextResponse.redirect(url);
    }
    url.pathname = defaultRedirectFromCookies(locale, hasStaffSession, hasPortalSession);
    url.search = '';
    return NextResponse.redirect(url);
  }

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-locale', locale);
  // Readable admin URLs have native [id]/[slug] pages. Rewriting those URLs
  // back into this server adds a proxy hop that can time out during compilation.
  const res = NextResponse.next({ request: { headers: requestHeaders } });
  if (isProtectedPath(pathname) || isAuthPath(pathname)) {
    res.headers.set('Cache-Control', 'no-store');
  }
  return res;
}

export const config = {
  matcher: ['/((?!_next|.*\\..*).*)'],
};
