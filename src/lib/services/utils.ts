import type { PaginatedResponse } from '@/lib/api-types';

export function toNumber(value: unknown, fallback = 0) {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

export function toBoolean(value: unknown) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    return ['true', '1', 'yes'].includes(value.toLowerCase());
  }
  if (typeof value === 'number') return value > 0;
  return false;
}

export function asArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (value && typeof value === 'object') {
    const data = (value as Record<string, unknown>).data;
    if (Array.isArray(data)) return data as T[];
  }
  return [];
}

function paginationMeta(obj: Record<string, unknown>): PaginatedResponse<unknown>['meta'] | undefined {
  if (obj.meta && typeof obj.meta === 'object') {
    return obj.meta as PaginatedResponse<unknown>['meta'];
  }
  if ('current_page' in obj && 'total' in obj) {
    return {
      current_page: toNumber(obj.current_page, 1),
      last_page: toNumber(obj.last_page, 1),
      per_page: toNumber(obj.per_page, 0),
      total: toNumber(obj.total, 0),
      from: obj.from != null ? toNumber(obj.from) : null,
      to: obj.to != null ? toNumber(obj.to) : null,
    };
  }
  return undefined;
}

export function asPaginated<T>(value: unknown): PaginatedResponse<T> {
  if (Array.isArray(value)) {
    return { data: value as T[] };
  }
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const items = Array.isArray(obj.data)
      ? obj.data
      : Array.isArray(obj.rules)
        ? obj.rules
        : null;
    if (items) {
      return {
        data: items as T[],
        links: (obj.links as PaginatedResponse<T>['links']) ?? undefined,
        meta: paginationMeta(obj) as PaginatedResponse<T>['meta'],
      };
    }
  }
  return { data: [] };
}

/** Rows from a paginated API result or a legacy bare array. */
export function paginatedRows<T>(
  page: PaginatedResponse<T> | T[] | null | undefined,
): T[] {
  if (!page) return [];
  if (Array.isArray(page)) return page;
  return page.data ?? [];
}

export function maybeResource<T>(value: unknown, key: string): T {
  if (value && typeof value === 'object' && key in value) {
    return (value as Record<string, unknown>)[key] as T;
  }
  return value as T;
}

export function centsToEuro(cents: unknown) {
  return toNumber(cents) / 100;
}
