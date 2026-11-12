# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: admin-review.spec.ts >> nl: audit loading empty error recovery and technical dialog copy
- Location: tests\browser\admin-review.spec.ts:426:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('Audit logs laden', { exact: true })
Expected: visible
Timeout: 45000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 45000ms
  - waiting for getByText('Audit logs laden', { exact: true })

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
    - link "Systeembeheer":
      - /url: /nl/admin/systeem
      - img
      - text: Systeembeheer
    - link "Help & ondersteuning":
      - /url: /nl/faq
      - img
      - text: Help & ondersteuning
  - text: AR Audit Reviewer review@example.test
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
- button "AR":
  - text: AR
  - img
- main:
  - heading "Audit" [level=1]
  - paragraph: Controlelog voor beveiliging, betalingen, facturen, klanten en sync
  - text: 0 gebeurtenissen 0
  - img
  - text: Gebeurtenistypes 0 Entiteitstypes 0 Recente activiteit 0
  - img
  - heading "Activiteit / Klantreis" [level=3]
  - paragraph: Publieke klantreizen, API-resultaten en bevestigde afspraken.
  - text: Naam, pagina of verzoek
  - textbox "Naam, pagina of verzoek"
  - text: Intentie
  - combobox "Intentie":
    - option "Alle intenties"
    - option "Kraanafspraak" [selected]
    - option "Boot verkopen"
    - option "Winterstalling"
    - option "Boot kopen"
  - text: API-eindpunt
  - textbox "API-eindpunt"
  - text: Minimale HTTP-status
  - spinbutton "Minimale HTTP-status"
  - text: Pagina
  - textbox "Pagina"
  - text: Gebeurtenistype
  - combobox "Gebeurtenistype":
    - option "Alle" [selected]
    - option "Pagina geopend"
    - option "Boekingsformulier gestart"
    - option "Boeking ingediend"
    - option "Boeking mislukt"
    - option "Boeking geblokkeerd door validatie"
    - option "Fout getoond aan klant"
    - option "Foto-upload mislukt"
    - option "API-verzoek mislukt"
    - option "Afspraak aangemaakt"
  - text: Van
  - textbox "Van"
  - text: Tot
  - textbox "Tot"
  - checkbox "Alleen fouten"
  - text: Alleen fouten
  - checkbox "Afgebroken formulieren"
  - text: Afgebroken formulieren
  - img
  - heading "Audit" [level=3]
  - paragraph: Controlelog voor beveiliging, betalingen, facturen, klanten en sync
  - img
  - searchbox "Zoek op actie, actor, entity"
  - button "Alle onderdelen":
    - text: Alle onderdelen
    - img
  - button "Alle entity types":
    - text: Alle entity types
    - img
  - button "Alle resultaten":
    - text: Alle resultaten
    - img
  - text: Vanaf
  - textbox "Vanaf"
  - text: Tot
  - textbox "Tot"
  - checkbox "Technische events tonen"
  - text: Technische events tonen
  - img
  - text: Geen audit events
