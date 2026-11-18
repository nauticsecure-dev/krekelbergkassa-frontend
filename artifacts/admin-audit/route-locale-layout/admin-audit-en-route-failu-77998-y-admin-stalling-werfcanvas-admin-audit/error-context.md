# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: admin-audit.spec.ts >> en: route failure boundary: /admin/stalling/werfcanvas
- Location: tests\browser\admin-audit.spec.ts:23:7

# Error details

```
Error: expect(received).toBeLessThanOrEqual(expected)

Expected: <= 1
Received:    48

Call Log:
- Timeout 45000ms exceeded while waiting on the predicate
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
            - generic [ref=e10]: Nautic · Yacht brokerage
        - button "Collapse sidebar" [expanded] [ref=e11] [cursor=pointer]:
          - img [ref=e12]
      - navigation [ref=e14]:
        - link "Overview" [ref=e15] [cursor=pointer]:
          - /url: /en/admin
          - img [ref=e16]
          - generic [ref=e19]: Overview
        - link "Planning" [ref=e20] [cursor=pointer]:
          - /url: /en/admin/planning
          - img [ref=e21]
          - generic [ref=e23]: Planning
        - link "POS" [ref=e24] [cursor=pointer]:
          - /url: /en/admin/kassa
          - img [ref=e25]
          - generic [ref=e29]: POS
        - link "Storage" [ref=e30] [cursor=pointer]:
          - /url: /en/admin/stalling
          - img [ref=e32]
          - generic [ref=e35]: Storage
        - link "Customers" [ref=e36] [cursor=pointer]:
          - /url: /en/admin/klanten
          - img [ref=e37]
          - generic [ref=e42]: Customers
        - link "Boats" [ref=e43] [cursor=pointer]:
          - /url: /en/admin/boten
          - img [ref=e44]
          - generic [ref=e48]: Boats
        - link "Brokerage" [ref=e49] [cursor=pointer]:
          - /url: /en/admin/makelaardij
          - img [ref=e50]
          - generic [ref=e53]: Brokerage
        - link "Finance" [ref=e54] [cursor=pointer]:
          - /url: /en/admin/financieel
          - img [ref=e55]
          - generic [ref=e58]: Finance
        - link "Services & Pricing" [ref=e59] [cursor=pointer]:
          - /url: /en/admin/diensten-prijzen
          - img [ref=e60]
          - generic [ref=e64]: Services & Pricing
        - link "Management" [ref=e65] [cursor=pointer]:
          - /url: /en/admin/beheer
          - img [ref=e66]
          - generic [ref=e69]: Management
        - link "System administration" [ref=e70] [cursor=pointer]:
          - /url: /en/admin/systeem
          - img [ref=e71]
          - generic [ref=e73]: System administration
        - link "Help & support" [ref=e75] [cursor=pointer]:
          - /url: /en/faq
          - img [ref=e76]
          - generic [ref=e79]: Help & support
      - generic [ref=e81]:
        - generic [ref=e82]: R
        - generic [ref=e83]:
          - generic [ref=e84]: Reviewer
          - generic [ref=e85]: audit@example.test
        - button "Sign out" [ref=e86] [cursor=pointer]:
          - img [ref=e87]
    - generic [ref=e90]:
      - generic [ref=e92]:
        - button "Search… ⌘K" [ref=e93] [cursor=pointer]:
          - img [ref=e94]
          - generic [ref=e97]: Search…
          - generic [ref=e98]: ⌘K
        - generic [ref=e99]:
          - button "New" [ref=e101] [cursor=pointer]:
            - img [ref=e102]
            - generic [ref=e103]: New
          - link "View page" [ref=e104] [cursor=pointer]:
            - /url: /en/diensten/winterstalling
            - generic [ref=e105]:
              - img [ref=e106]
              - generic [ref=e109]: View page
          - button "en" [ref=e111] [cursor=pointer]:
            - img [ref=e112]
            - generic [ref=e118]: en
            - img [ref=e119]
          - link "Sync error" [ref=e121] [cursor=pointer]:
            - /url: /en/admin/sync
            - generic [ref=e122]:
              - img [ref=e124]
              - generic [ref=e126]: Sync error
          - button "Notifications" [ref=e128] [cursor=pointer]:
            - img [ref=e129]
          - button "R" [ref=e133] [cursor=pointer]:
            - generic [ref=e134]: R
            - img [ref=e135]
      - main [ref=e137]:
        - region "Werfcanvas" [ref=e139]:
          - generic [ref=e140]:
            - generic [ref=e141]:
              - heading "Werfcanvas — Yard operations schedule" [level=1] [ref=e142]
              - paragraph [ref=e143]: Manage boats, moves and history on one yard map.
            - generic [ref=e144]:
              - button "+ Place boat" [disabled] [ref=e145]
              - button "+ Move" [disabled] [ref=e146]
              - button "Edit map" [disabled] [ref=e147]
          - navigation "Werfweergaven" [ref=e148]:
            - button "Werfcanvas" [pressed] [ref=e149] [cursor=pointer]
            - button "Botenlijst" [ref=e150] [cursor=pointer]
            - button "Historie" [ref=e151] [cursor=pointer]
            - link "Taken" [ref=e152] [cursor=pointer]:
              - /url: /en/admin/taken
            - link "Planning" [ref=e153] [cursor=pointer]:
              - /url: /en/admin/planning
          - alert [ref=e154]:
            - generic [ref=e155]: Audit injected service failure
            - button "Refresh" [ref=e156] [cursor=pointer]
          - group "Werfcanvas werkbalk" [ref=e157]:
            - textbox "Zoek boot, klant, registratie of referentie" [ref=e158]:
              - /placeholder: Zoek boot, eigenaar, registratie…
            - generic [ref=e159]:
              - group [ref=e160]:
                - generic "Combine statuses" [ref=e161] [cursor=pointer]
              - combobox "Status" [ref=e162]:
                - option "Status" [selected]
                - option "Present"
                - option "No location"
                - option "Stalling"
                - option "Kraan / Planning"
                - option "Onderhoud"
                - option "Te koop"
                - option "Verplaatsen"
                - option "Actie vereist"
                - option "Geen actieve werkzaamheden"
              - combobox "Dienst" [ref=e163]:
                - option "Service" [selected]
                - option "Storage"
                - option "Crane"
                - option "Pressure washing"
                - option "Maintenance"
                - option "Brokerage"
              - combobox "Zone" [ref=e164]:
                - option "Zone" [selected]
              - group [ref=e165]:
                - generic "Datum" [ref=e166]
                - option "Both" [selected]
                - option "Current"
                - option "Planned"
              - button "Clear filters" [ref=e167] [cursor=pointer]
            - generic [ref=e168]:
              - button "Uitzoomen" [ref=e169] [cursor=pointer]:
                - img [ref=e170]
              - status "Zoomniveau" [ref=e171]: 100%
              - button "Inzoomen" [ref=e172] [cursor=pointer]:
                - img [ref=e173]
            - generic [ref=e174]:
              - button "Fit to view" [ref=e175] [cursor=pointer]
              - group [ref=e176]:
                - generic "Layers" [ref=e177]
              - group [ref=e178]:
                - generic "⋯" [ref=e179]
            - button "Ongedaan maken" [disabled] [ref=e180]:
              - img [ref=e181]
            - button "Opnieuw" [disabled] [ref=e184]:
              - img [ref=e185]
            - button "Save" [disabled] [ref=e188]
            - button "Volledig scherm" [ref=e189] [cursor=pointer]:
              - img [ref=e190]
  - alert [ref=e195]
```

