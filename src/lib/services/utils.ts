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

export function asPaginated<T>(value: unknown): PaginatedResponse<T> {
  if (Array.isArray(value)) {
    return { data: value as T[] };
  }
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    if (Array.isArray(obj.data)) {
      return {
        data: obj.data as T[],
        links: (obj.links as PaginatedResponse<T>['links']) ?? undefined,
        meta: (obj.meta as PaginatedResponse<T>['meta']) ?? undefined,
      };
    }
  }
  return { data: [] };
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
