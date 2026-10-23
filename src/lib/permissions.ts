'use client';

import { useAuth } from '@/lib/auth-context';

export type PermissionUser = {
  role?: string | null;
  permissions?: string[] | null;
} | null | undefined;

/**
 * Used only when the session has not loaded a permission list yet
 * (demo accounts and stale caches). A loaded list always wins.
 */
const ROLE_FALLBACK: Record<string, readonly string[]> = {
  super_admin: ['*'],
  admin: ['*'],
  manager: [
    'planning.view',
    'kassa.view',
    'stalling.view',
    'customers.view',
    'boats.view',
    'invoice.view',
    'products.view',
    'pricing.view',
    'settings.update',
    'work_orders.view',
  ],
  staff: [
    'planning.view',
    'kassa.view',
    'stalling.view',
    'customers.view',
    'boats.view',
    'pricing.view',
    'work_orders.view',
  ],
};

export function userCan(user: PermissionUser, permission: string | readonly string[]): boolean {
  const needed = typeof permission === 'string' ? [permission] : [...permission];
  const granted = user?.permissions ?? [];
  if (granted.includes('*') || needed.some((name) => granted.includes(name))) return true;
  if (granted.length > 0) return false;
  const fallback = ROLE_FALLBACK[user?.role ?? ''] ?? [];
  if (fallback.includes('*')) return true;
  return needed.some((name) => fallback.includes(name));
}

export function usePermission() {
  const { user } = useAuth();
  return {
    can: (permission: string | readonly string[]) => userCan(user, permission),
  };
}
