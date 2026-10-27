# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: admin-audit.spec.ts >> route failure boundary: /admin/calculator/history
- Location: tests\browser\admin-audit.spec.ts:21:7

# Error details

```
Error: expect(received).not.toBe(expected) // Object.is equality

Expected: not ""

Call Log:
- Timeout 15000ms exceeded while waiting on the predicate
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - complementary [ref=e3]:
      - generic [ref=e4]:
        - generic "Krekelberg Nautic" [ref=e5]:
          - img "Krekelberg Nautic logo" [ref=e7]
          - generic [ref=e8]:
            - generic [ref=e9]: KREKELBERG
            - generic [ref=e10]: Nautic · Jachtmakelaar
        - button "Zijbalk inklappen" [expanded] [ref=e11] [cursor=pointer]:
          - img [ref=e12]
      - navigation [ref=e14]:
        - link "Overzicht" [ref=e15] [cursor=pointer]:
          - /url: /nl/admin
          - img [ref=e16]
          - generic [ref=e19]: Overzicht
        - link "Planning" [ref=e20] [cursor=pointer]:
          - /url: /nl/admin/planning
          - img [ref=e21]
          - generic [ref=e23]: Planning
        - link "Kassa" [ref=e24] [cursor=pointer]:
          - /url: /nl/admin/kassa
          - img [ref=e25]
          - generic [ref=e29]: Kassa
        - link "Stalling" [ref=e30] [cursor=pointer]:
          - /url: /nl/admin/stalling
          - img [ref=e31]
          - generic [ref=e34]: Stalling
        - link "Klanten" [ref=e35] [cursor=pointer]:
          - /url: /nl/admin/klanten
          - img [ref=e36]
          - generic [ref=e41]: Klanten
        - link "Boten" [ref=e42] [cursor=pointer]:
          - /url: /nl/admin/boten
          - img [ref=e43]
          - generic [ref=e47]: Boten
        - link "Makelaardij" [ref=e48] [cursor=pointer]:
          - /url: /nl/admin/makelaardij
          - img [ref=e49]
          - generic [ref=e52]: Makelaardij
        - link "Financieel" [ref=e53] [cursor=pointer]:
          - /url: /nl/admin/financieel
          - img [ref=e54]
          - generic [ref=e57]: Financieel
        - link "Diensten & Prijzen" [ref=e58] [cursor=pointer]:
          - /url: /nl/admin/diensten-prijzen
          - img [ref=e60]
          - generic [ref=e64]: Diensten & Prijzen
        - link "Beheer" [ref=e65] [cursor=pointer]:
          - /url: /nl/admin/beheer
          - img [ref=e66]
          - generic [ref=e69]: Beheer
        - link "Systeembeheer" [ref=e70] [cursor=pointer]:
          - /url: /nl/admin/systeem
          - img [ref=e71]
          - generic [ref=e73]: Systeembeheer
        - link "Help & ondersteuning" [ref=e75] [cursor=pointer]:
          - /url: /nl/faq
          - img [ref=e76]
          - generic [ref=e79]: Help & ondersteuning
      - generic [ref=e81]:
        - generic [ref=e82]: R
        - generic [ref=e83]:
          - generic [ref=e84]: Reviewer
          - generic [ref=e85]: audit@example.test
        - button "Uitloggen" [ref=e86] [cursor=pointer]:
          - img [ref=e87]
    - generic [ref=e90]:
      - generic [ref=e92]:
        - button "Zoeken… ⌘K" [ref=e93] [cursor=pointer]:
          - img [ref=e94]
          - generic [ref=e97]: Zoeken…
          - generic [ref=e98]: ⌘K
        - generic [ref=e99]:
          - button "Nieuw" [ref=e101] [cursor=pointer]:
            - img [ref=e102]
            - generic [ref=e103]: Nieuw
          - link "Website bekijken" [ref=e104] [cursor=pointer]:
            - /url: /nl
            - generic [ref=e105]:
              - img [ref=e106]
              - generic [ref=e109]: Website bekijken
          - button "nl" [ref=e111] [cursor=pointer]:
            - img [ref=e112]
            - generic [ref=e116]: nl
            - img [ref=e117]
          - link "Sync fout" [ref=e119] [cursor=pointer]:
            - /url: /nl/admin/sync
            - generic [ref=e120]:
              - img [ref=e122]
              - text: Sync fout
          - button "Meldingen" [ref=e125] [cursor=pointer]:
            - img [ref=e126]
          - button "R" [ref=e130] [cursor=pointer]:
            - generic [ref=e131]: R
            - img [ref=e132]
      - main [ref=e134]
  - alert [ref=e135]
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
  27 |     await expect(main).toBeVisible();
> 28 |     await expect.poll(() => main.innerText()).not.toBe('');
     |                                                   ^ Error: expect(received).not.toBe(expected) // Object.is equality
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
  67 | for (const write of [false, true]) {
  68 |   test(`customer list write controls and create deep link (${write})`, async ({ page }) => {
  69 |     await session(page, 'staff', false);
  70 |     let mutations = 0;
  71 |     await page.route('**/api/v1/auth/me', route => route.fulfill({json:{id:'reader',name:'Reader',email:'reader@example.test',role:'staff',permissions:write?['customers.view','customers.write']:['customers.view']}}));
  72 |     await page.route('**/api/v1/customers*', route => {
  73 |       if (route.request().method() !== 'GET') { mutations++; return route.fulfill({status:403,json:{message:'Forbidden'}}); }
  74 |       return route.fulfill({json:{data:[{id:'customer-1',name:'Audit Customer',email:'customer@example.test',preferred_locale:'nl',status:'active'}],meta:{total:1,current_page:1,last_page:1,per_page:20}}});
  75 |     });
  76 |     await page.goto('/nl/admin/klanten?new=1');
  77 |     await expect(page.locator('tbody')).toContainText('Audit Customer');
  78 |     const main = page.locator('main');
  79 |     for (const key of ['new','sendLoginLink','impersonate','block']) {
  80 |       const control = main.getByRole('button',{name:label('nl',`adminNew.customers.${key}`),exact:true});
  81 |       if (write) await expect(control).toBeVisible();
  82 |       else await expect(control).toHaveCount(0);
  83 |     }
  84 |     if (!write) await expect(page.getByRole('dialog')).toHaveCount(0);
  85 |     expect(mutations).toBe(0);
  86 |   });
  87 | }
  88 | 
```