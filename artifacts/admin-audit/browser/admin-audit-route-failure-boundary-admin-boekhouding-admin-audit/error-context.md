# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: admin-audit.spec.ts >> route failure boundary: /admin/boekhouding
- Location: tests\browser\admin-audit.spec.ts:21:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('main')
Expected: visible
Timeout: 15000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 15000ms
  - waiting for locator('main')

```

```yaml
- text: Loading…
```

# Test source

```ts
  1  | import { expect, test, type Page } from '@playwright/test';
  2  | import fs from 'node:fs';
  3  | const matrix = JSON.parse(fs.readFileSync('artifacts/admin-audit/source-matrix.json', 'utf8'));
  4  | const dictionaries = Object.fromEntries(['nl','en','de','fr'].map(locale => [locale, JSON.parse(fs.readFileSync(`src/i18n/messages/${locale}.json`, 'utf8'))]));
  5  | const label = (locale: string, key: string): string => key.split('.').reduce((v, k) => v[k], dictionaries[locale]);
  6  | const failure = 'Audit injected service failure';
  7  | async function session(page: Page, role = 'super_admin', broken = true) {
  8  |   const baseURL = test.info().project.use.baseURL!;
  9  |   await page.context().addCookies([{ name: 'krek_session', value: 'audit-fixture', url: baseURL }]);
  10 |   await page.route('**/*', route => {
  11 |     const url = new URL(route.request().url());
  12 |     if (url.origin !== baseURL) return route.abort();
  13 |     if (!url.pathname.startsWith('/api/')) return route.continue();
  14 |     if (url.pathname.endsWith('/auth/me')) return route.fulfill({ json: { id:'audit', name:'Reviewer', email:'audit@example.test', role, permissions:['*'] } });
  15 |     if (broken) return route.fulfill({ status:503, json:{message:failure} });
  16 |     if (url.pathname.endsWith('/admin/calendar')) return route.fulfill({ json: {regular_hours:[],exceptions:[],lunch_block:null} });
  17 |     return route.fulfill({ json:{data:[],items:[],cards:[],meta:{total:0,current_page:1,last_page:1}} });
  18 |   });
  19 | }
  20 | for (const entry of matrix.pages) {
  21 |   test(`route failure boundary: ${entry.route}`, async ({ page }, info) => {
  22 |     const errors: string[] = [];
  23 |     page.on('pageerror', error => errors.push(error.message));
  24 |     await session(page, entry.route.startsWith('/admin/werkorders') ? 'staff' : 'super_admin');
  25 |     await page.goto(`/nl${entry.route.replaceAll('[id]', 'audit-missing-record')}`);
  26 |     const main = page.locator('main');
> 27 |     await expect(main).toBeVisible();
     |                        ^ Error: expect(locator).toBeVisible() failed
  28 |     await expect.poll(() => main.innerText()).not.toBe('');
  29 |     // Observe whether this route surfaces the injected error. A rendered heading alone
  30 |     // is only a smoke pass, never a verified error-state pass.
  31 |     await expect(page.locator('body')).not.toContainText('Application error:');
  32 |     const text = await main.innerText();
  33 |     await info.attach('route-observation', { body: JSON.stringify({ route:entry.route, locale:'nl', finalURL:page.url(), injectedErrorVisible:text.includes(failure), text:text.slice(0,2000), errors }), contentType:'application/json' });
  34 |     expect(errors).toEqual([]);
  35 |   });
  36 | }
  37 | for (const locale of ['nl','en','de','fr']) {
  38 |   test(`${locale}: dashboard sidebar and KPI responsive evidence`, async ({ page }, info) => {
  39 |     await session(page);
  40 |     await page.goto(`/${locale}/admin`);
  41 |     await expect(page.locator('main h1')).toBeVisible();
  42 |     for (const width of [390, 1280, 1536]) {
  43 |       await page.setViewportSize({width,height:1000});
  44 |       for (const collapsed of width === 390 ? [false] : [false,true]) {
  45 |         if (width !== 390 && collapsed) await page.getByRole('button', {name:label(locale,'adminNew.shell.collapseSidebar'),exact:true}).click();
  46 |         await expect.poll(() => page.locator('main').evaluate(e => e.scrollWidth-e.clientWidth)).toBeLessThanOrEqual(1);
  47 |         await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
  48 |         const kpis = page.locator('[data-admin-kpis]');
  49 |         await expect(kpis).toBeVisible();
  50 |         await expect.poll(() => kpis.evaluate(e => getComputedStyle(e).gridTemplateColumns.split(' ').length)).toBe(width === 390 ? 1 : width === 1280 ? 3 : 5);
  51 |         await page.screenshot({path:info.outputPath(`${locale}-${width}-${collapsed?'collapsed':'expanded'}.png`),fullPage:true});
  52 |         if (width !== 390 && collapsed) await page.getByRole('button', {name:label(locale,'adminNew.shell.expandSidebar'),exact:true}).click();
  53 |       }
  54 |       if (width === 390) {
  55 |         await page.getByRole('button', {name:label(locale,'header.mainMenu'),exact:true}).click();
  56 |         await expect(page.getByRole('dialog')).toBeVisible();
  57 |         await page.screenshot({path:info.outputPath(`${locale}-390-drawer-open.png`)});
  58 |         await page.keyboard.press('Escape');
  59 |         await expect(page.getByRole('dialog')).toBeHidden();
  60 |       }
  61 |     }
  62 |     const raw = (await page.locator('body').innerText()).match(/\b(?:adminNew|adminModules)\.[A-Za-z][\w.]+/g) ?? [];
  63 |     expect(raw).toEqual([]);
  64 |   });
  65 | }
  66 | 
```