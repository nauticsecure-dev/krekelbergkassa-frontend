# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: admin-review.spec.ts >> de: audit loading empty error recovery and technical dialog copy
- Location: tests\browser\admin-review.spec.ts:426:7

# Error details

```
Error: locator.click: Error: strict mode violation: locator('main').getByRole('button', { name: 'Erneut versuchen', exact: true }) resolved to 2 elements:
    1) <button class="inline-flex items-center justify-center rounded-lg font-medium transition focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50 bg-navy-900 text-white hover:bg-navy-800 focus-visible:ring-navy-300 h-9 px-3 text-sm gap-1.5">…</button> aka getByRole('button', { name: 'Erneut versuchen' }).first()
    2) <button class="inline-flex items-center justify-center rounded-lg font-medium transition focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50 border border-navy-200 bg-white text-navy-800 hover:bg-navy-50 focus-visible:ring-navy-200 h-9 px-3 text-sm gap-1.5 mt-4">…</button> aka getByRole('button', { name: 'Erneut versuchen' }).nth(1)

Call log:
  - waiting for locator('main').getByRole('button', { name: 'Erneut versuchen', exact: true })

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
        - button "Seitenleiste einklappen" [expanded] [ref=e11] [cursor=pointer]:
          - img [ref=e12]
      - navigation [ref=e14]:
        - link "Übersicht" [ref=e15] [cursor=pointer]:
          - /url: /de/admin
          - img [ref=e16]
          - generic [ref=e19]: Übersicht
        - link "Planung" [ref=e20] [cursor=pointer]:
          - /url: /de/admin/planning
          - img [ref=e21]
          - generic [ref=e23]: Planung
        - link "Kasse" [ref=e24] [cursor=pointer]:
          - /url: /de/admin/kassa
          - img [ref=e25]
          - generic [ref=e29]: Kasse
        - link "Lagerung" [ref=e30] [cursor=pointer]:
          - /url: /de/admin/stalling
          - img [ref=e31]
          - generic [ref=e34]: Lagerung
        - link "Kunden" [ref=e35] [cursor=pointer]:
          - /url: /de/admin/klanten
          - img [ref=e36]
          - generic [ref=e41]: Kunden
        - link "Boote" [ref=e42] [cursor=pointer]:
          - /url: /de/admin/boten
          - img [ref=e43]
          - generic [ref=e47]: Boote
        - link "Maklergeschäft" [ref=e48] [cursor=pointer]:
          - /url: /de/admin/makelaardij
          - img [ref=e49]
          - generic [ref=e52]: Maklergeschäft
        - link "Finanzen" [ref=e53] [cursor=pointer]:
          - /url: /de/admin/financieel
          - img [ref=e54]
          - generic [ref=e57]: Finanzen
        - link "Services & Preise" [ref=e58] [cursor=pointer]:
          - /url: /de/admin/diensten-prijzen
          - img [ref=e59]
          - generic [ref=e63]: Services & Preise
        - link "Verwaltung" [ref=e64] [cursor=pointer]:
          - /url: /de/admin/beheer
          - img [ref=e65]
          - generic [ref=e68]: Verwaltung
        - link "Systemverwaltung" [ref=e69] [cursor=pointer]:
          - /url: /de/admin/systeem
          - img [ref=e71]
          - generic [ref=e73]: Systemverwaltung
        - link "Hilfe & Support" [ref=e75] [cursor=pointer]:
          - /url: /de/faq
          - img [ref=e76]
          - generic [ref=e79]: Hilfe & Support
      - generic [ref=e81]:
        - generic [ref=e82]: AR
        - generic [ref=e83]:
          - generic [ref=e84]: Audit Reviewer
          - generic [ref=e85]: review@example.test
        - button "Abmelden" [ref=e86] [cursor=pointer]:
          - img [ref=e87]
    - generic [ref=e90]:
      - generic [ref=e92]:
        - button "Suchen… ⌘K" [ref=e93] [cursor=pointer]:
          - img [ref=e94]
          - generic [ref=e97]: Suchen…
          - generic [ref=e98]: ⌘K
        - generic [ref=e99]:
          - button "Neu" [ref=e101] [cursor=pointer]:
            - img [ref=e102]
            - generic [ref=e103]: Neu
          - link "Website ansehen" [ref=e104] [cursor=pointer]:
            - /url: /de
            - generic [ref=e105]:
              - img [ref=e106]
              - generic [ref=e109]: Website ansehen
          - button "de" [ref=e111] [cursor=pointer]:
            - img [ref=e112]
            - generic [ref=e116]: de
            - img [ref=e117]
          - link "Online" [ref=e119] [cursor=pointer]:
            - /url: /de/admin/sync
            - generic [ref=e120]:
              - img [ref=e122]
              - text: Online
          - button "Benachrichtigungen" [ref=e126] [cursor=pointer]:
            - img [ref=e127]
          - button "AR" [ref=e131] [cursor=pointer]:
            - generic [ref=e132]: AR
            - img [ref=e133]
      - main [ref=e135]:
        - generic [ref=e136]:
          - generic [ref=e139]:
            - generic [ref=e141]:
              - heading "Audit" [level=1] [ref=e142]
              - paragraph [ref=e143]: Kontrollprotokoll für Sicherheit, Zahlungen, Rechnungen, Kunden und Sync
            - generic [ref=e145]:
              - generic [ref=e148]:
                - generic [ref=e149]:
                  - generic [ref=e151]: 0 Ereignisse
                  - generic [ref=e152]: "0"
                - img [ref=e154]
              - generic [ref=e159]:
                - generic [ref=e161]: Ereignistypen
                - generic [ref=e162]: "0"
              - generic [ref=e166]:
                - generic [ref=e168]: Entitätstypen
                - generic [ref=e169]: "0"
              - generic [ref=e173]:
                - generic [ref=e175]: Letzte Aktivitäten
                - generic [ref=e176]: "0"
          - generic [ref=e177]:
            - generic [ref=e178]:
              - generic [ref=e180]:
                - img [ref=e182]
                - generic [ref=e184]:
                  - heading "Aktivität / Kundenreise" [level=3] [ref=e185]
                  - paragraph [ref=e186]: Öffentliche Kundenreisen, API-Ergebnisse und bestätigte Termine.
              - generic [ref=e187]:
                - generic [ref=e188]:
                  - generic [ref=e189]:
                    - text: Name, Seite oder Anfrage
                    - textbox "Name, Seite oder Anfrage" [ref=e190]
                  - generic [ref=e191]:
                    - text: Absicht
                    - combobox "Absicht" [ref=e192]:
                      - option "Alle Absichten"
                      - option "Krantermin" [selected]
                      - option "Boot verkaufen"
                      - option "Winterlager"
                      - option "Boot kaufen"
                  - generic [ref=e193]:
                    - text: API-Endpunkt
                    - textbox "API-Endpunkt" [ref=e194]
                  - generic [ref=e195]:
                    - text: Minimaler HTTP-Status
                    - spinbutton "Minimaler HTTP-Status" [ref=e196]
                  - generic [ref=e197]:
                    - text: Seite
                    - textbox "Seite" [ref=e198]
                  - generic [ref=e199]:
                    - text: Ereignistyp
                    - combobox "Ereignistyp" [ref=e200]:
                      - option "Alle" [selected]
                      - option "Seite geöffnet"
                      - option "Buchungsformular gestartet"
                      - option "Buchung eingereicht"
                      - option "Buchung fehlgeschlagen"
                      - option "Buchung durch Validierung blockiert"
                      - option "Fehler dem Kunden angezeigt"
                      - option "Foto-Upload fehlgeschlagen"
                      - option "API-Anfrage fehlgeschlagen"
                      - option "Termin erstellt"
                  - generic [ref=e201]:
                    - text: Von
                    - textbox "Von" [ref=e202]
                  - generic [ref=e203]:
                    - text: Bis
                    - textbox "Bis" [ref=e204]
                  - generic [ref=e205]:
                    - checkbox "Nur Fehler" [ref=e206]
                    - text: Nur Fehler
                  - generic [ref=e207]:
                    - checkbox "Abgebrochene Formulare" [ref=e208]
                    - text: Abgebrochene Formulare
                - alert [ref=e209]:
                  - text: "Audit service unavailable (ref: req_c83e8d6a160d49fda7fe)"
                  - button "Erneut versuchen" [ref=e210] [cursor=pointer]:
                    - generic [ref=e211]: Erneut versuchen
            - generic [ref=e212]:
              - generic [ref=e214]:
                - img [ref=e216]
                - generic [ref=e218]:
                  - heading "Audit" [level=3] [ref=e219]
                  - paragraph [ref=e220]: Kontrollprotokoll für Sicherheit, Zahlungen, Rechnungen, Kunden und Sync
              - generic [ref=e221]:
                - generic [ref=e223]:
                  - generic [ref=e224]:
                    - img
                    - searchbox "Nach Aktion, Akteur, Entität suchen" [ref=e225]
                  - button "Alle Bereiche" [ref=e227] [cursor=pointer]:
                    - generic [ref=e228]: Alle Bereiche
                    - img [ref=e229]
                  - button "Alle Entitätstypen" [ref=e232] [cursor=pointer]:
                    - generic [ref=e233]: Alle Entitätstypen
                    - img [ref=e234]
                  - button "Alle Ergebnisse" [ref=e237] [cursor=pointer]:
                    - generic [ref=e238]: Alle Ergebnisse
                    - img [ref=e239]
                  - generic [ref=e241]:
                    - generic [ref=e242]: Von
                    - textbox "Von" [ref=e243]
                  - generic [ref=e244]:
                    - generic [ref=e245]: Bis
                    - textbox "Bis" [ref=e246]
                  - generic [ref=e247]:
                    - checkbox "Technische Ereignisse anzeigen" [ref=e248]
                    - text: Technische Ereignisse anzeigen
                - generic [ref=e252]:
                  - img [ref=e253]
                  - generic [ref=e255]: Etwas ist schiefgelaufen
                  - generic [ref=e256]: "Audit service unavailable (ref: req_82620c342ca14cfebf9e)"
                  - button "Erneut versuchen" [ref=e257] [cursor=pointer]:
                    - generic [ref=e258]: Erneut versuchen
  - alert [ref=e259]
```

# Test source

```ts
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
  441 |     await expect(page.getByText(text(locale,'adminNew.audit.loading'), {exact:true})).toBeVisible();
  442 |     release();
  443 |     await expect(page.getByText(text(locale,'adminNew.audit.empty'), {exact:true})).toBeVisible();
  444 |     phase = 'error'; await page.reload();
  445 |     await expect(page.locator('main')).toContainText('Audit service unavailable');
  446 |     phase = 'populated';
> 447 |     await page.locator('main').getByRole('button',{name:text(locale,'adminNew.states.retry'),exact:true}).click();
      |                                                                                                           ^ Error: locator.click: Error: strict mode violation: locator('main').getByRole('button', { name: 'Erneut versuchen', exact: true }) resolved to 2 elements:
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