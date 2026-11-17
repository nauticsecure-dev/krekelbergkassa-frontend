# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: admin-audit.spec.ts >> de: supplier list loading, repeated failure, empty state and required field
- Location: tests\browser\admin-audit.spec.ts:388:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('main').getByText('Audit injected service failure', { exact: true })
Expected: visible
Timeout: 45000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 45000ms
  - waiting for locator('main').getByText('Audit injected service failure', { exact: true })

```

```yaml
- complementary:
  - img "Krekelberg Nautic logo"
  - text: KREKELBERG Nautic · Yachtmakler
  - button "Seitenleiste einklappen" [expanded]:
    - img
  - navigation:
    - link "Übersicht":
      - /url: /de/admin
      - img
      - text: Übersicht
    - link "Planung":
      - /url: /de/admin/planning
      - img
      - text: Planung
    - link "Kasse":
      - /url: /de/admin/kassa
      - img
      - text: Kasse
    - link "Lagerung":
      - /url: /de/admin/stalling
      - img
      - text: Lagerung
    - link "Kunden":
      - /url: /de/admin/klanten
      - img
      - text: Kunden
    - link "Boote":
      - /url: /de/admin/boten
      - img
      - text: Boote
    - link "Maklergeschäft":
      - /url: /de/admin/makelaardij
      - img
      - text: Maklergeschäft
    - link "Finanzen":
      - /url: /de/admin/financieel
      - img
      - text: Finanzen
    - link "Services & Preise":
      - /url: /de/admin/diensten-prijzen
      - img
      - text: Services & Preise
    - link "Verwaltung":
      - /url: /de/admin/beheer
      - img
      - text: Verwaltung
    - link "Systemverwaltung":
      - /url: /de/admin/systeem
      - img
      - text: Systemverwaltung
    - link "Hilfe & Support":
      - /url: /de/faq
      - img
      - text: Hilfe & Support
  - text: R Reviewer audit@example.test
  - button "Abmelden":
    - img
- button "Suchen… ⌘K":
  - img
  - text: Suchen… ⌘K
- button "Neu":
  - img
  - text: Neu
- link "Website ansehen":
  - /url: /de
  - img
  - text: Website ansehen
- button "de":
  - text: de
  - img
- link "Online":
  - /url: /de/admin/sync
  - img
  - text: Online
- button "Benachrichtigungen":
  - img
- button "R":
  - text: R
  - img
- main:
  - heading "Lieferanten" [level=1]
  - paragraph: Lieferanten, Produktzuordnungen und Konten-Standardwerte verwalten.
  - link "Buchhaltung":
    - /url: /de/admin/boekhouding
    - button "Buchhaltung":
      - img
      - text: Buchhaltung
  - button "Neuer Lieferant":
    - img
    - text: Neuer Lieferant
  - img
  - heading "Lieferanten" [level=3]
  - img
  - searchbox "Nach Name, E-Mail oder USt-IdNr. suchen…"
  - img
  - text: "Etwas ist schiefgelaufen Audit injected service failure (ref: req_908fec5e897d483cb88a)"
  - button "Erneut versuchen"
