# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: admin-audit.spec.ts >> fr: boat loading empty validation create and delete retain data then mutate
- Location: tests\browser\admin-audit.spec.ts:225:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('main .animate-pulse').first()
Expected: visible
Timeout: 45000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 45000ms
  - waiting for locator('main .animate-pulse').first()

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
    - link "Clients":
      - /url: /fr/admin/klanten
      - img
      - text: Clients
    - link "Bateaux":
      - /url: /fr/admin/boten
      - img
      - text: Bateaux
    - link "Aide et assistance":
      - /url: /fr/faq
      - img
      - text: Aide et assistance
  - text: BW Boat Writer boat-writer@example.test
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
- button "BW":
  - text: BW
  - img
- main:
  - heading "Bateaux" [level=1]
  - paragraph: Gérer les bateaux, leurs dimensions et leurs emplacements pour l’hivernage et la facturation
  - text: Nombre total de bateaux 0
  - img
  - text: En hivernage 0
  - img
  - text: Ordres de travail en cours 0
  - img
  - text: Solde à régler 0,00 €
  - img
  - img
  - heading "Bateaux" [level=3]
  - paragraph: Gérer les bateaux, leurs dimensions et leurs emplacements pour l’hivernage et la facturation
  - button "Nouveau bateau":
    - img
    - text: Nouveau bateau
  - img
  - searchbox "Rechercher par nom du bateau, propriétaire ou emplacement"
  - button "Tous les statuts":
    - text: Tous les statuts
    - img
  - img
  - text: Aucun bateau Aucun bateau n’a été trouvé.
