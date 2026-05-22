import Cookies from 'js-cookie';

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api';
export const AUTH_COOKIE = 'krek_session';
export const LOCALE_COOKIE = 'krek_locale';

export type ApiError = {
  status: number;
  code?: string;
  message: string;
  data?: unknown;
};

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  auth?: boolean;
}

function buildUrl(path: string, query?: RequestOptions['query']) {
  const url = new URL(path.startsWith('http') ? path : `${API_BASE}${path}`);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

export async function api<T = unknown>(
  path: string,
  opts: RequestOptions = {}
): Promise<T> {
  const headers = new Headers(opts.headers);
  if (!(opts.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  headers.set('Accept', 'application/json');

  if (opts.auth !== false) {
    const token = Cookies.get(AUTH_COOKIE);
    if (token) headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(buildUrl(path, opts.query), {
    ...opts,
    headers,
    body:
      opts.body == null
        ? undefined
        : opts.body instanceof FormData
          ? opts.body
          : JSON.stringify(opts.body),
    credentials: 'include',
  });

  const isJson = res.headers
    .get('content-type')
    ?.toLowerCase()
    .includes('application/json');
  const payload = isJson ? await res.json().catch(() => null) : null;

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
};
