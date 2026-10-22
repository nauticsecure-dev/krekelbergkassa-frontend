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

function validationPayload(err: unknown): Record<string, unknown> | null {
  const payload =
    isApiError(err) && err.data && typeof err.data === 'object'
      ? (err.data as Record<string, unknown>)
      : err && typeof err === 'object'
        ? (err as Record<string, unknown>)
        : null;

  if (!payload?.errors || typeof payload.errors !== 'object') return null;
  return payload.errors as Record<string, unknown>;
}

/** Laravel-style field → messages map from an API error payload. */
export function getApiValidationErrors(err: unknown): Record<string, string[]> {
  const errors = validationPayload(err);
  if (!errors) return {};

  const mapped: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(errors)) {
    const messages: string[] = [];
    if (typeof value === 'string' && value.trim()) messages.push(value.trim());
    if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === 'string' && item.trim()) messages.push(item.trim());
      }
    }
    if (messages.length) mapped[key] = messages;
  }
  return mapped;
}

/** Collect Laravel-style field validation messages from an API error payload. */
export function getApiValidationMessages(err: unknown): string[] {
  return Object.values(getApiValidationErrors(err)).flat();
}

export function getApiErrorMessage(err: unknown, fallback = 'Unexpected error'): string {
  const requestId = getApiRequestId(err);
  const withRef = (msg: string) => (requestId ? `${msg} (ref: ${requestId})` : msg);

  const validation = getApiValidationMessages(err);
  if (validation.length) return withRef(validation.join(' '));

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