# Test source

```ts
  1   | import { expect, test, type Page } from '@playwright/test';
  2   | import fs from 'node:fs';
  3   | const matrix = JSON.parse(fs.readFileSync('artifacts/admin-audit/source-matrix.json', 'utf8'));
  4   | const dictionaries = Object.fromEntries(['nl','en','de','fr'].map(locale => [locale, JSON.parse(fs.readFileSync(`src/i18n/messages/${locale}.json`, 'utf8'))]));
  5   | const label = (locale: string, key: string): string => key.split('.').reduce((v, k) => v[k], dictionaries[locale]);
  6   | const failure = 'Audit injected service failure';
  7   | const locales = ['nl', 'en', 'de', 'fr'];
  8   | async function session(page: Page, role = 'super_admin', broken = true) {
  9   |   const baseURL = test.info().project.use.baseURL!;
  10  |   await page.context().addCookies([{ name: 'krek_session', value: 'audit-fixture', url: baseURL }]);
  11  |   await page.route('**/*', route => {
  12  |     const url = new URL(route.request().url());
  13  |     if (url.origin !== baseURL) return route.abort();
  14  |     if (!url.pathname.startsWith('/api/')) return route.continue();
  15  |     if (url.pathname.endsWith('/auth/me')) return route.fulfill({ json: { id:'audit', name:'Reviewer', email:'audit@example.test', role, permissions:['*'] } });
  16  |     if (broken) return route.fulfill({ status:503, json:{message:failure} });
  17  |     if (url.pathname.endsWith('/admin/calendar')) return route.fulfill({ json: {regular_hours:[],exceptions:[],lunch_block:null} });
  18  |     return route.fulfill({ json:{data:[],items:[],cards:[],meta:{total:0,current_page:1,last_page:1}} });
  19  |   });
  20  | }
  21  | for (const entry of matrix.pages) for (const locale of locales) {
  22  |   const title = locale === 'nl' ? `route failure boundary: ${entry.route}` : `${locale}: route failure boundary: ${entry.route}`;
  23  |   test(title, async ({ page }, info) => {
  24  |     const errors: string[] = [];
  25  |     page.on('pageerror', error => errors.push(error.message));
  26  |     await session(page, entry.route.startsWith('/admin/werkorders') ? 'staff' : 'super_admin');
  27  |     const pathname = `/${locale}${entry.route.replaceAll('[id]', 'audit-missing-record').replaceAll('[slug]', 'audit-record')}`;
  28  |     await page.setViewportSize({ width: 390, height: 900 });
  29  |     const response = await page.goto(pathname);
  30  |     expect(response?.ok(), `Navigation to ${pathname} returned ${response?.status()}`).toBe(true);
  31  |     const finalURL = new URL(page.url());
  32  |     if (entry.redirect) expect(finalURL.pathname).toMatch(new RegExp(`^/${locale}/admin(?:/|$)`));
  33  |     else expect(finalURL.pathname).toBe(pathname);
  34  |     await expect(page.locator('html')).toHaveAttribute('lang', locale);
  35  |     const main = page.locator('main');
  36  |     await expect(main).toBeVisible();
  37  |     await expect.poll(() => main.innerText()).not.toBe('');
  38  |     await expect(main.locator('.animate-pulse, .animate-spin')).toHaveCount(0);
  39  |     // Observe whether this route surfaces the injected error. A rendered heading alone
  40  |     // is only a smoke pass, never a verified error-state pass.
  41  |     await expect(page.locator('body')).not.toContainText('Application error:');
  42  |     const text = await main.innerText();
  43  |     expect(text.match(/\b(?:adminNew|adminModules|settingsHub|globalUx|siteCopy)\.[A-Za-z0-9][\w.]+/g) ?? []).toEqual([]);
  44  |     const viewports = [];
  45  |     for (const width of [390, 1280, 1536]) {
  46  |       await page.setViewportSize({ width, height: 900 });
  47  |       await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
> 48  |       await expect.poll(() => main.evaluate(element => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1);
      |                                                                                                    ^ Error: expect(received).toBeLessThanOrEqual(expected)
  49  |       viewports.push(width);
  50  |     }
  51  |     await info.attach('route-observation', { body: JSON.stringify({ route:entry.route, locale, finalURL:page.url(), injectedErrorVisible:text.includes(failure), text:text.slice(0,2000), errors, viewports }), contentType:'application/json' });
  52  |     expect(errors).toEqual([]);
  53  |     const screenshot = info.outputPath('route-error-state.png');
  54  |     await page.screenshot({path:screenshot,fullPage:true});
  55  |     await info.attach('page-evidence',{path:screenshot,contentType:'image/png'});
  56  |   });
  57  | }
  58  | for (const locale of locales) {
  59  |   test(`${locale}: dashboard sidebar and KPI responsive evidence`, async ({ page }, info) => {
  60  |     await session(page);
  61  |     await page.goto(`/${locale}/admin`);
  62  |     await expect(page.locator('main h1')).toBeVisible();
  63  |     if (locale === 'fr') {
  64  |       await expect(page.locator('main h1')).toHaveText('Vue opérationnelle');
  65  |       await expect(page.locator('aside').getByRole('link',{name:'Clients',exact:true})).toBeVisible();
  66  |       await expect(page.locator('aside').getByRole('link',{name:'Services et tarifs',exact:true})).toBeVisible();
  67  |     }
  68  |     for (const width of [390, 1280, 1536]) {
  69  |       await page.setViewportSize({width,height:1000});
  70  |       for (const collapsed of width === 390 ? [false] : [false,true]) {
  71  |         if (width !== 390 && collapsed) await page.getByRole('button', {name:label(locale,'adminNew.shell.collapseSidebar'),exact:true}).click();
  72  |         await expect.poll(() => page.locator('main').evaluate(e => e.scrollWidth-e.clientWidth)).toBeLessThanOrEqual(1);
  73  |         await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
  74  |         const kpis = page.locator('[data-admin-kpis]');
  75  |         await expect(kpis).toBeVisible();
  76  |         await expect.poll(() => kpis.evaluate(e => getComputedStyle(e).gridTemplateColumns.split(' ').length)).toBe(width === 390 ? 1 : width === 1280 ? 3 : 5);
  77  |         await page.screenshot({path:info.outputPath(`${locale}-${width}-${collapsed?'collapsed':'expanded'}.png`),fullPage:true});
  78  |         if (width !== 390 && collapsed) await page.getByRole('button', {name:label(locale,'adminNew.shell.expandSidebar'),exact:true}).click();
  79  |       }
  80  |       if (width === 390) {
  81  |         await page.getByRole('button', {name:label(locale,'header.mainMenu'),exact:true}).click();
  82  |         await expect(page.getByRole('dialog')).toBeVisible();
  83  |         await page.screenshot({path:info.outputPath(`${locale}-390-drawer-open.png`)});
  84  |         await page.keyboard.press('Escape');
  85  |         await expect(page.getByRole('dialog')).toBeHidden();
  86  |       }
  87  |     }
  88  |     const raw = (await page.locator('body').innerText()).match(/\b(?:adminNew|adminModules)\.[A-Za-z][\w.]+/g) ?? [];
  89  |     expect(raw).toEqual([]);
  90  |   });
  91  | }
  92  | 
  93  | for (const write of [false, true]) {
  94  |   test(`customer list write controls and create deep link (${write})`, async ({ page }) => {
  95  |     await session(page, 'staff', false);
  96  |     let mutations = 0;
  97  |     await page.route('**/api/v1/auth/me', route => route.fulfill({json:{id:'reader',name:'Reader',email:'reader@example.test',role:'staff',permissions:write?['customers.view','customers.write']:['customers.view']}}));
  98  |     await page.route('**/api/v1/customers*', route => {
  99  |       if (route.request().method() !== 'GET') { mutations++; return route.fulfill({status:403,json:{message:'Forbidden'}}); }
  100 |       return route.fulfill({json:{data:[{id:'customer-1',name:'Audit Customer',email:'customer@example.test',preferred_locale:'nl',status:'active'}],meta:{total:1,current_page:1,last_page:1,per_page:20}}});
  101 |     });
  102 |     await page.goto('/nl/admin/klanten?new=1');
  103 |     await expect(page.locator('tbody')).toContainText('Audit Customer');
  104 |     const main = page.locator('main');
  105 |     for (const key of ['new','sendLoginLink','impersonate','block']) {
  106 |       const control = main.getByRole('button',{name:label('nl',`adminNew.customers.${key}`),exact:true});
  107 |       if (write) await expect(control).toBeVisible();
  108 |       else await expect(control).toHaveCount(0);
  109 |     }
  110 |     if (!write) await expect(page.getByRole('dialog')).toHaveCount(0);
  111 |     expect(mutations).toBe(0);
  112 |   });
  113 | }
  114 | 
  115 | for (const locale of locales) {
  116 |   test(locale === 'nl' ? 'customer loading empty validation and create modal retain data then save' : locale + ': customer loading empty validation and create modal retain data then save', async ({ page }, info) => {
  117 |     await session(page, 'staff', false);
  118 |     let release!: () => void;
  119 |     const held = new Promise<void>(resolve => { release = resolve; });
  120 |     let first = true;
  121 |     let rejected = true;
  122 |     let posts = 0;
  123 |     let record: Record<string, unknown> | null = null;
  124 |     await page.route('**/api/v1/customers*', async route => {
  125 |       if (route.request().method() === 'POST') {
  126 |         posts++;
  127 |         const payload = route.request().postDataJSON();
  128 |         expect(payload.name).toBe('Audit Created Customer');
  129 |         if (rejected) return route.fulfill({status:422,json:{message:'Audit validation failure',errors:{email:['Audit email already exists']}}});
  130 |         record={...payload,id:'created-customer',status:'active'};
  131 |         return route.fulfill({status:201,json:record});
  132 |       }
  133 |       if(first) {first=false;await held;}
  134 |       return route.fulfill({json:{data:record?[record]:[],meta:{total:record?1:0,current_page:1,last_page:1,per_page:20}}});
  135 |     });
  136 |     await page.goto('/' + locale + '/admin/klanten');
  137 |     await expect(page.locator('main .animate-pulse').first()).toBeVisible();
  138 |     release();
  139 |     await expect(page.getByText(label(locale,'adminNew.customers.emptyTitle'),{exact:true})).toBeVisible();
  140 |     await page.locator('main').getByRole('button',{name:label(locale,'adminNew.customers.new'),exact:true}).first().click();
  141 |     const dialog=page.getByRole('dialog');
  142 |     await expect(dialog).toBeVisible();
  143 |     await expect(dialog.getByRole('heading', { name: label(locale, 'adminNew.customers.modal.title'), exact: true })).toBeVisible();
  144 |     const name=dialog.getByLabel(label(locale,'adminNew.common.name'),{exact:false}).first();
  145 |     await dialog.getByRole('button',{name:label(locale,'adminNew.common.save'),exact:true}).click();
  146 |     expect(posts).toBe(0);
  147 |     expect(await name.evaluate((input:HTMLInputElement)=>input.validity.valueMissing)).toBe(true);
  148 |     await name.fill('Audit Created Customer');
```