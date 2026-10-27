# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: admin-audit.spec.ts >> nl: dashboard sidebar and KPI responsive evidence
- Location: tests\browser\admin-audit.spec.ts:42:7

# Error details

```
Test timeout of 180000ms exceeded.
```

```
Error: locator.click: Test timeout of 180000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: 'Zijbalk uitklappen', exact: true })
    2 × waiting for" http://localhost:3047/nl/admin" navigation to finish...
      - navigated to "http://localhost:3047/nl/admin"

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
          - img [ref=e17]
          - generic [ref=e20]: Overzicht
        - link "Planning" [ref=e21] [cursor=pointer]:
          - /url: /nl/admin/planning
          - img [ref=e22]
          - generic [ref=e24]: Planning
        - link "Kassa" [ref=e25] [cursor=pointer]:
          - /url: /nl/admin/kassa
          - img [ref=e26]
          - generic [ref=e30]: Kassa
        - link "Stalling" [ref=e31] [cursor=pointer]:
          - /url: /nl/admin/stalling
          - img [ref=e32]
          - generic [ref=e35]: Stalling
        - link "Klanten" [ref=e36] [cursor=pointer]:
          - /url: /nl/admin/klanten
          - img [ref=e37]
          - generic [ref=e42]: Klanten
        - link "Boten" [ref=e43] [cursor=pointer]:
          - /url: /nl/admin/boten
          - img [ref=e44]
          - generic [ref=e48]: Boten
        - link "Makelaardij" [ref=e49] [cursor=pointer]:
          - /url: /nl/admin/makelaardij
          - img [ref=e50]
          - generic [ref=e53]: Makelaardij
        - link "Financieel" [ref=e54] [cursor=pointer]:
          - /url: /nl/admin/financieel
          - img [ref=e55]
          - generic [ref=e58]: Financieel
        - link "Diensten & Prijzen" [ref=e59] [cursor=pointer]:
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
      - main [ref=e134]:
        - generic [ref=e135]:
          - generic [ref=e138]:
            - generic [ref=e139]:
              - generic [ref=e140]:
                - paragraph [ref=e141]: KREKELBERG NAUTIC
                - heading "Operationeel overzicht" [level=1] [ref=e142]
                - paragraph [ref=e143]: Alles wat vandaag aandacht nodig heeft
              - link "Afspraak aanmaken" [ref=e145] [cursor=pointer]:
                - /url: /nl/admin/afspraken?create=1
                - button "Afspraak aanmaken" [ref=e146]:
                  - img [ref=e148]
                  - generic [ref=e150]: Afspraak aanmaken
            - generic [ref=e152]:
              - link "Open facturen — — achterstallig" [ref=e154] [cursor=pointer]:
                - /url: /nl/admin/facturen?payment_status=open
                - generic [ref=e155]:
                  - generic [ref=e156]:
                    - generic [ref=e158]: Open facturen
                    - generic [ref=e159]: —
                    - generic [ref=e160]: — achterstallig
                  - img [ref=e162]
              - link "Actieve stalling — — lopen binnenkort af" [ref=e165] [cursor=pointer]:
                - /url: /nl/admin/stalling
                - generic [ref=e166]:
                  - generic [ref=e167]:
                    - generic [ref=e169]: Actieve stalling
                    - generic [ref=e170]: —
                    - generic [ref=e171]: — lopen binnenkort af
                  - img [ref=e173]
              - link "Kassa omzet — Vandaag" [ref=e177] [cursor=pointer]:
                - /url: /nl/admin/kassa
                - generic [ref=e178]:
                  - generic [ref=e179]:
                    - generic [ref=e181]: Kassa omzet
                    - generic [ref=e182]: —
                    - generic [ref=e183]: Vandaag
                  - img [ref=e185]
              - link "Lage voorraad — Producten onder minimumvoorraad" [ref=e189] [cursor=pointer]:
                - /url: /nl/admin/producten?low_stock=1
                - generic [ref=e190]:
                  - generic [ref=e191]:
                    - generic [ref=e193]: Lage voorraad
                    - generic [ref=e194]: —
                    - generic [ref=e195]: Producten onder minimumvoorraad
                  - img [ref=e197]
              - link "Sync status — Sync fout" [ref=e202] [cursor=pointer]:
                - /url: /nl/admin/sync
                - generic [ref=e203]:
                  - generic [ref=e204]:
                    - generic [ref=e206]: Sync status
                    - generic [ref=e207]: —
                    - generic [ref=e208]: Sync fout
                  - img [ref=e210]
          - generic [ref=e212]:
            - generic [ref=e213]:
              - generic [ref=e215]:
                - img [ref=e217]
                - generic [ref=e219]:
                  - heading "Mogelijk gemiste kansen" [level=3] [ref=e220]
                  - paragraph [ref=e221]: Kraanafspraak
              - generic [ref=e222]:
                - alert [ref=e223]: "Audit injected service failure (ref: req_418a69f8103d44569bd3)"
                - link "Activiteit / Klantreis →" [ref=e224] [cursor=pointer]:
                  - /url: /nl/admin/audit
            - generic [ref=e225]:
              - link "Afspraken vandaag —" [ref=e226] [cursor=pointer]:
                - /url: /nl/admin/afspraken
                - generic [ref=e227]:
                  - generic [ref=e228]: Afspraken vandaag
                  - generic [ref=e229]: —
              - link "Kraanopdrachten —" [ref=e230] [cursor=pointer]:
                - /url: /nl/admin/afspraken
                - generic [ref=e231]:
                  - generic [ref=e232]: Kraanopdrachten
                  - generic [ref=e233]: —
              - link "Aflopende stalling (30 dagen) —" [ref=e234] [cursor=pointer]:
                - /url: /nl/admin/stalling
                - generic [ref=e235]:
                  - generic [ref=e236]: Aflopende stalling (30 dagen)
                  - generic [ref=e237]: —
              - link "Achterstallige facturen —" [ref=e238] [cursor=pointer]:
                - /url: /nl/admin/facturen?payment_status=overdue
                - generic [ref=e239]:
                  - generic [ref=e240]: Achterstallige facturen
                  - generic [ref=e241]: —
              - link "Nieuwe klanten vandaag —" [ref=e242] [cursor=pointer]:
                - /url: /nl/admin/klanten
                - generic [ref=e243]:
                  - generic [ref=e244]: Nieuwe klanten vandaag
                  - generic [ref=e245]: —
              - link "Nieuwe makelaardijleads Geen leadregister" [ref=e246] [cursor=pointer]:
                - /url: /nl/admin/makelaardij
                - generic [ref=e247]:
                  - generic [ref=e248]: Nieuwe makelaardijleads
                  - generic [ref=e249]: Geen leadregister
            - generic [ref=e250]:
              - generic [ref=e251]:
                - generic [ref=e253]:
                  - img [ref=e255]
                  - generic [ref=e257]:
                    - heading "Snelle acties" [level=3] [ref=e258]
                    - paragraph [ref=e259]: Alles wat vandaag aandacht nodig heeft
                - generic [ref=e261]:
                  - status [ref=e262]: Snelkoppelingen konden niet worden geladen. Standaard snelkoppelingen worden getoond.
                  - link "Kassa" [ref=e263] [cursor=pointer]:
                    - /url: /nl/admin/kassa
                    - img [ref=e265]
                    - generic [ref=e268]: Kassa
                    - img [ref=e269]
                  - link "Stalling opvolgen" [ref=e271] [cursor=pointer]:
                    - /url: /nl/admin/stalling
                    - img [ref=e273]
                    - generic [ref=e277]: Stalling opvolgen
                    - img [ref=e278]
                  - link "Facturen opvolgen" [ref=e280] [cursor=pointer]:
                    - /url: /nl/admin/facturen
                    - img [ref=e282]
                    - generic [ref=e286]: Facturen opvolgen
                    - img [ref=e287]
                  - link "Prijs berekenen" [ref=e289] [cursor=pointer]:
                    - /url: /nl/admin/calculator
                    - img [ref=e291]
                    - generic [ref=e294]: Prijs berekenen
                    - img [ref=e295]
              - generic [ref=e297]:
                - generic [ref=e299]:
                  - img [ref=e301]
                  - generic [ref=e303]:
                    - heading "Calculator" [level=3] [ref=e304]
                    - paragraph [ref=e305]: Bereken direct een prijs uit de centrale prijsregels.
                - generic [ref=e307]:
                  - generic [ref=e308]:
                    - generic [ref=e309]: Dienst
                    - button "Winter" [ref=e311] [cursor=pointer]:
                      - generic [ref=e312]: Winter
                      - img [ref=e313]
                  - generic [ref=e315]:
                    - generic [ref=e316]: Bootlengte (cm)
                    - spinbutton [ref=e317]: "890"
                  - generic [ref=e318]:
                    - button "Bereken prijs" [ref=e319] [cursor=pointer]:
                      - generic [ref=e320]: Bereken prijs
                    - link "Open volledige calculator →" [ref=e321] [cursor=pointer]:
                      - /url: /nl/admin/calculator
            - generic [ref=e322]:
              - generic [ref=e324]:
                - img [ref=e326]
                - generic [ref=e329]:
                  - heading "Slimme herinneringen" [level=3] [ref=e330]
                  - paragraph [ref=e331]: Overzicht van geplande en achterstallige klantherinneringen
              - generic [ref=e333]:
                - link "Openstaande facturen —" [ref=e334] [cursor=pointer]:
                  - /url: /nl/admin/facturen?payment_status=open
                  - generic [ref=e335]:
                    - generic [ref=e336]: Openstaande facturen
                    - generic [ref=e337]: —
                - link "Contracten verlopen —" [ref=e338] [cursor=pointer]:
                  - /url: /nl/admin/stalling?status=expiring
                  - generic [ref=e339]:
                    - generic [ref=e340]: Contracten verlopen
                    - generic [ref=e341]: —
                - link "Werkorders due —" [ref=e342] [cursor=pointer]:
                  - /url: /nl/admin/werkorders
                  - generic [ref=e343]:
                    - generic [ref=e344]: Werkorders due
                    - generic [ref=e345]: —
            - generic [ref=e346]:
              - generic [ref=e347]:
                - generic [ref=e348]:
                  - generic [ref=e349]:
                    - img [ref=e351]
                    - generic [ref=e353]:
                      - heading "Recente activiteit" [level=3] [ref=e354]
                      - paragraph [ref=e355]: Belangrijke recente gebeurtenissen.
                  - link "Openen →" [ref=e357] [cursor=pointer]:
                    - /url: /nl/admin/timeline
                    - button "Openen →" [ref=e358]:
                      - generic [ref=e359]: Openen →
                - generic [ref=e361]:
                  - paragraph [ref=e362]: Activiteit kon niet worden geladen.
                  - button "Opnieuw proberen" [ref=e363] [cursor=pointer]:
                    - generic [ref=e364]: Opnieuw proberen
              - generic [ref=e365]:
                - generic [ref=e367]:
                  - img [ref=e369]
                  - generic [ref=e372]:
                    - heading "Kasverschil vandaag" [level=3] [ref=e373]
                    - paragraph [ref=e374]: Verschil uit de laatste dagafsluiting.
                - generic [ref=e375]:
                  - paragraph [ref=e376]: Nog geen dagafsluiting vandaag.
                  - link "Naar dagafsluiting →" [ref=e377] [cursor=pointer]:
                    - /url: /nl/admin/kassa/dagafsluiting
  - alert [ref=e378]
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
> 56 |         if (width !== 390 && collapsed) await page.getByRole('button', {name:label(locale,'adminNew.shell.expandSidebar'),exact:true}).click();
     |                                                                                                                                        ^ Error: locator.click: Test timeout of 180000ms exceeded.
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