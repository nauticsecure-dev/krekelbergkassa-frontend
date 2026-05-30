import Cookies from 'js-cookie';
import { AUTH_COOKIE, PORTAL_COOKIE } from './api';

const AUTH_LS = 'krek_session';
const PORTAL_LS = 'krek_portal_session';

function cookieOptions(remember: boolean, expiresAt?: string) {
  let expires: number | Date = remember ? 30 : 7;
  if (expiresAt) {
    const date = new Date(expiresAt);
    if (!Number.isNaN(date.getTime())) {
      expires = date;
    }
  }
  return {
    expires,
    sameSite: 'lax' as const,
    secure: typeof window !== 'undefined' && window.location.protocol === 'https:',
    path: '/',
  };
}

export function setAuthToken(token: string, remember = true, expiresAt?: string) {
  Cookies.set(AUTH_COOKIE, token, cookieOptions(remember, expiresAt));
  if (typeof window !== 'undefined') {
    localStorage.setItem(AUTH_LS, token);
    if (expiresAt) {
      localStorage.setItem(`${AUTH_LS}_expires`, expiresAt);
    }
  }
}

export function getAuthToken(): string | undefined {
  const fromCookie = Cookies.get(AUTH_COOKIE);
  if (fromCookie) return fromCookie;
  if (typeof window !== 'undefined') {
    const fromStorage = localStorage.getItem(AUTH_LS);
    if (fromStorage) {
      Cookies.set(AUTH_COOKIE, fromStorage, cookieOptions(true, localStorage.getItem(`${AUTH_LS}_expires`) ?? undefined));
      return fromStorage;
    }
  }
  return undefined;
}

export function clearAuthToken() {
  Cookies.remove(AUTH_COOKIE, { path: '/' });
  if (typeof window !== 'undefined') {
    localStorage.removeItem(AUTH_LS);
    localStorage.removeItem(`${AUTH_LS}_expires`);
  }
}

export function setPortalToken(token: string, remember = true) {
  Cookies.set(PORTAL_COOKIE, token, {
    ...cookieOptions(remember),
    expires: remember ? 14 : 7,
  });
  if (typeof window !== 'undefined') {
    localStorage.setItem(PORTAL_LS, token);
  }
}

export function getPortalToken(): string | undefined {
  const fromCookie = Cookies.get(PORTAL_COOKIE);
  if (fromCookie) return fromCookie;
  if (typeof window !== 'undefined') {
    const fromStorage = localStorage.getItem(PORTAL_LS);
    if (fromStorage) {
      Cookies.set(PORTAL_COOKIE, fromStorage, { ...cookieOptions(true), expires: 14 });
      return fromStorage;
    }
  }
  return undefined;
}

export function clearPortalToken() {
  Cookies.remove(PORTAL_COOKIE, { path: '/' });
  if (typeof window !== 'undefined') {
    localStorage.removeItem(PORTAL_LS);
  }
}

export function hasStaffSession(): boolean {
  const token = getAuthToken();
  return !!token && !token.startsWith('demo::');
}

export function hasPortalSession(): boolean {
  return !!getPortalToken();
}

export function hasAnySession(): boolean {
  return !!getAuthToken() || !!getPortalToken();
}

const USER_CACHE_KEY = 'krek_user_cache';

export function readCachedUser<T>(): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(USER_CACHE_KEY);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function writeCachedUser(user: unknown | null) {
  if (typeof window === 'undefined') return;
  if (user) sessionStorage.setItem(USER_CACHE_KEY, JSON.stringify(user));
  else sessionStorage.removeItem(USER_CACHE_KEY);
}