- alert
```

# Test source

```ts
  182 |         id: 'boat-reader', name: 'Boat Reader', email: 'boat-reader@example.test', role: 'staff',
  183 |         permissions: write ? ['boats.view', 'boats.write', 'boats.delete', 'customers.view'] : ['boats.view', 'customers.view'],
  184 |       },
  185 |     }));
  186 |     await page.route('**/api/v1/customers*', route => route.fulfill({
  187 |       json: { data: [{ id: 'customer-1', name: 'Audit Owner', email: 'owner@example.test' }], meta: { total: 1, current_page: 1, last_page: 1, per_page: 100 } },
  188 |     }));
  189 |     await page.route('**/api/v1/boats**', route => {
  190 |       const path = new URL(route.request().url()).pathname;
  191 |       if (route.request().method() !== 'GET') { mutations++; return route.fulfill({ status: 403, json: { message: 'Forbidden' } }); }
  192 |       if (path.endsWith('/boats/stats')) {
  193 |         return route.fulfill({ json: { total_boats: 1, boats_in_storage: 0, active_work_orders: 0, open_balance_cents: 0 } });
  194 |       }
  195 |       return route.fulfill({
  196 |         json: {
  197 |           data: [{
  198 |             id: 'boat-1', name: 'Audit Boat', type: 'motor', customer: { id: 'customer-1', name: 'Audit Owner' },
  199 |             length_cm: 900, location_code: 'A-1', current_status: 'registered',
  200 |           }],
  201 |           meta: { total: 1, current_page: 1, last_page: 1, per_page: 20 },
  202 |         },
  203 |       });
  204 |     });
  205 |     await page.goto('/nl/admin/boten?new=1');
  206 |     await expect(page.locator('tbody')).toContainText('Audit Boat');
  207 |     const create = page.locator('main').getByRole('button', { name: label('nl', 'adminNew.boats.new'), exact: true });
  208 |     const remove = page.locator('main').getByRole('button', { name: label('nl', 'adminNew.common.delete'), exact: true });
  209 |     await expect(create).toBeVisible();
  210 |     await expect(remove).toBeVisible();
  211 |     if (write) {
  212 |       await expect(create).toBeEnabled();
  213 |       await expect(remove).toBeEnabled();
  214 |       await expect(page.getByRole('dialog')).toBeVisible();
  215 |     } else {
  216 |       await expect(create).toBeDisabled();
  217 |       await expect(remove).toBeDisabled();
  218 |       await expect(page.getByRole('dialog')).toHaveCount(0);
  219 |     }
  220 |     expect(mutations).toBe(0);
  221 |   });
  222 | }
  223 | 
  224 | for (const locale of locales) {
  225 |   test(locale === 'nl' ? 'boat loading empty validation create and delete retain data then mutate' : locale + ': boat loading empty validation create and delete retain data then mutate', async ({ page }, info) => {
  226 |     await session(page, 'staff', false);
  227 |     let release!: () => void;
  228 |     const held = new Promise<void>(resolve => { release = resolve; });
  229 |     let first = true;
  230 |     let rejected = true;
  231 |     let posts = 0;
  232 |     let deletes = 0;
  233 |     let record: Record<string, unknown> | null = null;
  234 |     await page.route('**/api/v1/auth/me', route => route.fulfill({
  235 |       json: {
  236 |         id: 'boat-writer', name: 'Boat Writer', email: 'boat-writer@example.test', role: 'staff',
  237 |         permissions: ['boats.view', 'boats.write', 'boats.delete', 'customers.view'],
  238 |       },
  239 |     }));
  240 |     await page.route('**/api/v1/customers*', route => route.fulfill({
  241 |       json: {
  242 |         data: [{ id: 'customer-1', name: 'Audit Owner', email: 'owner@example.test' }],
  243 |         meta: { total: 1, current_page: 1, last_page: 1, per_page: 100 },
  244 |       },
  245 |     }));
  246 |     await page.route('**/api/v1/boats**', async route => {
  247 |       const method = route.request().method();
  248 |       const path = new URL(route.request().url()).pathname;
  249 |       if (path.endsWith('/boats/stats')) {
  250 |         return route.fulfill({
  251 |           json: { total_boats: record ? 1 : 0, boats_in_storage: 0, active_work_orders: 0, open_balance_cents: 0 },
  252 |         });
  253 |       }
  254 |       if (method === 'POST') {
  255 |         posts++;
  256 |         const payload = route.request().postDataJSON();
  257 |         expect(payload).toMatchObject({ customer_id: 'customer-1', name: 'Audit Created Boat', type: 'motor' });
  258 |         if (rejected) return route.fulfill({ status: 422, json: { message: 'Audit validation failure', errors: { name: ['Audit boat name taken'] } } });
  259 |         record = {
  260 |           ...payload, id: 'created-boat', customer: { id: 'customer-1', name: 'Audit Owner' },
  261 |           current_status: 'registered', length_cm: payload.length_cm ?? null, location_code: payload.location_code ?? null,
  262 |         };
  263 |         return route.fulfill({ status: 201, json: record });
  264 |       }
  265 |       if (method === 'DELETE') {
  266 |         deletes++;
  267 |         record = null;
  268 |         return route.fulfill({ status: 200, json: { message: 'deleted' } });
  269 |       }
  270 |       if (method === 'GET' && /\/boats\/?$/.test(path)) {
  271 |         if (first) { first = false; await held; }
  272 |         return route.fulfill({
  273 |           json: {
  274 |             data: record ? [record] : [],
  275 |             meta: { total: record ? 1 : 0, current_page: 1, last_page: 1, per_page: 20 },
  276 |           },
  277 |         });
  278 |       }
  279 |       return route.fulfill({ json: { data: [], meta: { total: 0, current_page: 1, last_page: 1, per_page: 20 } } });
  280 |     });
  281 |     await page.goto('/' + locale + '/admin/boten');
> 282 |     await expect(page.locator('main .animate-pulse').first()).toBeVisible();
      |                                                               ^ Error: expect(locator).toBeVisible() failed
  283 |     release();
  284 |     await expect(page.getByText(label(locale, 'adminNew.boats.emptyTitle'), { exact: true })).toBeVisible();
  285 |     await page.locator('main').getByRole('button', { name: label(locale, 'adminNew.boats.new'), exact: true }).click();
  286 |     const dialog = page.getByRole('dialog');
  287 |     await expect(dialog).toBeVisible();
  288 |     await expect(dialog.getByRole('heading', { name: label(locale, 'adminNew.boats.new'), exact: true })).toBeVisible();
  289 |     await dialog.getByRole('button', { name: label(locale, 'adminNew.boats.selectCustomer'), exact: true }).click();
  290 |     await page.getByRole('option', { name: 'Audit Owner', exact: true }).click();
  291 |     const name = dialog.getByLabel(label(locale, 'adminNew.common.name'), { exact: false }).first();
  292 |     await dialog.getByRole('button', { name: label(locale, 'adminNew.common.save'), exact: true }).click();
  293 |     expect(posts).toBe(0);
  294 |     expect(await name.evaluate((input: HTMLInputElement) => input.validity.valueMissing)).toBe(true);
  295 |     await name.fill('Audit Created Boat');
  296 |     await dialog.getByRole('button', { name: label(locale, 'adminNew.common.save'), exact: true }).click();
  297 |     await expect(page.getByText(/Audit boat name taken/).first()).toBeVisible();
  298 |     await expect(name).toHaveValue('Audit Created Boat');
  299 |     for (const width of [390, 1280, 1536]) {
  300 |       await page.setViewportSize({ width, height: 1000 });
  301 |       await expect.poll(() => dialog.evaluate(element => element.getBoundingClientRect().width)).toBeLessThanOrEqual(width);
  302 |       await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  303 |       await page.screenshot({ path: info.outputPath(`boat-validation-${width}.png`), fullPage: true });
  304 |     }
  305 |     rejected = false;
  306 |     await dialog.getByRole('button', { name: label(locale, 'adminNew.common.save'), exact: true }).click();
  307 |     await expect(dialog).toHaveCount(0);
  308 |     await expect(page.locator('tbody')).toContainText('Audit Created Boat');
  309 |     expect(posts).toBe(2);
  310 |     await page.locator('main').getByRole('button', { name: label(locale, 'adminNew.common.delete'), exact: true }).click();
  311 |     const confirm = page.getByRole('dialog');
  312 |     await expect(confirm).toContainText(label(locale, 'adminNew.boats.confirmDelete'));
  313 |     await confirm.getByRole('button', { name: label(locale, 'adminNew.common.delete'), exact: true }).click();
  314 |     await expect(page.getByText(label(locale, 'adminNew.boats.emptyTitle'), { exact: true })).toBeVisible();
  315 |     expect(deletes).toBe(1);
  316 |   });
  317 | }
  318 | 
  319 | test('boat detail update modal saves and read-only hides mutations', async ({ page }) => {
  320 |   await session(page, 'staff', false);
  321 |   let patches = 0;
  322 |   let boat = {
  323 |     id: 'boat-1', name: 'Audit Detail Boat', type: 'motor', brand: 'Bavaria', model: '34',
  324 |     customer_id: 'customer-1', length_cm: 900, location_code: 'A-1', public_listing_url: null,
  325 |   };
  326 |   await page.route('**/api/v1/auth/me', route => route.fulfill({
  327 |     json: {
  328 |       id: 'boat-writer', name: 'Boat Writer', email: 'boat-writer@example.test', role: 'staff',
  329 |       permissions: ['boats.view', 'boats.write', 'customers.view'],
  330 |     },
  331 |   }));
  332 |   await page.route('**/api/v1/customers*', route => route.fulfill({
  333 |     json: { data: [{ id: 'customer-1', name: 'Audit Owner' }], meta: { total: 1, current_page: 1, last_page: 1, per_page: 200 } },
  334 |   }));
  335 |   await page.route('**/api/v1/boats/boat-1/dossier', route => route.fulfill({
  336 |     json: {
  337 |       boat, owner: { id: 'customer-1', name: 'Audit Owner' }, stats: {}, storage_contracts: [],
  338 |       work_orders: [], financial: { invoices: [] }, timeline: [], qr: { payload: 'qr-boat-1' },
  339 |     },
  340 |   }));
  341 |   await page.route('**/api/v1/boats/boat-1/audit-log*', route => route.fulfill({
  342 |     json: { data: [], meta: { total: 0, current_page: 1, last_page: 1, per_page: 25 } },
  343 |   }));
  344 |   await page.route('**/api/v1/boats/boat-1', async route => {
  345 |     if (route.request().method() === 'PATCH') {
  346 |       patches++;
  347 |       const payload = route.request().postDataJSON();
  348 |       expect(payload.name).toBe('Audit Updated Boat');
  349 |       boat = { ...boat, ...payload };
  350 |       return route.fulfill({ status: 200, json: boat });
  351 |     }
  352 |     return route.fulfill({ json: boat });
  353 |   });
  354 |   await page.goto('/nl/admin/boten/boat-1');
  355 |   await expect(page.locator('main h1')).toContainText('Audit Detail Boat');
  356 |   await page.getByRole('button', { name: label('nl', 'adminNew.common.edit'), exact: true }).click();
  357 |   const dialog = page.getByRole('dialog');
  358 |   await expect(dialog).toBeVisible();
  359 |   const name = dialog.getByLabel(label('nl', 'adminNew.common.name'), { exact: false }).first();
  360 |   await name.fill('Audit Updated Boat');
  361 |   await dialog.getByRole('button', { name: label('nl', 'adminNew.common.save'), exact: true }).click();
  362 |   await expect(dialog).toHaveCount(0);
  363 |   await expect(page.locator('main h1')).toContainText('Audit Updated Boat');
  364 |   expect(patches).toBe(1);
  365 | 
  366 |   await page.route('**/api/v1/auth/me', route => route.fulfill({
  367 |     json: {
  368 |       id: 'boat-reader', name: 'Boat Reader', email: 'boat-reader@example.test', role: 'staff',
  369 |       permissions: ['boats.view', 'customers.view'],
  370 |     },
  371 |   }));
  372 |   await page.reload();
  373 |   await expect(page.locator('main h1')).toContainText('Audit Updated Boat');
  374 |   await expect(page.getByRole('button', { name: label('nl', 'adminNew.common.edit'), exact: true })).toHaveCount(0);
  375 |   await expect(page.getByRole('button', { name: label('nl', 'adminNew.boats.transfer'), exact: true })).toHaveCount(0);
  376 | });
  377 | 
  378 | for (const write of [false, true]) {
  379 |   test(`supplier list write controls and create deep link (${write})`, async ({ page }) => {
  380 |     await session(page, 'staff', false);
  381 |     let mutations = 0;
  382 |     await page.route('**/api/v1/auth/me', route => route.fulfill({
```