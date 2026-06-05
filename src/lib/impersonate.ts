import { auth } from '@/lib/api';
import { setImpersonationMeta } from '@/components/auth/ImpersonationBanner';
import { customersService, usersService } from '@/lib/services';
import type { Role } from '@/lib/auth-context';

export class ImpersonationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ImpersonationError';
  }
}

/** Staff/admin accounts must not be impersonated. */
export function canImpersonateUser(role: string): boolean {
  return role.toLowerCase() !== 'admin';
}

export async function impersonateUser(userId: string, locale: string) {
  const target = await usersService.get(userId);
  if (!canImpersonateUser(target.role)) {
    throw new ImpersonationError('Cannot impersonate admin users');
  }

  const res = await usersService.impersonate(userId);
  auth.setSession(res.token, false, res.expires_at);
  setImpersonationMeta(res.user.name);

  const role = res.user.role as Role;
  const dest =
    role === 'customer'
      ? `/${locale}/feed`
      : role === 'admin' || role === 'manager' || role === 'staff'
        ? `/${locale}/admin`
        : `/${locale}/feed`;

  window.location.href = dest;
}

/** Trello #76: impersonate a customer via a short-lived portal token. */
export async function impersonateCustomer(customerId: string, locale: string) {
  const res = await customersService.impersonate(customerId);
  if (!res.portal_token) {
    throw new ImpersonationError('No portal token returned');
  }
  auth.setPortalSession(res.portal_token, false);
  setImpersonationMeta(res.customer?.name ?? 'customer');
  window.location.href = `/${locale}/feed`;
}

export async function findUserIdByEmail(email: string): Promise<string | null> {
  if (!email.trim()) return null;
  const res = await usersService.list({ search: email.trim(), per_page: 5 });
  const match = res.data.find((u) => u.email.toLowerCase() === email.toLowerCase());
  return match?.id ?? null;
}
