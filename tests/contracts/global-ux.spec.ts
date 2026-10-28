import { expect, test } from '@playwright/test';
import { adminHref, adminRecordHref } from '../../src/config/admin-routes';
import { canAccessAdmin, canAccessAdminRoute, defaultRedirectForRole } from '../../src/lib/auth-routes';
import { createActions, canPerformCreate } from '../../src/config/admin-create-actions';
import { dashboardShortcutRows } from '../../src/lib/dashboard-shortcuts';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

test('empty shortcut configuration survives reload; failures alone use defaults', () => {
  const defaults = [{ key: 'default' }];
  expect(dashboardShortcutRows({ data: [] }, false, defaults)).toEqual([]);
  expect(dashboardShortcutRows(JSON.parse(JSON.stringify({ data: [] })), false, defaults)).toEqual([]);
  expect(dashboardShortcutRows(null, false, defaults)).toEqual([]);
  expect(dashboardShortcutRows(null, true, defaults)).toEqual(defaults);
  expect(dashboardShortcutRows({ data: [{ key: 'saved' }] }, true, defaults)).toEqual([{ key: 'saved' }]);
});

test('readable links retain locale, public ID, encoded slug and query', () => {
  for (const locale of ['nl', 'en', 'de', 'fr']) {
    for (const section of ['producten', 'klanten', 'boten', 'stalling', 'leveranciers'] as const) {
      expect(adminRecordHref(locale, section, { id: 'uuid', public_id: 'ABC123', slug: 'boat & owner' }, '?tab=history'))
        .toBe('/' + locale + '/admin/' + section + '/ABC123/boat%20%26%20owner?tab=history');
      expect(adminRecordHref(locale, section, { id: 'uuid', public_id: 'ABC123', slug: 'timeline' })).toBe('/' + locale + '/admin/' + section + '/ABC123');
      expect(adminRecordHref(locale, section, { id: 'legacy-uuid' })).toBe('/' + locale + '/admin/' + section + '/legacy-uuid');
      expect(existsSync(resolve('src/app/[locale]/admin/' + section + '/[id]/[slug]/page.tsx'))).toBe(true);
    }
    expect(adminHref(locale, 'admin.customers.create')).toBe('/' + locale + '/admin/klanten?new=1');
    expect(adminHref(locale, 'admin.planning.create')).toBe('/' + locale + '/admin/afspraken?create=1');
    expect(adminHref(locale, 'admin.invoices.create')).toBe('/' + locale + '/admin/facturen?create=1');
  }
});

test('custom shortcut destinations cannot escape named routes', () => {
  expect(adminHref('fr', 'admin.kassa.index', '/admin/kassa?view=recent')).toBe('/fr/admin/kassa?view=recent');
  for (const url of ['https://example.com', '//example.com', '/admin/producten/nieuw', '/admin/kassa/../systeem', '/admin/kassa%2f..%2fsysteem']) {
    expect(adminHref('fr', 'admin.kassa.index', url)).toBe('/fr/admin/kassa');
  }
  expect(adminHref('de', 'unknown', '/admin/systeem')).toBe('/de/admin');
});

test('canonical employee and finance roles follow API permissions, with separate technical administration', () => {
  expect(canAccessAdmin('employee', false)).toBe(true);
  expect(canAccessAdmin('finance', false)).toBe(true);
  expect(canAccessAdmin('guest', false)).toBe(false);
  expect(defaultRedirectForRole('employee', 'de')).toBe('/de/admin/kassa');
  expect(defaultRedirectForRole('finance', 'fr')).toBe('/fr/admin');
  expect(canAccessAdminRoute('employee', '/de/admin/calculator/pricing', ['pricing.view'])).toBe(true);
  expect(canAccessAdminRoute('finance', '/fr/admin/facturen', ['invoice.view'])).toBe(true);
  expect(canAccessAdminRoute('finance', '/fr/admin/kassa', ['invoice.view'])).toBe(false);
  expect(canAccessAdminRoute('employee', '/en/admin/boten', [])).toBe(false);
  expect(canAccessAdminRoute('admin', '/en/admin/systeem', ['*'])).toBe(false);
  expect(canAccessAdminRoute('super_admin', '/en/admin/systeem', ['*'])).toBe(true);
  expect(canAccessAdminRoute('employee', '/en/admin/beheer/dashboard-shortcuts', ['settings.update'])).toBe(true);
  expect(canAccessAdminRoute('admin', '/en/admin/beheer/dashboard-shortcuts', [])).toBe(false);
  const appointment = createActions.find(action => action.key === 'appointment')!;
  expect(canPerformCreate({ role: 'employee', permissions: ['planning.write'] }, appointment)).toBe(false);
  expect(canPerformCreate({ role: 'employee', permissions: ['planning.manage'] }, appointment)).toBe(true);
});

test('service content and pricing labels exist in every supported locale', () => {
  const nl = JSON.parse(readFileSync(resolve('src/i18n/messages/nl.json'), 'utf8')).globalUx;
  for (const locale of ['nl', 'en', 'de', 'fr']) {
    const translated = JSON.parse(readFileSync(resolve('src/i18n/messages/' + locale + '.json'), 'utf8')).globalUx;
    for (const [slug, values] of Object.entries(nl.serviceDetails)) {
      for (const key of Object.keys(values as object)) expect(translated.serviceDetails[slug][key]?.trim()).toBeTruthy();
    }
    for (const key of Object.keys(nl.pricing)) expect(translated.pricing[key]?.trim()).toBeTruthy();
  }
});
