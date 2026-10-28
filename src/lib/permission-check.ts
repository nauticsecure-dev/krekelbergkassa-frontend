export type PermissionUser = {
  role?: string | null;
  permissions?: string[] | null;
} | null | undefined;

/** Compatibility for sessions that predate permission lists. An empty list denies all. */
const ROLE_FALLBACK: Record<string, readonly string[]> = {
  super_admin: ['*'],
  admin: ['*'],
  manager: ['planning.view', 'kassa.view', 'stalling.view', 'customers.view', 'boats.view',
    'invoice.view', 'products.view', 'pricing.view', 'settings.update', 'work_orders.view'],
  finance: ['settings.financial.view', 'settings.financial.update', 'reminders.view', 'reminder_rules.view', 'reminder_rules.write'],
  staff: ['planning.view', 'kassa.view', 'stalling.view', 'customers.view', 'boats.view',
    'pricing.view', 'work_orders.view'],
};

export function userCan(user: PermissionUser, permission: string | readonly string[]): boolean {
  if (!user) return false;
  const needed = typeof permission === 'string' ? [permission] : permission;
  const granted = user.permissions ?? ROLE_FALLBACK[user.role ?? ''] ?? [];
  return granted.includes('*') || needed.some((name) => granted.includes(name));
}
