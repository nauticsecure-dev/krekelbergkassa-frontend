import { expect, test } from '@playwright/test';
import { tEnum } from '../../src/i18n/admin-enums';

test('bounded labels translate supported values and normalized full keys', () => {
  const calls: string[] = [];
  const translate = (key: string) => { calls.push(key); return `label:${key}`; };
  expect(tEnum(translate, 'taskStatuses', 'in_progress')).toBe('label:adminNew.tasks.statusInProgress');
  expect(tEnum(translate, 'adminModules.create', 'adminModules.create.customer')).toBe('label:adminModules.create.customer');
  expect(calls).toEqual(['adminNew.tasks.statusInProgress', 'adminModules.create.customer']);
});

test('unknown API values and prototype names never become translation keys', () => {
  const translate = () => { throw new Error('Unknown value reached translator'); };
  expect(tEnum(translate, 'taskStatuses', 'new_server_status')).toBe('new_server_status');
  expect(tEnum(translate, 'taskStatuses', '__proto__')).toBe('__proto__');
  expect(tEnum(translate, 'taskStatuses', 'constructor')).toBe('constructor');
  expect(tEnum(translate, 'taskStatuses', null)).toBe('');
  expect(tEnum(translate, 'taskStatuses', 'unrecognized', { defaultValue: 'Server label' })).toBe('Server label');
});
