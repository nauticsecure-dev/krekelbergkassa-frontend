# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: admin-audit.spec.ts >> customer loading empty validation and create modal retain data then save
- Location: tests\browser\admin-audit.spec.ts:93:5

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText(/Audit validation failure/).first()
Expected: visible
Timeout: 45000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 45000ms
  - waiting for getByText(/Audit validation failure/).first()

```

```yaml
- complementary:
  - img "Krekelberg Nautic logo"
  - text: KREKELBERG Nautic · Jachtmakelaar
  - button "Zijbalk inklappen" [expanded]:
    - img
  - navigation:
    - link "Overzicht":
      - /url: /nl/admin
      - img
      - text: Overzicht
    - link "Planning":
      - /url: /nl/admin/planning
      - img
      - text: Planning
    - link "Kassa":
      - /url: /nl/admin/kassa
      - img
      - text: Kassa
    - link "Stalling":
      - /url: /nl/admin/stalling
      - img
      - text: Stalling
    - link "Klanten":
      - /url: /nl/admin/klanten
      - img
      - text: Klanten
    - link "Boten":
      - /url: /nl/admin/boten
      - img
      - text: Boten
    - link "Makelaardij":
      - /url: /nl/admin/makelaardij
      - img
      - text: Makelaardij
    - link "Financieel":
      - /url: /nl/admin/financieel
      - img
      - text: Financieel
    - link "Diensten & Prijzen":
      - /url: /nl/admin/diensten-prijzen
      - img
      - text: Diensten & Prijzen
    - link "Beheer":
      - /url: /nl/admin/beheer
      - img
      - text: Beheer
    - link "Help & ondersteuning":
      - /url: /nl/faq
      - img
      - text: Help & ondersteuning
  - text: R Reviewer audit@example.test
  - button "Uitloggen":
    - img
- button "Zoeken… ⌘K":
  - img
  - text: Zoeken… ⌘K
- button "Nieuw":
  - img
  - text: Nieuw
- link "Website bekijken":
  - /url: /nl
  - img
  - text: Website bekijken
- button "nl":
  - text: nl
  - img
- link "Online":
  - /url: /nl/admin/sync
  - img
  - text: Online
- button "Meldingen":
  - img
- button "R":
  - text: R
  - img
- main:
  - paragraph: Klanten
  - heading "Klanten" [level=1]
  - paragraph: Centraal klantoverzicht voor kassa, stalling en facturatie
  - link "Gebruikers":
    - /url: /nl/admin/gebruikers
    - button "Gebruikers":
      - img
      - text: Gebruikers
  - text: 0 klanten totaal 0
  - img
  - text: 0 resultaten 0 E-mail 0 Zoeken… —
  - img
  - heading "Klanten" [level=3]
  - paragraph: Centraal klantoverzicht voor kassa, stalling en facturatie
  - button "Nieuwe klant":
    - img
    - text: Nieuwe klant
  - img
  - searchbox "Zoek op naam, e-mail, telefoon, boot"
  - button "Alle talen":
    - text: Alle talen
    - img
  - button "Alle statussen":
    - text: Alle statussen
    - img
  - textbox "Plaats"
  - textbox "Land"
  - button "Alle aanmeldingen":
    - text: Alle aanmeldingen
    - img
  - img
  - text: Geen klanten gevonden Pas je filters aan of maak een nieuwe klant aan.
  - button "Nieuwe klant"
- alert
- dialog:
  - button "Sluiten":
    - img
  - heading "Nieuwe klant" [level=2]
  - paragraph: Minimaal naam en e-mail voor snelle registratie.
  - text: Naam
  - textbox "Naam": Audit Created Customer
  - text: E-mail
  - textbox "E-mail": audit-created@example.test
  - text: Telefoon
  - textbox "Telefoon"
  - text: Geslacht
  - button "Geslacht":
    - text: Niet opgegeven
    - img
  - text: Voorkeurstaal
  - button "Voorkeurstaal":
    - text: Standaard
    - img
  - heading "Adres" [level=3]
  - text: Straat
  - textbox "Straat"
  - text: Huisnummer
  - textbox "Huisnummer"
  - text: Postcode
  - textbox "Postcode"
  - text: Plaats
  - textbox "Plaats"
  - text: Land
  - button "Land":
    - text: Nederland
    - img
  - button "Annuleren"
  - button "Opslaan"
