import fs from 'node:fs';
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';

const backend = new URL('../../krekelbergkassa-backend/', import.meta.url);
const env = Object.fromEntries(fs.readFileSync(new URL('.env', backend), 'utf8').split(/\r?\n/).filter((line) => /^[A-Z_]+=/.test(line)).map((line) => {
  const at = line.indexOf('='); return [line.slice(0, at), line.slice(at + 1).replace(/^['"]|['"]$/g, '')];
}));
assert.equal(env.APP_ENV, 'local', 'This verification is restricted to the local environment');
const api = process.env.HISWA_API ?? 'http://127.0.0.1:8095/api/v1';
assert.ok(['localhost', '127.0.0.1'].includes(new URL(api).hostname));
const nativeFetch = globalThis.fetch;
globalThis.fetch = (url, options = {}) => nativeFetch(url, { ...options, signal: options.signal ?? AbortSignal.timeout(30000) });
const seed = fs.readFileSync(new URL('database/seeders/UserSeeder.php', backend), 'utf8');
const localAdmin = seed.slice(seed.indexOf('$superAdmin = User::updateOrCreate'));
const email = localAdmin.match(/'email' => '([^']+)'/)[1];
const password = localAdmin.match(/Hash::make\('([^']+)'\)/)[1];
const login = await fetch(`${api}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ email, password, device_name: 'HISWA persistence verification' }), signal: AbortSignal.timeout(30000) });
const auth = await login.json();
assert.equal(login.status, 200, `Local administrator login failed (${login.status})`);
const token = auth.token ?? auth.access_token ?? auth.data?.token;
assert.ok(token, 'Login did not return a token');
const headers = { Authorization: `Bearer ${token}`, Accept: 'application/json', 'Content-Type': 'application/json' };
const keys = ['over-ons.hiswa.title', 'over-ons.hiswa.desc'];
async function blocks() {
  const response = await fetch(`${api}/admin/cms/content-blocks?page=over-ons`, { headers, cache: 'no-store' });
  assert.equal(response.status, 200, 'Cannot read original CMS blocks');
  return (await response.json()).data;
}
if (process.argv.includes('--cleanup')) {
  try {
    for (const block of await blocks()) {
      if (!keys.includes(block.key)) continue;
      assert.ok(Object.values(block.value_by_locale ?? {}).every((value) => value.startsWith('HISWA verification ')), 'Refusing to remove non-verification content');
      const response = await fetch(`${api}/admin/cms/content-blocks/${block.key}`, { method: 'DELETE', headers });
      assert.equal(response.status, 200);
      console.log(`Removed temporary block ${block.key}`);
    }
    assert.ok((await blocks()).every((block) => !keys.includes(block.key)));
    console.log('Confirmed: both original blocks are absent');
  } finally { await fetch(`${api}/auth/logout`, { method: 'POST', headers }); }
  process.exit(0);
}
const snapshots = {};
const report = { backend: api, frontend: 'http://localhost:3030', started: new Date().toISOString(), locales: [], restored: false };
let browser;
let changed = false;
try { const originalBlocks = await blocks(); for (const key of keys) {
  snapshots[key] = originalBlocks.find((block) => block.key === key) ?? null;
}
// Keep this verification reversible through the public API, including locale maps.
assert.ok(keys.every((key) => snapshots[key] === null), 'This local creation test requires the original blocks to be absent; no writes were made');
browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ serviceWorkers: 'block' });
// A transparent proxy to the isolated real Laravel worker; no responses are stubbed.
async function realApiProxy(route) {
  const request = route.request();
  const original = new URL(request.url());
  const target = new URL(original.pathname + original.search, new URL(api).origin);
  const response = await route.fetch({ url: target.href, timeout: 30000 });
  await route.fulfill({ response });
}
await context.route('**/api/**', realApiProxy);
await context.addCookies([{ name: 'krek_session', value: token, url: report.frontend }]);
const page = await context.newPage();
page.on('response', async (response) => {
  if (response.status() >= 400 && response.url().includes('/cms/')) {
    const body = await response.json().catch(() => ({}));
    console.log(JSON.stringify({ cmsError: response.status(), path: new URL(response.url()).pathname, message: body.message, retryAfter: response.headers()['retry-after'] }));
  }
});
page.setDefaultTimeout(90000);
page.setDefaultNavigationTimeout(180000);
const marker = `HISWA verification ${Date.now()}`;
for (const [locale, tag] of Object.entries({ nl: 'nl-NL', en: 'en-GB', de: 'de-DE', fr: 'fr-FR' })) {
  const { cms: messages } = JSON.parse(fs.readFileSync(new URL(`../src/i18n/messages/${locale}.json`, import.meta.url), 'utf8'));
  await page.goto(`${report.frontend}/${locale}/over-ons`);
  const enter = page.getByRole('button', { name: messages.enterEdit, exact: true });
  await enter.click({ timeout: 90000 });
  await page.locator('[data-cms-card="over-ons.hiswa"]').getByRole('button', { name: messages.editHiswa }).click();
  const dialog = page.getByRole('dialog');
  const title = `${marker} title ${tag}`;
  const description = `${marker} description ${tag}`;
  await dialog.getByLabel(messages.hiswaTitle, { exact: true }).fill(title);
  await dialog.getByLabel(messages.hiswaDescription, { exact: true }).fill(description);
  const saved = keys.map((key) => page.waitForResponse((response) => response.url().includes(`/admin/cms/content-blocks/${key}`) && response.request().method() === 'PATCH'));
  changed = true;
  await dialog.getByRole('button', { name: messages.save, exact: true }).click();
  for (const response of await Promise.all(saved)) {
    assert.equal(response.status(), 200, `Save failed: ${response.status()} ${await response.text()}`);
    assert.deepEqual(Object.keys(response.request().postDataJSON().value_by_locale), [tag]);
  }
  await dialog.waitFor({ state: 'detached' });
  const read = await fetch(`${api}/cms/page-content?page=over-ons&locale=${tag}&verify=${Date.now()}`, { cache: 'no-store', headers: { Accept: 'application/json' } });
  assert.equal(read.status, 200);
  const content = await read.json();
  assert.equal(content.content_blocks.find((block) => block.key === keys[0])?.value, title);
  assert.equal(content.content_blocks.find((block) => block.key === keys[1])?.value, description);
  await page.evaluate(() => sessionStorage.clear());
  await page.reload();
  await page.locator('[data-cms-card="over-ons.hiswa"]').getByText(title, { exact: true }).waitFor();
  await page.locator('[data-cms-card="over-ons.hiswa"]').getByText(description, { exact: true }).waitFor();
  // A new anonymous context has no provider state, session cache, or admin token.
  const fresh = await browser.newContext({ serviceWorkers: 'block' });
  await fresh.route('**/api/**', realApiProxy);
  try {
    const publicPage = await fresh.newPage();
    await publicPage.goto(`${report.frontend}/${locale}/over-ons`, { timeout: 180000 });
    await publicPage.locator('[data-cms-card="over-ons.hiswa"]').getByText(title, { exact: true }).waitFor();
    await publicPage.locator('[data-cms-card="over-ons.hiswa"]').getByText(description, { exact: true }).waitFor();
  } finally { await fresh.close(); }
  report.locales.push({ locale, tag, saveStatuses: [200, 200], uncachedApiRead: true, reload: true, freshAnonymousContext: true });
  console.log(`PASS ${locale}: both fields saved, read from backend, reloaded, and rendered in a fresh anonymous context`);
}
// Verify later saves did not overwrite translations saved earlier.
for (const key of keys) {
  const response = await fetch(`${api}/admin/cms/content-blocks/${key}`, { headers });
  assert.equal(response.status, 200);
  const block = await response.json();
  for (const tag of ['nl-NL', 'en-GB', 'de-DE', 'fr-FR']) {
    assert.equal(block.value_by_locale[tag], `${marker} ${key.endsWith('title') ? 'title' : 'description'} ${tag}`);
  }
}
report.crossLocaleIsolation = true;
} catch (error) {
  report.error = error.message;
  throw error;
} finally {
  try {
    if (changed) {
      for (const key of keys) {
        const response = await fetch(`${api}/admin/cms/content-blocks/${key}`, { method: 'DELETE', headers });
        assert.ok([200, 404].includes(response.status), `Cleanup failed for ${key}: ${response.status}`);
      }
      assert.ok((await blocks()).every((block) => !keys.includes(block.key)), 'Original absent state was not restored');
      report.restored = true;
      console.log('RESTORED: original fallback-only state for both fields');
    }
  } finally {
    await browser?.close();
    await fetch(`${api}/auth/logout`, { method: 'POST', headers });
    report.finished = new Date().toISOString();
    fs.mkdirSync(new URL('../artifacts/', import.meta.url), { recursive: true });
    fs.writeFileSync(new URL('../artifacts/hiswa-backend-verification.json', import.meta.url), JSON.stringify(report, null, 2) + '\n');
  }
}
