# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: admin-audit.spec.ts >> supplier mapping loading and retry recover from a failed request
- Location: tests\browser\admin-audit.spec.ts:382:5

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('main').getByText('Chargement…', { exact: true })
Expected: visible
Timeout: 45000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 45000ms
  - waiting for locator('main').getByText('Chargement…', { exact: true })

```

```yaml
- complementary:
  - img "Krekelberg Nautic logo"
  - text: KREKELBERG Nautic · Courtier en yachts
  - button "Réduire le menu latéral" [expanded]:
    - img
  - navigation:
    - link "Vue d’ensemble":
      - /url: /fr/admin
      - img
      - text: Vue d’ensemble
    - link "Planning":
      - /url: /fr/admin/planning
      - img
      - text: Planning
    - link "Caisse":
      - /url: /fr/admin/kassa
      - img
      - text: Caisse
    - link "Hivernage":
      - /url: /fr/admin/stalling
      - img
      - text: Hivernage
    - link "Clients":
      - /url: /fr/admin/klanten
      - img
      - text: Clients
    - link "Bateaux":
      - /url: /fr/admin/boten
      - img
      - text: Bateaux
    - link "Courtage":
      - /url: /fr/admin/makelaardij
      - img
      - text: Courtage
    - link "Finances":
      - /url: /fr/admin/financieel
      - img
      - text: Finances
    - link "Services et tarifs":
      - /url: /fr/admin/diensten-prijzen
      - img
      - text: Services et tarifs
    - link "Gestion":
      - /url: /fr/admin/beheer
      - img
      - text: Gestion
    - link "Administration système":
      - /url: /fr/admin/systeem
      - img
      - text: Administration système
    - link "Aide et assistance":
      - /url: /fr/faq
      - img
      - text: Aide et assistance
  - text: R Reviewer audit@example.test
  - button "Se déconnecter":
    - img
- button "Rechercher… ⌘K":
  - img
  - text: Rechercher… ⌘K
- button "Nouveau":
  - img
  - text: Nouveau
- link "Voir le site":
  - /url: /fr
  - img
  - text: Voir le site
- button "fr":
  - text: fr
  - img
- link "En ligne":
  - /url: /fr/admin/sync
  - img
  - text: En ligne
- button "Notifications":
  - img
- button "R":
  - text: R
  - img
- main:
  - heading "Audit Supplier" [level=1]
  - link "Back":
    - /url: /fr/admin/leveranciers
    - button "Back":
      - img
      - text: Back
  - text: Numéro de TVA —
  - img
  - text: Conditions de paiement — Correspondances de produits 0
  - img
  - img
  - heading "Détails du fournisseur" [level=3]
  - text: E-mail — Téléphone — Numéro de TVA — Délai de paiement (jours) — Compte comptable par défaut —
  - img
  - heading "Correspondances de produits" [level=3]
  - paragraph: Associez les références fournisseur à vos produits pour les identifier automatiquement.
  - button "Ajouter une correspondance":
    - img
    - text: Ajouter une correspondance
  - img
  - text: "Une erreur est survenue Audit injected service failure (ref: req_ea6b3e1b9c42409ebc5e)"
  - button "Réessayer"