```

# Test source

```ts
  27  |     await expect(main).toBeVisible();
  28  |     await expect.poll(() => main.innerText()).not.toBe('');
  29  |     await expect(main.locator('.animate-pulse, .animate-spin')).toHaveCount(0);
  30  |     // Observe whether this route surfaces the injected error. A rendered heading alone
  31  |     // is only a smoke pass, never a verified error-state pass.
  32  |     await expect(page.locator('body')).not.toContainText('Application error:');
  33  |     const text = await main.innerText();
  34  |     await info.attach('route-observation', { body: JSON.stringify({ route:entry.route, locale:'nl', finalURL:page.url(), injectedErrorVisible:text.includes(failure), text:text.slice(0,2000), errors }), contentType:'application/json' });
  35  |     expect(errors).toEqual([]);
  36  |     const screenshot = info.outputPath('route-error-state.png');
  37  |     await page.screenshot({path:screenshot,fullPage:true});
  38  |     await info.attach('page-evidence',{path:screenshot,contentType:'image/png'});
  39  |   });
  40  | }
  41  | for (const locale of ['nl','en','de','fr']) {
  42  |   test(`${locale}: dashboard sidebar and KPI responsive evidence`, async ({ page }, info) => {
  43  |     await session(page);
  44  |     await page.goto(`/${locale}/admin`);
  45  |     await expect(page.locator('main h1')).toBeVisible();
  46  |     for (const width of [390, 1280, 1536]) {
  47  |       await page.setViewportSize({width,height:1000});
  48  |       for (const collapsed of width === 390 ? [false] : [false,true]) {
  49  |         if (width !== 390 && collapsed) await page.getByRole('button', {name:label(locale,'adminNew.shell.collapseSidebar'),exact:true}).click();
  50  |         await expect.poll(() => page.locator('main').evaluate(e => e.scrollWidth-e.clientWidth)).toBeLessThanOrEqual(1);
  51  |         await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
  52  |         const kpis = page.locator('[data-admin-kpis]');
  53  |         await expect(kpis).toBeVisible();
  54  |         await expect.poll(() => kpis.evaluate(e => getComputedStyle(e).gridTemplateColumns.split(' ').length)).toBe(width === 390 ? 1 : width === 1280 ? 3 : 5);
  55  |         await page.screenshot({path:info.outputPath(`${locale}-${width}-${collapsed?'collapsed':'expanded'}.png`),fullPage:true});
  56  |         if (width !== 390 && collapsed) await page.getByRole('button', {name:label(locale,'adminNew.shell.expandSidebar'),exact:true}).click();
  57  |       }
  58  |       if (width === 390) {
  59  |         await page.getByRole('button', {name:label(locale,'header.mainMenu'),exact:true}).click();
  60  |         await expect(page.getByRole('dialog')).toBeVisible();
  61  |         await page.screenshot({path:info.outputPath(`${locale}-390-drawer-open.png`)});
  62  |         await page.keyboard.press('Escape');
  63  |         await expect(page.getByRole('dialog')).toBeHidden();
  64  |       }
  65  |     }
  66  |     const raw = (await page.locator('body').innerText()).match(/\b(?:adminNew|adminModules)\.[A-Za-z][\w.]+/g) ?? [];
  67  |     expect(raw).toEqual([]);
  68  |   });
  69  | }
  70  | 
  71  | for (const write of [false, true]) {
  72  |   test(`customer list write controls and create deep link (${write})`, async ({ page }) => {
  73  |     await session(page, 'staff', false);
  74  |     let mutations = 0;
  75  |     await page.route('**/api/v1/auth/me', route => route.fulfill({json:{id:'reader',name:'Reader',email:'reader@example.test',role:'staff',permissions:write?['customers.view','customers.write']:['customers.view']}}));
  76  |     await page.route('**/api/v1/customers*', route => {
  77  |       if (route.request().method() !== 'GET') { mutations++; return route.fulfill({status:403,json:{message:'Forbidden'}}); }
  78  |       return route.fulfill({json:{data:[{id:'customer-1',name:'Audit Customer',email:'customer@example.test',preferred_locale:'nl',status:'active'}],meta:{total:1,current_page:1,last_page:1,per_page:20}}});
  79  |     });
  80  |     await page.goto('/nl/admin/klanten?new=1');
  81  |     await expect(page.locator('tbody')).toContainText('Audit Customer');
  82  |     const main = page.locator('main');
  83  |     for (const key of ['new','sendLoginLink','impersonate','block']) {
  84  |       const control = main.getByRole('button',{name:label('nl',`adminNew.customers.${key}`),exact:true});
  85  |       if (write) await expect(control).toBeVisible();
  86  |       else await expect(control).toHaveCount(0);
  87  |     }
  88  |     if (!write) await expect(page.getByRole('dialog')).toHaveCount(0);
  89  |     expect(mutations).toBe(0);
  90  |   });
  91  | }
  92  | 
  93  | test('customer loading empty validation and create modal retain data then save', async ({ page }, info) => {
  94  |   await session(page, 'staff', false);
  95  |   let release!: () => void;
  96  |   const held = new Promise<void>(resolve => { release = resolve; });
  97  |   let first = true;
  98  |   let rejected = true;
  99  |   let posts = 0;
  100 |   let record: Record<string, unknown> | null = null;
  101 |   await page.route('**/api/v1/customers*', async route => {
  102 |     if (route.request().method() === 'POST') {
  103 |       posts++;
  104 |       const payload = route.request().postDataJSON();
  105 |       expect(payload.name).toBe('Audit Created Customer');
  106 |       if (rejected) return route.fulfill({status:422,json:{message:'Audit validation failure',errors:{email:['Audit email already exists']}}});
  107 |       record={...payload,id:'created-customer',status:'active'};
  108 |       return route.fulfill({status:201,json:record});
  109 |     }
  110 |     if(first) {first=false;await held;}
  111 |     return route.fulfill({json:{data:record?[record]:[],meta:{total:record?1:0,current_page:1,last_page:1,per_page:20}}});
  112 |   });
  113 |   await page.goto('/nl/admin/klanten');
  114 |   await expect(page.locator('main .animate-pulse').first()).toBeVisible();
  115 |   release();
  116 |   await expect(page.getByText(label('nl','adminNew.customers.emptyTitle'),{exact:true})).toBeVisible();
  117 |   await page.locator('main').getByRole('button',{name:label('nl','adminNew.customers.new'),exact:true}).first().click();
  118 |   const dialog=page.getByRole('dialog');
  119 |   await expect(dialog).toBeVisible();
  120 |   const name=dialog.getByLabel(label('nl','adminNew.common.name'),{exact:false}).first();
  121 |   await dialog.getByRole('button',{name:label('nl','adminNew.common.save'),exact:true}).click();
  122 |   expect(posts).toBe(0);
  123 |   expect(await name.evaluate((input:HTMLInputElement)=>input.validity.valueMissing)).toBe(true);
  124 |   await name.fill('Audit Created Customer');
  125 |   await dialog.getByLabel(label('nl','adminNew.common.email'),{exact:false}).first().fill('audit-created@example.test');
  126 |   await dialog.getByRole('button',{name:label('nl','adminNew.common.save'),exact:true}).click();
> 127 |   await expect(page.getByText(/Audit email already exists/).first()).toBeVisible();
      |                                                                    ^ Error: expect(locator).toBeVisible() failed
  128 |   await expect(name).toHaveValue('Audit Created Customer');
  129 |   for(const width of [390,1280]) {
  130 |     await page.setViewportSize({width,height:1000});
  131 |     await expect.poll(()=>dialog.evaluate(element=>element.getBoundingClientRect().width)).toBeLessThanOrEqual(width);
  132 |     await page.screenshot({path:info.outputPath(`customer-validation-${width}.png`),fullPage:true});
  133 |   }
  134 |   rejected=false;
  135 |   await dialog.getByRole('button',{name:label('nl','adminNew.common.save'),exact:true}).click();
  136 |   await expect(dialog).toHaveCount(0);
  137 |   await expect(page.locator('tbody')).toContainText('Audit Created Customer');
  138 |   expect(posts).toBe(2);
  139 | });
  140 | 
```