- alert
```

# Test source

```ts
  316 |       return route.fulfill({ status: 200, json: boat });
  317 |     }
  318 |     return route.fulfill({ json: boat });
  319 |   });
  320 |   await page.goto('/nl/admin/boten/boat-1');
  321 |   await expect(page.locator('main h1')).toContainText('Audit Detail Boat');
  322 |   await page.getByRole('button', { name: label('nl', 'adminNew.common.edit'), exact: true }).click();
  323 |   const dialog = page.getByRole('dialog');
  324 |   await expect(dialog).toBeVisible();
  325 |   const name = dialog.getByLabel(label('nl', 'adminNew.common.name'), { exact: false }).first();
  326 |   await name.fill('Audit Updated Boat');
  327 |   await dialog.getByRole('button', { name: label('nl', 'adminNew.common.save'), exact: true }).click();
  328 |   await expect(dialog).toHaveCount(0);
  329 |   await expect(page.locator('main h1')).toContainText('Audit Updated Boat');
  330 |   expect(patches).toBe(1);
  331 | 
  332 |   await page.route('**/api/v1/auth/me', route => route.fulfill({
  333 |     json: {
  334 |       id: 'boat-reader', name: 'Boat Reader', email: 'boat-reader@example.test', role: 'staff',
  335 |       permissions: ['boats.view', 'customers.view'],
  336 |     },
  337 |   }));
  338 |   await page.reload();
  339 |   await expect(page.locator('main h1')).toContainText('Audit Updated Boat');
  340 |   await expect(page.getByRole('button', { name: label('nl', 'adminNew.common.edit'), exact: true })).toHaveCount(0);
  341 |   await expect(page.getByRole('button', { name: label('nl', 'adminNew.boats.transfer'), exact: true })).toHaveCount(0);
  342 | });
  343 | 
  344 | for (const write of [false, true]) {
  345 |   test(`supplier list write controls and create deep link (${write})`, async ({ page }) => {
  346 |     await session(page, 'staff', false);
  347 |     let mutations = 0;
  348 |     await page.route('**/api/v1/auth/me', route => route.fulfill({
  349 |       json: {
  350 |         id: 'supplier-reader', name: 'Supplier Reader', email: 'supplier-reader@example.test', role: 'staff',
  351 |         permissions: write ? ['products.view', 'products.write'] : ['products.view'],
  352 |       },
  353 |     }));
  354 |     await page.route('**/api/v1/suppliers**', route => {
  355 |       if (route.request().method() !== 'GET') { mutations++; return route.fulfill({ status: 403, json: { message: 'Forbidden' } }); }
  356 |       return route.fulfill({
  357 |         json: {
  358 |           data: [{ id: 'supplier-1', name: 'Audit Supplier', email: 'supplier@example.test', vat_number: 'NL123', payment_terms_days: 30 }],
  359 |           meta: { total: 1, current_page: 1, last_page: 1, per_page: 50 },
  360 |         },
  361 |       });
  362 |     });
  363 |     await page.goto('/nl/admin/leveranciers?new=1');
  364 |     await expect(page.locator('tbody')).toContainText('Audit Supplier');
  365 |     const create = page.getByRole('button', { name: label('nl', 'adminNew.suppliers.new'), exact: true });
  366 |     const edit = page.locator('main').getByRole('button', { name: label('nl', 'adminNew.common.edit'), exact: true });
  367 |     await expect(create).toBeVisible();
  368 |     await expect(edit).toBeVisible();
  369 |     if (write) {
  370 |       await expect(create).toBeEnabled();
  371 |       await expect(edit).toBeEnabled();
  372 |       await expect(page.getByRole('dialog')).toBeVisible();
  373 |     } else {
  374 |       await expect(create).toBeDisabled();
  375 |       await expect(edit).toBeDisabled();
  376 |       await expect(page.getByRole('dialog')).toHaveCount(0);
  377 |     }
  378 |     expect(mutations).toBe(0);
  379 |   });
  380 | }
  381 | 
  382 | for (const [locale, title, loading, error, retryText, empty, create] of [
  383 |   ['nl', 'Leveranciers', 'Laden…', 'Er ging iets mis', 'Opnieuw proberen', 'Nog geen leveranciers', 'Nieuwe leverancier'],
  384 |   ['en', 'Suppliers', 'Loading…', 'Something went wrong', 'Try again', 'No suppliers yet', 'New supplier'],
  385 |   ['de', 'Lieferanten', 'Laden…', 'Etwas ist schiefgelaufen', 'Erneut versuchen', 'Noch keine Lieferanten', 'Neuer Lieferant'],
  386 |   ['fr', 'Fournisseurs', 'Chargement…', 'Une erreur est survenue', 'Réessayer', 'Aucun fournisseur', 'Nouveau fournisseur'],
  387 | ]) {
  388 |   test(`${locale}: supplier list loading, repeated failure, empty state and required field`, async ({ page }) => {
  389 |     await session(page, 'super_admin', false);
  390 |     const errors: string[] = [];
  391 |     page.on('pageerror', exception => errors.push(exception.message));
  392 |     let fail = true;
  393 |     let release!: () => void;
  394 |     const held = new Promise<void>(resolve => { release = resolve; });
  395 |     await page.route(/\/api\/v1\/suppliers(?:\?|$)/, async route => {
  396 |       await held;
  397 |       return fail
  398 |         ? route.fulfill({ status: 503, json: { message: failure } })
  399 |         : route.fulfill({ json: { data: [], current_page: 1, last_page: 1, total: 0 } });
  400 |     });
  401 |     await page.goto(`/${locale}/admin/leveranciers`, { waitUntil: 'domcontentloaded' });
  402 |     const main = page.locator('main');
  403 |     try {
  404 |       await expect(main.getByRole('heading', { level: 1, name: title })).toBeVisible();
  405 |       await expect(main.getByText(loading, { exact: true })).toBeVisible();
  406 |     } finally {
  407 |       release();
  408 |     }
  409 |     const retry = main.getByRole('button', { name: retryText, exact: true });
  410 |     await expect(main.getByText(error, { exact: true })).toBeVisible();
  411 |     const rejectedRetry = page.waitForResponse(response =>
  412 |       new URL(response.url()).pathname === '/api/v1/suppliers' && response.status() === 503);
  413 |     await retry.click();
  414 |     await rejectedRetry;
  415 |     await expect(main.getByText(error, { exact: true })).toBeVisible();
> 416 |     await expect(main.getByText(failure, { exact: true })).toBeVisible();
      |                                                            ^ Error: expect(locator).toBeVisible() failed
  417 |     fail = false;
  418 |     await retry.click();
  419 |     await expect(main.getByText(empty, { exact: true })).toBeVisible();
  420 |     await main.getByRole('button', { name: create, exact: true }).click();
  421 |     const dialog = page.getByRole('dialog');
  422 |     await expect(dialog.getByRole('heading', { name: create, exact: true })).toBeVisible();
  423 |     await dialog.getByRole('button', { name: label(locale, 'adminNew.common.save'), exact: true }).click();
  424 |     const name = dialog.getByRole('textbox', { name: label(locale, 'adminNew.suppliers.columns.name'), exact: true });
  425 |     expect(await name.evaluate((input: HTMLInputElement) => input.validity.valueMissing)).toBe(true);
  426 |     await expect(dialog).toBeVisible();
  427 |     expect(errors).toEqual([]);
  428 |   });
  429 | }
  430 | 
  431 | test('supplier mapping loading and retry recover from a failed request', async ({ page }) => {
  432 |   await session(page, 'super_admin', false);
  433 |   const errors: string[] = [];
  434 |   page.on('pageerror', error => errors.push(error.message));
  435 |   await page.route('**/api/v1/suppliers/supplier-1', route => route.fulfill({ json: { id: 'supplier-1', name: 'Audit Supplier' } }));
  436 |   let fail = true;
  437 |   let release!: () => void;
  438 |   const held = new Promise<void>(resolve => { release = resolve; });
  439 |   await page.route('**/api/v1/suppliers/supplier-1/mappings', async route => {
  440 |     await held;
  441 |     if (fail) return route.fulfill({ status: 503, json: { message: failure } });
  442 |     return route.fulfill({ json: [] });
  443 |   });
  444 |   await page.goto('/fr/admin/leveranciers/supplier-1');
  445 |   const main = page.locator('main');
  446 |   await expect(main.getByRole('heading', { name: 'Audit Supplier', exact: true })).toBeVisible();
  447 |   await expect(main.getByText(label('fr', 'adminNew.common.loading'), { exact: true })).toBeVisible();
  448 |   release();
  449 |   const retry = main.getByRole('button', { name: 'Réessayer', exact: true });
  450 |   await expect(main.getByText('Une erreur est survenue', { exact: true })).toBeVisible();
  451 |   const failedRetry = page.waitForResponse(response =>
  452 |     response.url().endsWith('/suppliers/supplier-1/mappings') && response.status() === 503);
  453 |   await retry.click();
  454 |   await failedRetry;
  455 |   await expect(main.getByText(failure)).toBeVisible();
  456 |   fail = false;
  457 |   await retry.click();
  458 |   await expect(main.getByText('Aucune correspondance', { exact: true })).toBeVisible();
  459 |   expect(errors).toEqual([]);
  460 | });
  461 | 
  462 | test('supplier loading empty validation create and update retain data then mutate', async ({ page }, info) => {
  463 |   await session(page, 'staff', false);
  464 |   let release!: () => void;
  465 |   const held = new Promise<void>(resolve => { release = resolve; });
  466 |   let first = true;
  467 |   let rejected = true;
  468 |   let posts = 0;
  469 |   let patches = 0;
  470 |   let record: Record<string, unknown> | null = null;
  471 |   await page.route('**/api/v1/auth/me', route => route.fulfill({
  472 |     json: {
  473 |       id: 'supplier-writer', name: 'Supplier Writer', email: 'supplier-writer@example.test', role: 'staff',
  474 |       permissions: ['products.view', 'products.write'],
  475 |     },
  476 |   }));
  477 |   await page.route('**/api/v1/suppliers**', async route => {
  478 |     const method = route.request().method();
  479 |     const path = new URL(route.request().url()).pathname;
  480 |     if (method === 'POST') {
  481 |       posts++;
  482 |       const payload = route.request().postDataJSON();
  483 |       expect(payload).toMatchObject({ name: 'Audit Created Supplier', default_purchase_ledger: '4000' });
  484 |       expect(payload).not.toHaveProperty('default_ledger_account');
  485 |       if (rejected) return route.fulfill({ status: 422, json: { message: 'Audit validation failure', errors: { name: ['Audit supplier name taken'] } } });
  486 |       record = { ...payload, id: 'created-supplier', email: payload.email ?? null, phone: payload.phone ?? null, vat_number: payload.vat_number ?? null, payment_terms_days: payload.payment_terms_days ?? null };
  487 |       return route.fulfill({ status: 201, json: record });
  488 |     }
  489 |     if (method === 'PATCH' && path.includes('/suppliers/')) {
  490 |       patches++;
  491 |       const payload = route.request().postDataJSON();
  492 |       expect(payload.name).toBe('Audit Updated Supplier');
  493 |       expect(payload).toMatchObject({ default_purchase_ledger: '4000' });
  494 |       record = { ...(record ?? {}), ...payload, id: 'created-supplier' };
  495 |       return route.fulfill({ status: 200, json: record });
  496 |     }
  497 |     if (method === 'GET' && /\/suppliers\/?$/.test(path)) {
  498 |       if (first) { first = false; await held; }
  499 |       return route.fulfill({
  500 |         json: {
  501 |           data: record ? [record] : [],
  502 |           meta: { total: record ? 1 : 0, current_page: 1, last_page: 1, per_page: 50 },
  503 |         },
  504 |       });
  505 |     }
  506 |     return route.fulfill({ json: record ?? {} });
  507 |   });
  508 |   await page.goto('/nl/admin/leveranciers');
  509 |   await expect(page.locator('main .animate-pulse').first()).toBeVisible();
  510 |   release();
  511 |   await expect(page.getByText(label('nl', 'adminNew.suppliers.emptyTitle'), { exact: true })).toBeVisible();
  512 |   await page.getByRole('button', { name: label('nl', 'adminNew.suppliers.new'), exact: true }).click();
  513 |   const dialog = page.getByRole('dialog');
  514 |   await expect(dialog).toBeVisible();
  515 |   const name = dialog.getByLabel(label('nl', 'adminNew.suppliers.columns.name'), { exact: false }).first();
  516 |   await dialog.getByRole('button', { name: label('nl', 'adminNew.common.save'), exact: true }).click();
```