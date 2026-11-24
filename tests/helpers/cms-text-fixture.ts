import { test } from './browser-test';
import type { Page } from '@playwright/test';
// Local browser fixture evidence only; never presented as staging/database PASS.
export async function fixture(page: Page, authorized = true, role = authorized ? 'super_admin' : 'customer') {
  const origin = test.info().project.use.baseURL!;
  const globals: Record<string, string> = { 'company.email': 'original@example.test', 'company.phone': '+31 475 315661' };
  const blocks: Record<string, { page: string; values: Record<string, string> }> = {};
  const writes: string[] = [];
  const company = () => ({ email: globals['company.email'], phone: globals['company.phone'],
    address: { street: 'Test street', postal_code: '1234AA', city: 'Herten', country: 'NL' } });
  await page.context().addCookies([{ name: 'krek_session', value: 'fixture', url: origin }]);
  await page.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin !== origin) return route.abort();
    if (!url.pathname.startsWith('/api/')) return route.continue();
    if (url.pathname.endsWith('/content/contact')) return route.fulfill({ json: { company: company(), show_chat: false } });
    if (url.pathname.endsWith('/cms/contact-settings')) {
      const values = request.postDataJSON();
      for (const key of ['email', 'phone']) if (key in values) {
        writes.push(`company.${key}`); globals[`company.${key}`] = values[key];
      }
      return route.fulfill({ json: { company: company() } });
    }
    if (url.pathname.endsWith('/auth/me')) return route.fulfill({ json: {
      id: 'editor', name: 'Editor', email: 'editor@example.test', role,
      permissions: authorized ? ['cms.manage', 'invoice.create', 'invoice.view'] : [],
    } });
    if (url.pathname.endsWith('/cms/page-content')) return route.fulfill({ json: {
      global_settings: globals, media_blocks: [],
      editor_locales: ['nl-NL', 'en-GB', 'de-DE', 'fr-FR'],
      content_blocks: Object.entries(blocks).filter(([, b]) => b.page === url.searchParams.get('page'))
        .map(([key, b]) => ({ key, type: 'short_text', value: b.values[url.searchParams.get('locale') ?? 'nl-NL'] })),
    } });
    if (url.pathname.includes('/global-settings')) {
      if (request.method() === 'PATCH') {
        const key = decodeURIComponent(url.pathname.split('/').at(-1)!);
        writes.push(key); globals[key] = request.postDataJSON().value;
        return route.fulfill({ json: { value: globals[key], cms_revision: 'fixture' } });
      }
      return route.fulfill({ json: { settings: globals, revisions: Object.fromEntries(Object.keys(globals).map(key => [key, null])) } });
    }
    if (url.pathname.includes('/content-blocks/') && request.method() === 'GET') {
      const key = decodeURIComponent(url.pathname.split('/').at(-1)!);
      return route.fulfill({ json: { key, cms_revision: null, value_by_locale: blocks[key]?.values ?? {}, publication_state: 'published' } });
    }
    if (url.pathname.includes('/content-blocks/') && request.method() === 'PATCH') {
      const key = decodeURIComponent(url.pathname.split('/').at(-1)!);
      const data = request.postDataJSON();
      blocks[key] = { page: data.page, values: { ...blocks[key]?.values, ...data.value_by_locale } };
      return route.fulfill({ json: {} });
    }
    return route.fulfill({ json: { data: [], settings: {}, items: [], subjects: [] } });
  });
  return { globals, blocks, writes };
}

