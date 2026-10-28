import type { AdminRouteKey } from '@/config/admin-routes';
import { userCan } from '../lib/permission-check';

export type CreateAction = {
  key: string;
  labelKey: string;
  icon: string;
  routeKey: AdminRouteKey;
  permission: string;
  /** Used only when the session has not loaded a permission list yet. */
  fallbackRoles?: Array<'admin' | 'manager'>;
};

export const createActions: CreateAction[] = [
  { key: 'customer', labelKey: 'adminModules.create.customer', icon: 'UserPlus', routeKey: 'admin.customers.create', permission: 'customers.write' },
  { key: 'boat', labelKey: 'adminModules.create.boat', icon: 'Ship', routeKey: 'admin.boats.create', permission: 'boats.write' },
  { key: 'appointment', labelKey: 'adminModules.create.appointment', icon: 'Calendar', routeKey: 'admin.planning.create', permission: 'planning.manage' },
  { key: 'stalling', labelKey: 'adminModules.create.stalling', icon: 'Warehouse', routeKey: 'admin.stalling.create', permission: 'stalling.write' },
  { key: 'invoice', labelKey: 'adminModules.create.invoice', icon: 'FileText', routeKey: 'admin.invoices.create', permission: 'invoice.create', fallbackRoles: ['admin', 'manager'] },
  { key: 'brokerage', labelKey: 'adminModules.create.brokerage', icon: 'Handshake', routeKey: 'admin.brokerage.index', permission: 'settings.update', fallbackRoles: ['admin', 'manager'] },
  { key: 'supplier', labelKey: 'adminModules.create.supplier', icon: 'Truck', routeKey: 'admin.suppliers.create', permission: 'products.write', fallbackRoles: ['admin', 'manager'] },
  { key: 'service', labelKey: 'adminModules.create.service', icon: 'Wrench', routeKey: 'admin.products.create', permission: 'products.write', fallbackRoles: ['admin', 'manager'] },
];

export function canPerformCreate(
  user: { role?: string | null; permissions?: string[] | null } | null | undefined,
  action: CreateAction,
): boolean {
  if (!user) return false;
  if (user.permissions != null) return userCan(user, action.permission);
  return userCan(user, action.permission) ||
    Boolean(action.fallbackRoles?.includes((user.role ?? '') as 'admin' | 'manager'));
}
