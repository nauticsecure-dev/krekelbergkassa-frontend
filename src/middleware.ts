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
  repairEncodedQueryPath,
} from '@/lib/auth-routes';

const PUBLIC_FILE = /\.(.*)$/;
const LOCALE_COOKIE = 'krek_locale';

function localeFromPath(pathname: string): string {
  const seg = pathname.split('/')[1];
  if (seg && locales.includes(seg as (typeof locales)[number])) return seg;
  return defaultLocale;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

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

  const hasLocale = locales.some(
    (l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`)
  );

  if (!hasLocale) {
    const cookieLocale = req.cookies.get(LOCALE_COOKIE)?.value;
    const acceptLang = req.headers.get('accept-language') ?? '';
    const detected =
      cookieLocale && locales.includes(cookieLocale as (typeof locales)[number])
        ? cookieLocale
        : locales.find((l) => acceptLang.toLowerCase().includes(l)) ?? defaultLocale;

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
    applyLoginRedirect(url, locale, pathname);
    return NextResponse.redirect(url);
  }

  if (isPortalPath(pathname) && !hasPortalSession && !hasStaffSession) {
    const url = req.nextUrl.clone();
    applyLoginRedirect(url, locale, pathname);
    return NextResponse.redirect(url);
  }

  const hasSession = hasStaffSession || hasPortalSession;

  if (isAuthPath(pathname) && hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = defaultRedirectFromCookies(locale, hasStaffSession, hasPortalSession);
    url.search = '';
    return NextResponse.redirect(url);
  }

  if (isProtectedPath(pathname) || isAuthPath(pathname)) {
    const res = NextResponse.next();
    res.headers.set('Cache-Control', 'no-store');
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next|.*\\..*).*)'],
};
