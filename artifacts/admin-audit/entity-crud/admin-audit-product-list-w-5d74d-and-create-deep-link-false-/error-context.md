# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: admin-audit.spec.ts >> product list write controls and create deep link (false)
- Location: tests\browser\admin-audit.spec.ts:466:7

# Error details

```
Test timeout of 90000ms exceeded.
```

```
Error: page.goto: net::ERR_ABORTED; maybe frame was detached?
Call log:
  - navigating to "http://localhost:3030/nl/admin/producten", waiting until "load"

```

# Test source

```ts
  387 |   let rejected = true;
  388 |   let posts = 0;
  389 |   let patches = 0;
  390 |   let record: Record<string, unknown> | null = null;
  391 |   await page.route('**/api/v1/auth/me', route => route.fulfill({
  392 |     json: {
  393 |       id: 'supplier-writer', name: 'Supplier Writer', email: 'supplier-writer@example.test', role: 'staff',
  394 |       permissions: ['products.view', 'products.write'],
  395 |     },
  396 |   }));
  397 |   await page.route('**/api/v1/suppliers**', async route => {
  398 |     const method = route.request().method();
  399 |     const path = new URL(route.request().url()).pathname;
  400 |     if (method === 'POST') {
  401 |       posts++;
  402 |       const payload = route.request().postDataJSON();
  403 |       expect(payload).toMatchObject({ name: 'Audit Created Supplier', default_purchase_ledger: '4000' });
  404 |       expect(payload).not.toHaveProperty('default_ledger_account');
  405 |       if (rejected) return route.fulfill({ status: 422, json: { message: 'Audit validation failure', errors: { name: ['Audit supplier name taken'] } } });
  406 |       record = { ...payload, id: 'created-supplier', email: payload.email ?? null, phone: payload.phone ?? null, vat_number: payload.vat_number ?? null, payment_terms_days: payload.payment_terms_days ?? null };
  407 |       return route.fulfill({ status: 201, json: record });
  408 |     }
  409 |     if (method === 'PATCH' && path.includes('/suppliers/')) {
  410 |       patches++;
  411 |       const payload = route.request().postDataJSON();
  412 |       expect(payload.name).toBe('Audit Updated Supplier');
  413 |       expect(payload).toMatchObject({ default_purchase_ledger: '4000' });
  414 |       record = { ...(record ?? {}), ...payload, id: 'created-supplier' };
  415 |       return route.fulfill({ status: 200, json: record });
  416 |     }
  417 |     if (method === 'GET' && /\/suppliers\/?$/.test(path)) {
  418 |       if (first) { first = false; await held; }
  419 |       return route.fulfill({
  420 |         json: {
  421 |           data: record ? [record] : [],
  422 |           meta: { total: record ? 1 : 0, current_page: 1, last_page: 1, per_page: 50 },
  423 |         },
  424 |       });
  425 |     }
  426 |     return route.fulfill({ json: record ?? {} });
  427 |   });
  428 |   await page.goto('/nl/admin/leveranciers');
  429 |   await expect(page.locator('main .animate-pulse').first()).toBeVisible();
  430 |   release();
  431 |   await expect(page.getByText(label('nl', 'adminNew.suppliers.emptyTitle'), { exact: true })).toBeVisible();
  432 |   await page.getByRole('button', { name: label('nl', 'adminNew.suppliers.new'), exact: true }).click();
  433 |   const dialog = page.getByRole('dialog');
  434 |   await expect(dialog).toBeVisible();
  435 |   const name = dialog.getByLabel(label('nl', 'adminNew.suppliers.columns.name'), { exact: false }).first();
  436 |   await dialog.getByRole('button', { name: label('nl', 'adminNew.common.save'), exact: true }).click();
  437 |   expect(posts).toBe(0);
  438 |   expect(await name.evaluate((input: HTMLInputElement) => input.validity.valueMissing)).toBe(true);
  439 |   await name.fill('Audit Created Supplier');
  440 |   await dialog.getByLabel(label('nl', 'adminNew.suppliers.fields.ledgerAccount'), { exact: false }).first().fill('4000');
  441 |   await dialog.getByRole('button', { name: label('nl', 'adminNew.common.save'), exact: true }).click();
  442 |   await expect(page.getByText(/Audit supplier name taken/).first()).toBeVisible();
  443 |   await expect(name).toHaveValue('Audit Created Supplier');
  444 |   for (const width of [390, 1280]) {
  445 |     await page.setViewportSize({ width, height: 1000 });
  446 |     await expect.poll(() => dialog.evaluate(element => element.getBoundingClientRect().width)).toBeLessThanOrEqual(width);
  447 |     await page.screenshot({ path: info.outputPath(`supplier-validation-${width}.png`), fullPage: true });
  448 |   }
  449 |   rejected = false;
  450 |   await dialog.getByRole('button', { name: label('nl', 'adminNew.common.save'), exact: true }).click();
  451 |   await expect(dialog).toHaveCount(0);
  452 |   await expect(page.locator('tbody')).toContainText('Audit Created Supplier');
  453 |   expect(posts).toBe(2);
  454 |   await page.locator('main').getByRole('button', { name: label('nl', 'adminNew.common.edit'), exact: true }).click();
  455 |   const edit = page.getByRole('dialog');
  456 |   await expect(edit).toBeVisible();
  457 |   await expect(edit.getByLabel(label('nl', 'adminNew.suppliers.fields.ledgerAccount'), { exact: false }).first()).toHaveValue('4000');
  458 |   await edit.getByLabel(label('nl', 'adminNew.suppliers.columns.name'), { exact: false }).first().fill('Audit Updated Supplier');
  459 |   await edit.getByRole('button', { name: label('nl', 'adminNew.common.save'), exact: true }).click();
  460 |   await expect(edit).toHaveCount(0);
  461 |   await expect(page.locator('tbody')).toContainText('Audit Updated Supplier');
  462 |   expect(patches).toBe(1);
  463 | });
  464 | 
  465 | for (const write of [false, true]) {
  466 |   test(`product list write controls and create deep link (${write})`, async ({ page }) => {
  467 |     await session(page, 'staff', false);
  468 |     let mutations = 0;
  469 |     await page.route('**/api/v1/auth/me', route => route.fulfill({
  470 |       json: {
  471 |         id: 'product-reader', name: 'Product Reader', email: 'product-reader@example.test', role: 'staff',
  472 |         permissions: write ? ['products.view', 'products.write'] : ['products.view'],
  473 |       },
  474 |     }));
  475 |     await page.route('**/api/v1/product-groups**', route => route.fulfill({
  476 |       json: { data: [], meta: { total: 0, current_page: 1, last_page: 1, per_page: 100 } },
  477 |     }));
  478 |     await page.route('**/api/v1/products**', route => {
  479 |       if (route.request().method() !== 'GET') { mutations++; return route.fulfill({ status: 403, json: { message: 'Forbidden' } }); }
  480 |       return route.fulfill({
  481 |         json: {
  482 |           data: [{ id: 'product-1', code: 'AUDIT-1', name: 'Audit Product', vat_rate: 21, price_excl_vat: 1000, price_incl_vat: 1210, active: true }],
  483 |           meta: { total: 1, current_page: 1, last_page: 1, per_page: 20 },
  484 |         },
  485 |       });
  486 |     });
> 487 |     await page.goto('/nl/admin/producten');
      |                ^ Error: page.goto: net::ERR_ABORTED; maybe frame was detached?
  488 |     await expect(page.locator('tbody')).toContainText('Audit Product');
  489 |     const create = page.getByRole('button', { name: label('nl', 'adminNew.products.new'), exact: true });
  490 |     const remove = page.locator('main').getByRole('button', { name: label('nl', 'adminNew.common.delete'), exact: true });
  491 |     await expect(create).toBeVisible();
  492 |     await expect(remove).toBeVisible();
  493 |     if (write) {
  494 |       await expect(create).toBeEnabled();
  495 |       await expect(remove).toBeEnabled();
  496 |     } else {
  497 |       await expect(create).toBeDisabled();
  498 |       await expect(remove).toBeDisabled();
  499 |     }
  500 |     await page.goto('/nl/admin/producten/nieuw');
  501 |     if (write) {
  502 |       await expect(page.locator('form')).toBeVisible();
  503 |       await expect(page).toHaveURL(/\/admin\/producten\/nieuw/);
  504 |     } else {
  505 |       // RequireAuth redirects create deep-links without products.write to the dashboard.
  506 |       await expect(page).toHaveURL(/\/nl\/admin\/?$/);
  507 |       await expect(page.locator('form')).toHaveCount(0);
  508 |       await expect(page.locator('main h1')).toBeVisible();
  509 |     }
  510 |     expect(mutations).toBe(0);
  511 |   });
  512 | }
  513 | 
  514 | test('product empty validation create and delete retain data then mutate', async ({ page }, info) => {
  515 |   await session(page, 'staff', false);
  516 |   let rejected = true;
  517 |   let posts = 0;
  518 |   let deletes = 0;
  519 |   let record: Record<string, unknown> | null = null;
  520 |   await page.route('**/api/v1/auth/me', route => route.fulfill({
  521 |     json: {
  522 |       id: 'product-writer', name: 'Product Writer', email: 'product-writer@example.test', role: 'staff',
  523 |       permissions: ['products.view', 'products.write'],
  524 |     },
  525 |   }));
  526 |   await page.route('**/api/v1/product-groups**', route => route.fulfill({
  527 |     json: { data: [], meta: { total: 0, current_page: 1, last_page: 1, per_page: 100 } },
  528 |   }));
  529 |   await page.route('**/api/v1/products**', async route => {
  530 |     const method = route.request().method();
  531 |     const path = new URL(route.request().url()).pathname;
  532 |     if (method === 'POST' && (path.endsWith('/products') || path.endsWith('/products/'))) {
  533 |       posts++;
  534 |       const payload = route.request().postDataJSON();
  535 |       expect(payload).toMatchObject({ code: 'AUDIT-CREATE', name: 'Audit Created Product', price_excl_vat: 10050 });
  536 |       if (rejected) return route.fulfill({ status: 422, json: { message: 'Audit validation failure', errors: { code: ['Audit product code taken'] } } });
  537 |       record = {
  538 |         ...payload, id: 'created-product', public_id: 'prd_audit', slug: 'audit-created-product',
  539 |         price_incl_vat: payload.price_incl_vat ?? 12161, active: true,
  540 |       };
  541 |       return route.fulfill({ status: 201, json: record });
  542 |     }
  543 |     if (method === 'DELETE') {
  544 |       deletes++;
  545 |       record = null;
  546 |       return route.fulfill({ status: 200, json: { message: 'deleted' } });
  547 |     }
  548 |     if (method === 'GET' && (path.endsWith('/products') || path.endsWith('/products/'))) {
  549 |       return route.fulfill({
  550 |         json: {
  551 |           data: record ? [record] : [],
  552 |           meta: { total: record ? 1 : 0, current_page: 1, last_page: 1, per_page: 20 },
  553 |         },
  554 |       });
  555 |     }
  556 |     if (method === 'GET' && record && path.includes(`/products/${record.id}`)) {
  557 |       return route.fulfill({ json: record });
  558 |     }
  559 |     return route.fulfill({ json: { data: [], meta: { total: 0, current_page: 1, last_page: 1, per_page: 20 } } });
  560 |   });
  561 |   await page.goto('/nl/admin/producten', { waitUntil: 'domcontentloaded' });
  562 |   await expect(page.getByText(label('nl', 'adminNew.products.emptyTitle'), { exact: true })).toBeVisible();
  563 |   await page.goto('/nl/admin/producten/nieuw', { waitUntil: 'domcontentloaded' });
  564 |   const form = page.locator('form');
  565 |   await expect(form).toBeVisible();
  566 |   await form.getByRole('button', { name: label('nl', 'adminNew.common.save'), exact: true }).click();
  567 |   expect(posts).toBe(0);
  568 |   const name = form.getByLabel(label('nl', 'adminNew.products.columns.name'), { exact: false }).first();
  569 |   expect(await name.evaluate((input: HTMLInputElement) => input.validity.valueMissing)).toBe(true);
  570 |   await form.getByLabel(label('nl', 'adminNew.products.columns.code'), { exact: false }).first().fill('AUDIT-CREATE');
  571 |   await name.fill('Audit Created Product');
  572 |   await form.getByLabel(label('nl', 'adminNew.products.fields.priceExcl'), { exact: false }).first().fill('100.50');
  573 |   await form.getByRole('button', { name: label('nl', 'adminNew.common.save'), exact: true }).click();
  574 |   await expect(page.getByText(/Audit product code taken/).first()).toBeVisible();
  575 |   await expect(name).toHaveValue('Audit Created Product');
  576 |   for (const width of [390, 1280]) {
  577 |     await page.setViewportSize({ width, height: 1000 });
  578 |     await expect.poll(() => page.locator('main').evaluate(element => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1);
  579 |     await page.screenshot({ path: info.outputPath(`product-validation-${width}.png`), fullPage: true });
  580 |   }
  581 |   rejected = false;
  582 |   const created = page.waitForResponse(response => {
  583 |     const path = new URL(response.url()).pathname;
  584 |     return response.request().method() === 'POST' && (path.endsWith('/products') || path.endsWith('/products/')) && response.status() === 201;
  585 |   });
  586 |   await form.getByRole('button', { name: label('nl', 'adminNew.common.save'), exact: true }).click();
  587 |   await created;
```