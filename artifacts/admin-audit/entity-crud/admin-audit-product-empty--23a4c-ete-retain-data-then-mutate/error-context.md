# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: admin-audit.spec.ts >> product empty validation create and delete retain data then mutate
- Location: tests\browser\admin-audit.spec.ts:514:5

# Error details

```
Test timeout of 90000ms exceeded.
```

```
Error: page.goto: net::ERR_ABORTED; maybe frame was detached?
Call log:
  - navigating to "http://localhost:3030/nl/admin/producten", waiting until "domcontentloaded"

```

# Test source

```ts
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
  487 |     await page.goto('/nl/admin/producten');
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
> 561 |   await page.goto('/nl/admin/producten', { waitUntil: 'domcontentloaded' });
      |              ^ Error: page.goto: net::ERR_ABORTED; maybe frame was detached?
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
  588 |   expect(posts).toBe(2);
  589 |   await page.goto('/nl/admin/producten', { waitUntil: 'domcontentloaded' });
  590 |   await expect(page.locator('tbody')).toContainText('Audit Created Product');
  591 |   await page.locator('main').getByRole('button', { name: label('nl', 'adminNew.common.delete'), exact: true }).click();
  592 |   const confirm = page.getByRole('dialog');
  593 |   await expect(confirm).toContainText(label('nl', 'adminNew.products.confirmDelete'));
  594 |   await confirm.getByRole('button', { name: label('nl', 'adminNew.common.delete'), exact: true }).click();
  595 |   await expect(page.getByText(label('nl', 'adminNew.products.emptyTitle'), { exact: true })).toBeVisible();
  596 |   expect(deletes).toBe(1);
  597 | });
  598 | 
```