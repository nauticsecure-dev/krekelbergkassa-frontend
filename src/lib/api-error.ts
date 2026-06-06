import type { ApiError } from './api';

export function isApiError(err: unknown): err is ApiError {
  return (
    typeof err === 'object' &&
    err !== null &&
    'status' in err &&
    typeof (err as ApiError).status === 'number' &&
    'message' in err &&
    typeof (err as ApiError).message === 'string'
  );
}

function extractMessageFromPayload(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const obj = payload as Record<string, unknown>;

  if (typeof obj.message === 'string' && obj.message.trim()) {
    return obj.message.trim();
  }

  if (obj.error && typeof obj.error === 'object') {
    const nested = extractMessageFromPayload(obj.error);
    if (nested) return nested;
  }

  if (obj.errors && typeof obj.errors === 'object') {
    const errors = obj.errors as Record<string, unknown>;
    for (const value of Object.values(errors)) {
      if (typeof value === 'string' && value.trim()) return value.trim();
      if (Array.isArray(value)) {
        const first = value.find((item) => typeof item === 'string' && item.trim());
        if (typeof first === 'string') return first.trim();
      }
    }
  }

  return null;
}

/** Trello #104: the backend correlation id for an error, if any. */
export function getApiRequestId(err: unknown): string | undefined {
  if (isApiError(err) && err.requestId) return err.requestId;
  return undefined;
}

export function getApiErrorMessage(err: unknown, fallback = 'Unexpected error'): string {
  const requestId = getApiRequestId(err);
  const withRef = (msg: string) => (requestId ? `${msg} (ref: ${requestId})` : msg);

  if (isApiError(err)) {
    const fromData = extractMessageFromPayload(err.data);
    if (fromData) return withRef(fromData);
    if (err.message.trim()) return withRef(err.message.trim());
    return withRef(fallback);
  }

  if (err instanceof Error && err.message.trim()) {
    return err.message.trim();
  }

  if (err && typeof err === 'object') {
    const fromPayload = extractMessageFromPayload(err);
    if (fromPayload) return fromPayload;
  }

  return fallback;
}

export function getApiErrorStatus(err: unknown): number | undefined {
  if (isApiError(err)) return err.status;
  return undefined;
}
