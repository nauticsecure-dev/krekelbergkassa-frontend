import { expect, test } from '@playwright/test';
import { userCan } from '../../src/lib/permission-check';
import { canPerformCreate, createActions } from '../../src/config/admin-create-actions';
import { canAccessAdminRoute } from '../../src/lib/auth-routes';

test('employees can reach pricing and product editors with their API read permissions', () => {
  expect(canAccessAdminRoute('staff', '/nl/admin/calculator/pricing', ['pricing.view', 'pricing.update'])).toBe(true);
  expect(canAccessAdminRoute('staff', '/nl/admin/producten/winter', ['products.view'])).toBe(true);
  expect(canAccessAdminRoute('staff', '/nl/admin/calculator/pricing', [])).toBe(false);
  expect(canAccessAdminRoute('admin', '/nl/admin/calculator/pricing', [])).toBe(false);
  expect(canAccessAdminRoute('staff', '/nl/admin/audit', ['*'])).toBe(false);
});

test('an authoritative empty list never restores role privileges', () => {
  for (const role of ['super_admin', 'admin', 'manager', 'staff']) {
    expect(userCan({ role, permissions: [] }, 'kassa.view')).toBe(false);
    for (const action of createActions) {
      expect(canPerformCreate({ role, permissions: [] }, action)).toBe(false);
    }
  }
});

test('unauthenticated and customer sessions cannot use global creation actions', () => {
  for (const user of [null, undefined, { role: 'customer' }, { role: 'guest' }]) {
    expect(userCan(user, 'customers.write')).toBe(false);
    for (const action of createActions) expect(canPerformCreate(user, action)).toBe(false);
  }
});

test('explicit permissions override role fallbacks, with any-of and wildcard support', () => {
  expect(userCan({ role: 'admin', permissions: ['boats.view'] }, 'customers.write')).toBe(false);
  expect(userCan({ permissions: ['boats.view'] }, ['boats.write', 'boats.view'])).toBe(true);
  expect(userCan({ permissions: ['*'] }, 'invoice.create')).toBe(true);
  const invoice = createActions.find((action) => action.key === 'invoice')!;
  expect(canPerformCreate({ role: 'staff', permissions: ['invoice.create'] }, invoice)).toBe(true);
  expect(canPerformCreate({ role: 'manager', permissions: ['invoice.view'] }, invoice)).toBe(false);
  expect(canPerformCreate({ role: 'manager' }, invoice)).toBe(true);
});