- alert
```

# Test source

```ts
  341 |         { field: 'total', x: 0.55, y: 0.75, w: 0.35, h: 0.08 },
  342 |       ],
  343 |     },
  344 |   }));
  345 |   await page.route('**/api/v1/invoice-imports/imp-populated/source-pdf**', (route) => route.fulfill({
  346 |     json: {
  347 |       filename: 'populated-invoice.png',
  348 |       mime_type: 'image/png',
  349 |       signed_url: `${test.info().project.use.baseURL}/fixture-doc.png`,
  350 |     },
  351 |   }));
  352 |   await page.route('**/api/v1/invoice-extraction-templates/tpl-populated/metrics**', (route) => route.fulfill({
  353 |     json: { used_count: 12, success_rate: 0.91, average_confidence: 0.88 },
  354 |   }));
  355 | 
  356 |   await page.goto('/nl/admin/facturen/templates/editor?id=tpl-populated&importId=imp-populated&mode=extraction');
  357 |   await setSidebar(page, sidebar);
  358 |   await expect(page.locator('main')).toContainText(text('nl', 'adminNew.templates.zonesTitle'));
  359 |   await expect(page.locator('main')).toContainText(/3/);
  360 |   const surface = page.locator('.touch-none').first();
  361 |   await expect(surface).toBeVisible();
  362 |   const box = await surface.boundingBox();
  363 |   expect(box).toBeTruthy();
  364 |   await page.mouse.move(box!.x + box!.width * 0.2, box!.y + box!.height * 0.2);
  365 |   await page.mouse.down();
  366 |   await page.mouse.move(box!.x + box!.width * 0.45, box!.y + box!.height * 0.35);
  367 |   await page.mouse.up();
  368 |   await captureWidths(page, testInfo, 'document-zone-editor');
  369 |   expect(errors).toEqual([]);
  370 | });
  371 | 
  372 | test(`audit detail modal wraps long before/after values without page overflow [sidebar ${sidebar}]`, async ({ page }, testInfo) => {
  373 |   const errors: string[] = [];
  374 |   page.on('pageerror', (error) => errors.push(error.message));
  375 |   await isolatedSession(page);
  376 |   const before = `{"email":"oud-${LONG}@example.test","notes":"${LONG.repeat(3)}","iban":"NL91ABNA0417164300-EXTRA-LANG-SEGMENT"}`;
  377 |   const after = `{"email":"nieuw-${LONG}@example.test","notes":"${LONG.repeat(3)}-bijgewerkt","iban":"NL20INGB0001234567-EXTRA-LANG-SEGMENT"}`;
  378 |   await page.route('**/api/v1/admin/audit-logs**', (route) => route.fulfill({
  379 |     json: {
  380 |       data: [{
  381 |         id: 'audit-long-1',
  382 |         action: 'customer.updated',
  383 |         title: `Klant bijgewerkt ${LONG}`,
  384 |         entity_type: 'customer',
  385 |         entity_name: LONG,
  386 |         entity_id: 'cust-1',
  387 |         category: 'customers',
  388 |         severity: 'info',
  389 |         created_at: '2026-10-28T12:00:00Z',
  390 |         user: { name: `Medewerker ${LONG}` },
  391 |         changes: [
  392 |           { field_name: 'email_address_with_unusually_long_field_key', old_value: before, new_value: after },
  393 |           { field_name: 'internal_crm_synchronisation_payload', old_value: before.repeat(2), new_value: after.repeat(2) },
  394 |         ],
  395 |         can_view_details: true,
  396 |       }],
  397 |       meta: { total: 1, current_page: 1, last_page: 1, per_page: 20 },
  398 |       counters: { total: 1 },
  399 |     },
  400 |   }));
  401 | 
  402 |   await page.goto('/nl/admin/audit');
  403 |   await setSidebar(page, sidebar);
  404 |   await expect(page.locator('main h1')).toBeVisible();
  405 |   await page.getByRole('button', { name: `Klant bijgewerkt ${LONG}`, exact: true }).click();
  406 |   const dialog = page.getByRole('dialog');
  407 |   await expect(dialog).toBeVisible();
  408 |   await expect(dialog).toContainText(before.slice(0, 40));
  409 |   await expect(dialog).toContainText(after.slice(0, 40));
  410 |   for (const width of [390, 1280, 1536]) {
  411 |     await page.setViewportSize({ width, height: 1000 });
  412 |     const box = await dialog.boundingBox();
  413 |     expect(box).toBeTruthy();
  414 |     expect(box!.x).toBeGreaterThanOrEqual(0);
  415 |     expect(box!.x + box!.width).toBeLessThanOrEqual(width + 1);
  416 |     await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
  417 |     await page.screenshot({ path: testInfo.outputPath(`audit-diff-modal-${width}.png`), fullPage: true });
  418 |     await test.info().attach('layout-evidence', { path: testInfo.outputPath(`audit-diff-modal-${width}.png`), contentType: 'image/png' });
  419 |   }
  420 |   expect(errors).toEqual([]);
  421 | });
  422 | 
  423 | }
  424 | 
  425 | for (const locale of ['nl', 'en', 'de', 'fr']) {
  426 |   test(locale + ': audit loading empty error recovery and technical dialog copy', async ({ page }, info) => {
  427 |     await isolatedSession(page);
  428 |     let phase = 'empty';
  429 |     let release!: () => void;
  430 |     const held = new Promise<void>(resolve => { release = resolve; });
  431 |     let first = true;
  432 |     await page.route('**/api/v1/admin/audit-logs**', async route => {
  433 |       if (first) { first = false; await held; }
  434 |       if (phase === 'error') return route.fulfill({ status: 503, json: { message: 'Audit service unavailable' } });
  435 |       return route.fulfill({ json: {
  436 |         data: phase === 'populated' ? [{ id:'locale-audit', action:'customer.updated', title:'Locale audit record', entity_type:'customer', entity_name:LONG, severity:'info', created_at:'2026-10-28T12:00:00Z', can_view_details:true, request_id:LONG, changes:[{field_name:'email',old_value:'old@example.test',new_value:'new@example.test'}] }] : [],
  437 |         meta:{total:phase === 'populated' ? 1 : 0,current_page:1,last_page:1,per_page:20}, counters:{total:1}
  438 |       } });
  439 |     });
  440 |     await page.goto('/' + locale + '/admin/audit');
> 441 |     await expect(page.getByText(text(locale,'adminNew.audit.loading'), {exact:true})).toBeVisible();
      |                                                                                       ^ Error: expect(locator).toBeVisible() failed
  442 |     release();
  443 |     await expect(page.getByText(text(locale,'adminNew.audit.empty'), {exact:true})).toBeVisible();
  444 |     phase = 'error'; await page.reload();
  445 |     await expect(page.locator('main')).toContainText('Audit service unavailable');
  446 |     phase = 'populated';
  447 |     await page.locator('main').getByRole('button',{name:text(locale,'adminNew.states.retry'),exact:true}).click();
  448 |     await page.getByRole('button',{name:'Locale audit record',exact:true}).click();
  449 |     const dialog=page.getByRole('dialog');
  450 |     await dialog.getByRole('button',{name:text(locale,'adminNew.audit.technicalDetails'),exact:true}).click();
  451 |     for(const key of ['event','id','entityId','requestId','correlationId','ip','endpoint','method','browser']) {
  452 |       await expect(dialog.locator('dt').filter({hasText:new RegExp('^'+text(locale,'adminNew.audit.technical.'+key)+'$')})).toHaveCount(1);
  453 |     }
  454 |     await captureWidths(page, info, locale+'-audit-technical');
  455 |     expect((await dialog.innerText()).match(/\b(?:adminNew|adminModules)\.[A-Za-z][\w.]+/g) ?? []).toEqual([]);
  456 |   });
  457 | }
  458 | 
```