- alert
```

# Test source

```ts
  298 |   await page.route('**/api/v1/customers*', route => route.fulfill({
  299 |     json: { data: [{ id: 'customer-1', name: 'Audit Owner' }], meta: { total: 1, current_page: 1, last_page: 1, per_page: 200 } },
  300 |   }));
  301 |   await page.route('**/api/v1/boats/boat-1/dossier', route => route.fulfill({
  302 |     json: {
  303 |       boat, owner: { id: 'customer-1', name: 'Audit Owner' }, stats: {}, storage_contracts: [],
  304 |       work_orders: [], financial: { invoices: [] }, timeline: [], qr: { payload: 'qr-boat-1' },
  305 |     },
  306 |   }));
  307 |   await page.route('**/api/v1/boats/boat-1/audit-log*', route => route.fulfill({
  308 |     json: { data: [], meta: { total: 0, current_page: 1, last_page: 1, per_page: 25 } },
  309 |   }));
  310 |   await page.route('**/api/v1/boats/boat-1', async route => {
  311 |     if (route.request().method() === 'PATCH') {
  312 |       patches++;
  313 |       const payload = route.request().postDataJSON();
  314 |       expect(payload.name).toBe('Audit Updated Boat');
  315 |       boat = { ...boat, ...payload };
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
  382 | test('supplier mapping loading and retry recover from a failed request', async ({ page }) => {
  383 |   await session(page, 'super_admin', false);
  384 |   const errors: string[] = [];
  385 |   page.on('pageerror', error => errors.push(error.message));
  386 |   await page.route('**/api/v1/suppliers/supplier-1', route => route.fulfill({ json: { id: 'supplier-1', name: 'Audit Supplier' } }));
  387 |   let requests = 0;
  388 |   let release!: () => void;
  389 |   const held = new Promise<void>(resolve => { release = resolve; });
  390 |   await page.route('**/api/v1/suppliers/supplier-1/mappings', async route => {
  391 |     if (++requests === 1) await held;
  392 |     if (requests <= 2) return route.fulfill({ status: 503, json: { message: failure } });
  393 |     return route.fulfill({ json: [] });
  394 |   });
  395 |   await page.goto('/fr/admin/leveranciers/supplier-1');
  396 |   const main = page.locator('main');
  397 |   await expect(main.getByRole('heading', { name: 'Audit Supplier', exact: true })).toBeVisible();
> 398 |   await expect(main.getByText(label('fr', 'adminNew.common.loading'), { exact: true })).toBeVisible();
      |                                                                                         ^ Error: expect(locator).toBeVisible() failed
  399 |   release();
  400 |   const retry = main.getByRole('button', { name: 'Réessayer', exact: true });
  401 |   await expect(main.getByText('Une erreur est survenue', { exact: true })).toBeVisible();
  402 |   await retry.click();
  403 |   await expect.poll(() => requests).toBe(2);
  404 |   await expect(main.getByText(failure, { exact: true })).toBeVisible();
  405 |   await retry.click();
  406 |   await expect(main.getByText('Aucune correspondance', { exact: true })).toBeVisible();
  407 |   expect(errors).toEqual([]);
  408 | });
  409 | 
  410 | test('supplier loading empty validation create and update retain data then mutate', async ({ page }, info) => {
  411 |   await session(page, 'staff', false);
  412 |   let release!: () => void;
  413 |   const held = new Promise<void>(resolve => { release = resolve; });
  414 |   let first = true;
  415 |   let rejected = true;
  416 |   let posts = 0;
  417 |   let patches = 0;
  418 |   let record: Record<string, unknown> | null = null;
  419 |   await page.route('**/api/v1/auth/me', route => route.fulfill({
  420 |     json: {
  421 |       id: 'supplier-writer', name: 'Supplier Writer', email: 'supplier-writer@example.test', role: 'staff',
  422 |       permissions: ['products.view', 'products.write'],
  423 |     },
  424 |   }));
  425 |   await page.route('**/api/v1/suppliers**', async route => {
  426 |     const method = route.request().method();
  427 |     const path = new URL(route.request().url()).pathname;
  428 |     if (method === 'POST') {
  429 |       posts++;
  430 |       const payload = route.request().postDataJSON();
  431 |       expect(payload).toMatchObject({ name: 'Audit Created Supplier', default_purchase_ledger: '4000' });
  432 |       expect(payload).not.toHaveProperty('default_ledger_account');
  433 |       if (rejected) return route.fulfill({ status: 422, json: { message: 'Audit validation failure', errors: { name: ['Audit supplier name taken'] } } });
  434 |       record = { ...payload, id: 'created-supplier', email: payload.email ?? null, phone: payload.phone ?? null, vat_number: payload.vat_number ?? null, payment_terms_days: payload.payment_terms_days ?? null };
  435 |       return route.fulfill({ status: 201, json: record });
  436 |     }
  437 |     if (method === 'PATCH' && path.includes('/suppliers/')) {
  438 |       patches++;
  439 |       const payload = route.request().postDataJSON();
  440 |       expect(payload.name).toBe('Audit Updated Supplier');
  441 |       expect(payload).toMatchObject({ default_purchase_ledger: '4000' });
  442 |       record = { ...(record ?? {}), ...payload, id: 'created-supplier' };
  443 |       return route.fulfill({ status: 200, json: record });
  444 |     }
  445 |     if (method === 'GET' && /\/suppliers\/?$/.test(path)) {
  446 |       if (first) { first = false; await held; }
  447 |       return route.fulfill({
  448 |         json: {
  449 |           data: record ? [record] : [],
  450 |           meta: { total: record ? 1 : 0, current_page: 1, last_page: 1, per_page: 50 },
  451 |         },
  452 |       });
  453 |     }
  454 |     return route.fulfill({ json: record ?? {} });
  455 |   });
  456 |   await page.goto('/nl/admin/leveranciers');
  457 |   await expect(page.locator('main .animate-pulse').first()).toBeVisible();
  458 |   release();
  459 |   await expect(page.getByText(label('nl', 'adminNew.suppliers.emptyTitle'), { exact: true })).toBeVisible();
  460 |   await page.getByRole('button', { name: label('nl', 'adminNew.suppliers.new'), exact: true }).click();
  461 |   const dialog = page.getByRole('dialog');
  462 |   await expect(dialog).toBeVisible();
  463 |   const name = dialog.getByLabel(label('nl', 'adminNew.suppliers.columns.name'), { exact: false }).first();
  464 |   await dialog.getByRole('button', { name: label('nl', 'adminNew.common.save'), exact: true }).click();
  465 |   expect(posts).toBe(0);
  466 |   expect(await name.evaluate((input: HTMLInputElement) => input.validity.valueMissing)).toBe(true);
  467 |   await name.fill('Audit Created Supplier');
  468 |   await dialog.getByLabel(label('nl', 'adminNew.suppliers.fields.ledgerAccount'), { exact: false }).first().fill('4000');
  469 |   await dialog.getByRole('button', { name: label('nl', 'adminNew.common.save'), exact: true }).click();
  470 |   await expect(page.getByText(/Audit supplier name taken/).first()).toBeVisible();
  471 |   await expect(name).toHaveValue('Audit Created Supplier');
  472 |   for (const width of [390, 1280]) {
  473 |     await page.setViewportSize({ width, height: 1000 });
  474 |     await expect.poll(() => dialog.evaluate(element => element.getBoundingClientRect().width)).toBeLessThanOrEqual(width);
  475 |     await page.screenshot({ path: info.outputPath(`supplier-validation-${width}.png`), fullPage: true });
  476 |   }
  477 |   rejected = false;
  478 |   await dialog.getByRole('button', { name: label('nl', 'adminNew.common.save'), exact: true }).click();
  479 |   await expect(dialog).toHaveCount(0);
  480 |   await expect(page.locator('tbody')).toContainText('Audit Created Supplier');
  481 |   expect(posts).toBe(2);
  482 |   await page.locator('main').getByRole('button', { name: label('nl', 'adminNew.common.edit'), exact: true }).click();
  483 |   const edit = page.getByRole('dialog');
  484 |   await expect(edit).toBeVisible();
  485 |   await expect(edit.getByLabel(label('nl', 'adminNew.suppliers.fields.ledgerAccount'), { exact: false }).first()).toHaveValue('4000');
  486 |   await edit.getByLabel(label('nl', 'adminNew.suppliers.columns.name'), { exact: false }).first().fill('Audit Updated Supplier');
  487 |   await edit.getByRole('button', { name: label('nl', 'adminNew.common.save'), exact: true }).click();
  488 |   await expect(edit).toHaveCount(0);
  489 |   await expect(page.locator('tbody')).toContainText('Audit Updated Supplier');
  490 |   expect(patches).toBe(1);
  491 | });
  492 | 
  493 | for (const write of [false, true]) {
  494 |   test(`product list write controls and create deep link (${write})`, async ({ page }) => {
  495 |     await session(page, 'staff', false);
  496 |     let mutations = 0;
  497 |     await page.route('**/api/v1/auth/me', route => route.fulfill({
  498 |       json: {
```