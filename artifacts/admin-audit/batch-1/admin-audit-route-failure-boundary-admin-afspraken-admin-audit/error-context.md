# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: admin-audit.spec.ts >> route failure boundary: /admin/afspraken
- Location: tests\browser\admin-audit.spec.ts:21:7

# Error details

```
Test timeout of 180000ms exceeded.
```

```
Error: page.goto: net::ERR_ABORTED; maybe frame was detached?
Call log:
  - navigating to "http://localhost:3047/nl/admin/afspraken", waiting until "load"

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
> 25 |     await page.goto(`/nl${entry.route.replaceAll('[id]', 'audit-missing-record')}`);
     |                ^ Error: page.goto: net::ERR_ABORTED; maybe frame was detached?
  26 |     const main = page.locator('main');
  27 |     await expect(main).toBeVisible();
  28 |     await expect.poll(() => main.innerText()).not.toBe('');
  29 |     await expect(main.locator('.animate-pulse, .animate-spin')).toHaveCount(0);
  30 |     // Observe whether this route surfaces the injected error. A rendered heading alone
  31 |     // is only a smoke pass, never a verified error-state pass.
  32 |     await expect(page.locator('body')).not.toContainText('Application error:');
  33 |     const text = await main.innerText();
  34 |     await info.attach('route-observation', { body: JSON.stringify({ route:entry.route, locale:'nl', finalURL:page.url(), injectedErrorVisible:text.includes(failure), text:text.slice(0,2000), errors }), contentType:'application/json' });
  35 |     expect(errors).toEqual([]);
  36 |     const screenshot = info.outputPath('route-error-state.png');
  37 |     await page.screenshot({path:screenshot,fullPage:true});
  38 |     await info.attach('page-evidence',{path:screenshot,contentType:'image/png'});
  39 |   });
  40 | }
  41 | for (const locale of ['nl','en','de','fr']) {
  42 |   test(`${locale}: dashboard sidebar and KPI responsive evidence`, async ({ page }, info) => {
  43 |     await session(page);
  44 |     await page.goto(`/${locale}/admin`);
  45 |     await expect(page.locator('main h1')).toBeVisible();
  46 |     for (const width of [390, 1280, 1536]) {
  47 |       await page.setViewportSize({width,height:1000});
  48 |       for (const collapsed of width === 390 ? [false] : [false,true]) {
  49 |         if (width !== 390 && collapsed) await page.getByRole('button', {name:label(locale,'adminNew.shell.collapseSidebar'),exact:true}).click();
  50 |         await expect.poll(() => page.locator('main').evaluate(e => e.scrollWidth-e.clientWidth)).toBeLessThanOrEqual(1);
  51 |         await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
  52 |         const kpis = page.locator('[data-admin-kpis]');
  53 |         await expect(kpis).toBeVisible();
  54 |         await expect.poll(() => kpis.evaluate(e => getComputedStyle(e).gridTemplateColumns.split(' ').length)).toBe(width === 390 ? 1 : width === 1280 ? 3 : 5);
  55 |         await page.screenshot({path:info.outputPath(`${locale}-${width}-${collapsed?'collapsed':'expanded'}.png`),fullPage:true});
  56 |         if (width !== 390 && collapsed) await page.getByRole('button', {name:label(locale,'adminNew.shell.expandSidebar'),exact:true}).click();
  57 |       }
  58 |       if (width === 390) {
  59 |         await page.getByRole('button', {name:label(locale,'header.mainMenu'),exact:true}).click();
  60 |         await expect(page.getByRole('dialog')).toBeVisible();
  61 |         await page.screenshot({path:info.outputPath(`${locale}-390-drawer-open.png`)});
  62 |         await page.keyboard.press('Escape');
  63 |         await expect(page.getByRole('dialog')).toBeHidden();
  64 |       }
  65 |     }
  66 |     const raw = (await page.locator('body').innerText()).match(/\b(?:adminNew|adminModules)\.[A-Za-z][\w.]+/g) ?? [];
  67 |     expect(raw).toEqual([]);
  68 |   });
  69 | }
  70 | 
  71 | for (const write of [false, true]) {
  72 |   test(`customer list write controls and create deep link (${write})`, async ({ page }) => {
  73 |     await session(page, 'staff', false);
  74 |     let mutations = 0;
  75 |     await page.route('**/api/v1/auth/me', route => route.fulfill({json:{id:'reader',name:'Reader',email:'reader@example.test',role:'staff',permissions:write?['customers.view','customers.write']:['customers.view']}}));
  76 |     await page.route('**/api/v1/customers*', route => {
  77 |       if (route.request().method() !== 'GET') { mutations++; return route.fulfill({status:403,json:{message:'Forbidden'}}); }
  78 |       return route.fulfill({json:{data:[{id:'customer-1',name:'Audit Customer',email:'customer@example.test',preferred_locale:'nl',status:'active'}],meta:{total:1,current_page:1,last_page:1,per_page:20}}});
  79 |     });
  80 |     await page.goto('/nl/admin/klanten?new=1');
  81 |     await expect(page.locator('tbody')).toContainText('Audit Customer');
  82 |     const main = page.locator('main');
  83 |     for (const key of ['new','sendLoginLink','impersonate','block']) {
  84 |       const control = main.getByRole('button',{name:label('nl',`adminNew.customers.${key}`),exact:true});
  85 |       if (write) await expect(control).toBeVisible();
  86 |       else await expect(control).toHaveCount(0);
  87 |     }
  88 |     if (!write) await expect(page.getByRole('dialog')).toHaveCount(0);
  89 |     expect(mutations).toBe(0);
  90 |   });
  91 | }
  92 | 
```