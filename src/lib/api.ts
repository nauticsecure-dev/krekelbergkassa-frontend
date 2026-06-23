import {
  clearAuthToken,
  clearPortalToken,
  getAuthToken,
  getPortalToken,
  setAuthToken,
  setPortalToken,
} from './auth-storage';
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
  /** Trello #104: correlation id echoed by the backend (X-Request-Id). */
  requestId?: string;
};

const REQUEST_TIMEOUT_MS = 25_000;

/** Trello #104: generate a correlation id sent as X-Request-Id. */
function generateRequestId(): string {
  try {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return `req_${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`;
    }
  } catch {
    /* fall through */
  }
  return `req_${Math.random().toString(36).slice(2, 12)}${Math.random().toString(36).slice(2, 8)}`;
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  query?: Record<
    string,
    string | number | boolean | undefined | null | string[]
  >;
  auth?: boolean;
  portalAuth?: boolean;
  queueWhenOffline?: boolean;
  timeoutMs?: number;
}

function buildUrl(path: string, query?: RequestOptions['query']) {
  const url = new URL(path.startsWith('http') ? path : `${API_BASE}${path}`);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null || v === '') continue;
      if (Array.isArray(v)) {
        for (const item of v) {
          if (item !== '') url.searchParams.append(k, String(item));
        }
      } else {
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

  // Trello #104: send a correlation id (reuse one if the caller set it).
  const requestId = headers.get('X-Request-Id') ?? generateRequestId();
  headers.set('X-Request-Id', requestId);

  if (opts.auth !== false) {
    const token = getAuthToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
  }

  if (opts.portalAuth) {
    const portal = getPortalToken();
    if (portal) headers.set('Authorization', `Bearer ${portal}`);
  }

  try {
    const timeoutMs = opts.timeoutMs ?? REQUEST_TIMEOUT_MS;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    let res: Response;
    try {
      res = await fetch(buildUrl(path, opts.query), {
        ...opts,
        headers,
        signal: controller.signal,
        body:
          opts.body == null
            ? undefined
            : opts.body instanceof FormData
              ? opts.body
              : JSON.stringify(opts.body),
        credentials: credentialsMode,
      });
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw {
          status: 408,
          message: 'Request timed out. Please try again.',
        } satisfies ApiError;
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }

    const contentType = res.headers.get('content-type')?.toLowerCase() ?? '';
    const isJson = contentType.includes('application/json');
    // Binary downloads (PDF, CSV, Excel, generic octet-stream) must be returned
    // as a Blob so callers can trigger a file download — Trello #68 CSV export et al.
    const isBinary =
      contentType.includes('application/pdf') ||
      contentType.includes('text/csv') ||
      contentType.includes('application/octet-stream') ||
      contentType.includes('spreadsheet') ||
      contentType.includes('application/vnd.ms-excel') ||
      (res.headers.get('content-disposition')?.toLowerCase().includes('attachment') ?? false);

    let payload: unknown = null;
    if (isJson) {
      payload = await res.json().catch(() => null);
    } else if (isBinary) {
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
        requestId: res.headers.get('X-Request-Id') ?? requestId,
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
  setSession: (token: string, remember?: boolean, expiresAt?: string) =>
    setAuthToken(token, remember ?? true, expiresAt),
  clearSession: clearAuthToken,
  getToken: getAuthToken,
  setPortalSession: setPortalToken,
  clearPortalSession: clearPortalToken,
  getPortalToken: getPortalToken,
};
