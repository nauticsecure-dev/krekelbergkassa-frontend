import Cookies from 'js-cookie';
import { queueOfflineChange } from './offline-sync';

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api';
export const AUTH_COOKIE = 'krek_session';
export const PORTAL_COOKIE = 'krek_portal_session';
export const LOCALE_COOKIE = 'krek_locale';

export type ApiError = {
  status: number;
  code?: string;
  message: string;
  data?: unknown;
};

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  auth?: boolean;
  portalAuth?: boolean;
  queueWhenOffline?: boolean;
}

function buildUrl(path: string, query?: RequestOptions['query']) {
  const url = new URL(path.startsWith('http') ? path : `${API_BASE}${path}`);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== '') {
        url.searchParams.set(k, String(v));
      }
    }
  }
  return url.toString();
}

function isLikelyOfflineError(err: unknown) {
  if (!(err instanceof Error)) return false;
  return /fetch|network|Failed to fetch/i.test(err.message);
}

export async function api<T = unknown>(
  path: string,
  opts: RequestOptions = {}
): Promise<T> {
  const credentialsMode =
    opts.credentials ?? (API_BASE.startsWith('/') ? 'same-origin' : 'omit');

  const headers = new Headers(opts.headers);
  if (!(opts.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  headers.set('Accept', 'application/json');

  if (opts.auth !== false) {
    const token = Cookies.get(AUTH_COOKIE);
    if (token) headers.set('Authorization', `Bearer ${token}`);
  }

  if (opts.portalAuth) {
    const portal = Cookies.get(PORTAL_COOKIE);
    if (portal) headers.set('Authorization', `Bearer ${portal}`);
  }

  try {
    const res = await fetch(buildUrl(path, opts.query), {
      ...opts,
      headers,
      body:
        opts.body == null
          ? undefined
          : opts.body instanceof FormData
            ? opts.body
            : JSON.stringify(opts.body),
      credentials: credentialsMode,
    });

    const contentType = res.headers.get('content-type')?.toLowerCase() ?? '';
    const isJson = contentType.includes('application/json');
    const isPdf = contentType.includes('application/pdf');

    let payload: unknown = null;
    if (isJson) {
      payload = await res.json().catch(() => null);
    } else if (isPdf) {
      payload = await res.blob();
    } else if (res.status !== 204) {
      payload = await res.text().catch(() => null);
    }

    if (!res.ok) {
      const err: ApiError = {
        status: res.status,
        message:
          (payload && typeof payload === 'object' && 'message' in payload
            ? String((payload as Record<string, unknown>).message)
            : null) ?? res.statusText,
        code:
          (payload && typeof payload === 'object' && 'code' in payload
            ? String((payload as Record<string, unknown>).code)
            : undefined),
        data: payload,
      };
      throw err;
    }

    return (payload as T) ?? (undefined as T);
  } catch (err) {
    if (
      opts.queueWhenOffline &&
      typeof window !== 'undefined' &&
      !window.navigator.onLine &&
      isLikelyOfflineError(err)
    ) {
      await queueOfflineChange({
        endpoint: path,
        method: opts.method ?? 'GET',
        payload: opts.body ?? null,
      });
    }
    throw err;
  }
}

export const auth = {
  setSession(token: string, remember = true) {
    Cookies.set(AUTH_COOKIE, token, {
      expires: remember ? 30 : undefined,
      sameSite: 'lax',
      secure: typeof window !== 'undefined' && window.location.protocol === 'https:',
      path: '/',
    });
  },
  clearSession() {
    Cookies.remove(AUTH_COOKIE, { path: '/' });
  },
  getToken(): string | undefined {
    return Cookies.get(AUTH_COOKIE);
  },
  setPortalSession(token: string, remember = true) {
    Cookies.set(PORTAL_COOKIE, token, {
      expires: remember ? 14 : undefined,
      sameSite: 'lax',
      secure: typeof window !== 'undefined' && window.location.protocol === 'https:',
      path: '/',
    });
  },
  clearPortalSession() {
    Cookies.remove(PORTAL_COOKIE, { path: '/' });
  },
  getPortalToken(): string | undefined {
    return Cookies.get(PORTAL_COOKIE);
  },
};
