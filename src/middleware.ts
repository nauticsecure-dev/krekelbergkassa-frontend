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

  const prettyAdmin = pathname.match(
    new RegExp(
      `^/(${locales.join('|')})/admin/(producten|klanten|boten|stalling|leveranciers)/([^/]+)/([^/]+)/?$`
    )
  );
  const reservedSlug = new Set(['timeline', 'nieuw', 'edit', 'editor', 'import']);
  const rewritePath =
    prettyAdmin && !reservedSlug.has(prettyAdmin[4])
      ? `/${prettyAdmin[1]}/admin/${prettyAdmin[2]}/${prettyAdmin[3]}`
      : null;

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
  const res = rewritePath
    ? NextResponse.rewrite(new URL(rewritePath + req.nextUrl.search, req.url), {
        request: { headers: requestHeaders },
      })
    : NextResponse.next({ request: { headers: requestHeaders } });
  if (isProtectedPath(pathname) || isAuthPath(pathname)) {
    res.headers.set('Cache-Control', 'no-store');
  }
  return res;
}

export const config = {
  matcher: ['/((?!_next|.*\\..*).*)'],
};
