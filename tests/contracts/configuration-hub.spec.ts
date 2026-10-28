import { test, expect } from '@playwright/test';
import { canAccessAdmin, canAccessAdminRoute, defaultRedirectForRole } from '../../src/lib/auth-routes';
import { middleware } from '../../src/middleware';
import { NextRequest } from 'next/server';

test('Finance can reach financial settings with scoped permissions', () => {
  expect(canAccessAdmin('finance', false)).toBe(true);
  expect(defaultRedirectForRole('finance', 'nl')).toBe('/nl/admin');
  expect(canAccessAdminRoute('finance', '/nl/admin/instellingen', ['settings.financial.view'])).toBe(true);
  expect(canAccessAdminRoute('finance', '/nl/admin/instellingen', [])).toBe(false);
  expect(canAccessAdminRoute('finance', '/nl/admin/beveiliging', ['settings.financial.view'])).toBe(false);
  expect(canAccessAdminRoute('staff', '/nl/admin/instellingen', [])).toBe(false);
});

test('runtime locale routing follows active languages and configured default', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({default_locale:'de-DE', fallback_locale:'en-GB', supported_locales:[{code:'nl-NL',enabled:false},{code:'de-DE',enabled:true},{code:'en-GB',enabled:true}]}), {status:200,headers:{'Content-Type':'application/json'}});
  try {
    const inactive = await middleware(new NextRequest('http://example.test/nl/contact?ref=hub'));
    expect(inactive.headers.get('location')).toBe('http://example.test/de/contact?ref=hub');
    const root = await middleware(new NextRequest('http://example.test/',{headers:{'accept-language':'nl'}}));
    expect(root.headers.get('location')).toBe('http://example.test/de');
    const active = await middleware(new NextRequest('http://example.test/en/contact'));
    expect(active.headers.get('location')).toBeNull();
  } finally { globalThis.fetch = original; }
});
