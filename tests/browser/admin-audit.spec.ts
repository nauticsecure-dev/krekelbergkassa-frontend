import { expect, test, type Page } from '@playwright/test';
import fs from 'node:fs';
const matrix = JSON.parse(fs.readFileSync('artifacts/admin-audit/source-matrix.json', 'utf8'));
const dictionaries = Object.fromEntries(['nl','en','de','fr'].map(locale => [locale, JSON.parse(fs.readFileSync(`src/i18n/messages/${locale}.json`, 'utf8'))]));
const label = (locale: string, key: string): string => key.split('.').reduce((v, k) => v[k], dictionaries[locale]);
const failure = 'Audit injected service failure';
async function session(page: Page, role = 'super_admin', broken = true) {
  const baseURL = test.info().project.use.baseURL!;
  await page.context().addCookies([{ name: 'krek_session', value: 'audit-fixture', url: baseURL }]);
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.origin !== baseURL) return route.abort();
    if (!url.pathname.startsWith('/api/')) return route.continue();
    if (url.pathname.endsWith('/auth/me')) return route.fulfill({ json: { id:'audit', name:'Reviewer', email:'audit@example.test', role, permissions:['*'] } });
    if (broken) return route.fulfill({ status:503, json:{message:failure} });
    if (url.pathname.endsWith('/admin/calendar')) return route.fulfill({ json: {regular_hours:[],exceptions:[],lunch_block:null} });
    return route.fulfill({ json:{data:[],items:[],cards:[],meta:{total:0,current_page:1,last_page:1}} });
  });
}
for (const entry of matrix.pages) {
  test(`route failure boundary: ${entry.route}`, async ({ page }, info) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await session(page, entry.route.startsWith('/admin/werkorders') ? 'staff' : 'super_admin');
    await page.goto(`/nl${entry.route.replaceAll('[id]', 'audit-missing-record').replaceAll('[slug]', 'audit-record')}`);
    const main = page.locator('main');
    await expect(main).toBeVisible();
    await expect.poll(() => main.innerText()).not.toBe('');
    await expect(main.locator('.animate-pulse, .animate-spin')).toHaveCount(0);
    // Observe whether this route surfaces the injected error. A rendered heading alone
    // is only a smoke pass, never a verified error-state pass.
    await expect(page.locator('body')).not.toContainText('Application error:');
    const text = await main.innerText();
    await info.attach('route-observation', { body: JSON.stringify({ route:entry.route, locale:'nl', finalURL:page.url(), injectedErrorVisible:text.includes(failure), text:text.slice(0,2000), errors }), contentType:'application/json' });
    expect(errors).toEqual([]);
    const screenshot = info.outputPath('route-error-state.png');
    await page.screenshot({path:screenshot,fullPage:true});
    await info.attach('page-evidence',{path:screenshot,contentType:'image/png'});
  });
}
for (const locale of ['nl','en','de','fr']) {
  test(`${locale}: dashboard sidebar and KPI responsive evidence`, async ({ page }, info) => {
    await session(page);
    await page.goto(`/${locale}/admin`);
    await expect(page.locator('main h1')).toBeVisible();
    if (locale === 'fr') {
      await expect(page.locator('main h1')).toHaveText('Vue opérationnelle');
      await expect(page.locator('aside').getByRole('link',{name:'Clients',exact:true})).toBeVisible();
      await expect(page.locator('aside').getByRole('link',{name:'Services et tarifs',exact:true})).toBeVisible();
    }
    for (const width of [390, 1280, 1536]) {
      await page.setViewportSize({width,height:1000});
      for (const collapsed of width === 390 ? [false] : [false,true]) {
        if (width !== 390 && collapsed) await page.getByRole('button', {name:label(locale,'adminNew.shell.collapseSidebar'),exact:true}).click();
        await expect.poll(() => page.locator('main').evaluate(e => e.scrollWidth-e.clientWidth)).toBeLessThanOrEqual(1);
        await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
        const kpis = page.locator('[data-admin-kpis]');
        await expect(kpis).toBeVisible();
        await expect.poll(() => kpis.evaluate(e => getComputedStyle(e).gridTemplateColumns.split(' ').length)).toBe(width === 390 ? 1 : width === 1280 ? 3 : 5);
        await page.screenshot({path:info.outputPath(`${locale}-${width}-${collapsed?'collapsed':'expanded'}.png`),fullPage:true});
        if (width !== 390 && collapsed) await page.getByRole('button', {name:label(locale,'adminNew.shell.expandSidebar'),exact:true}).click();
      }
      if (width === 390) {
        await page.getByRole('button', {name:label(locale,'header.mainMenu'),exact:true}).click();
        await expect(page.getByRole('dialog')).toBeVisible();
        await page.screenshot({path:info.outputPath(`${locale}-390-drawer-open.png`)});
        await page.keyboard.press('Escape');
        await expect(page.getByRole('dialog')).toBeHidden();
      }
    }
    const raw = (await page.locator('body').innerText()).match(/\b(?:adminNew|adminModules)\.[A-Za-z][\w.]+/g) ?? [];
    expect(raw).toEqual([]);
  });
}

for (const write of [false, true]) {
  test(`customer list write controls and create deep link (${write})`, async ({ page }) => {
    await session(page, 'staff', false);
    let mutations = 0;
    await page.route('**/api/v1/auth/me', route => route.fulfill({json:{id:'reader',name:'Reader',email:'reader@example.test',role:'staff',permissions:write?['customers.view','customers.write']:['customers.view']}}));
    await page.route('**/api/v1/customers*', route => {
      if (route.request().method() !== 'GET') { mutations++; return route.fulfill({status:403,json:{message:'Forbidden'}}); }
      return route.fulfill({json:{data:[{id:'customer-1',name:'Audit Customer',email:'customer@example.test',preferred_locale:'nl',status:'active'}],meta:{total:1,current_page:1,last_page:1,per_page:20}}});
    });
    await page.goto('/nl/admin/klanten?new=1');
    await expect(page.locator('tbody')).toContainText('Audit Customer');
    const main = page.locator('main');
    for (const key of ['new','sendLoginLink','impersonate','block']) {
      const control = main.getByRole('button',{name:label('nl',`adminNew.customers.${key}`),exact:true});
      if (write) await expect(control).toBeVisible();
      else await expect(control).toHaveCount(0);
    }
    if (!write) await expect(page.getByRole('dialog')).toHaveCount(0);
    expect(mutations).toBe(0);
  });
}

test('customer loading empty validation and create modal retain data then save', async ({ page }, info) => {
  await session(page, 'staff', false);
  let release!: () => void;
  const held = new Promise<void>(resolve => { release = resolve; });
  let first = true;
  let rejected = true;
  let posts = 0;
  let record: Record<string, unknown> | null = null;
  await page.route('**/api/v1/customers*', async route => {
    if (route.request().method() === 'POST') {
      posts++;
      const payload = route.request().postDataJSON();
      expect(payload.name).toBe('Audit Created Customer');
      if (rejected) return route.fulfill({status:422,json:{message:'Audit validation failure',errors:{email:['Audit email already exists']}}});
      record={...payload,id:'created-customer',status:'active'};
      return route.fulfill({status:201,json:record});
    }
    if(first) {first=false;await held;}
    return route.fulfill({json:{data:record?[record]:[],meta:{total:record?1:0,current_page:1,last_page:1,per_page:20}}});
  });
  await page.goto('/nl/admin/klanten');
  await expect(page.locator('main .animate-pulse').first()).toBeVisible();
  release();
  await expect(page.getByText(label('nl','adminNew.customers.emptyTitle'),{exact:true})).toBeVisible();
  await page.locator('main').getByRole('button',{name:label('nl','adminNew.customers.new'),exact:true}).first().click();
  const dialog=page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  const name=dialog.getByLabel(label('nl','adminNew.common.name'),{exact:false}).first();
  await dialog.getByRole('button',{name:label('nl','adminNew.common.save'),exact:true}).click();
  expect(posts).toBe(0);
  expect(await name.evaluate((input:HTMLInputElement)=>input.validity.valueMissing)).toBe(true);
  await name.fill('Audit Created Customer');
  await dialog.getByLabel(label('nl','adminNew.common.email'),{exact:false}).first().fill('audit-created@example.test');
  await dialog.getByRole('button',{name:label('nl','adminNew.common.save'),exact:true}).click();
  await expect(page.getByText(/Audit email already exists/).first()).toBeVisible();
  await expect(name).toHaveValue('Audit Created Customer');
  for(const width of [390,1280]) {
    await page.setViewportSize({width,height:1000});
    await expect.poll(()=>dialog.evaluate(element=>element.getBoundingClientRect().width)).toBeLessThanOrEqual(width);
    await page.screenshot({path:info.outputPath(`customer-validation-${width}.png`),fullPage:true});
  }
  rejected=false;
  await dialog.getByRole('button',{name:label('nl','adminNew.common.save'),exact:true}).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.locator('tbody')).toContainText('Audit Created Customer');
  expect(posts).toBe(2);
});

for (const write of [false, true]) {
  test(`boat list write controls and create deep link (${write})`, async ({ page }) => {
    await session(page, 'staff', false);
    let mutations = 0;
    await page.route('**/api/v1/auth/me', route => route.fulfill({
      json: {
        id: 'boat-reader', name: 'Boat Reader', email: 'boat-reader@example.test', role: 'staff',
        permissions: write ? ['boats.view', 'boats.write', 'boats.delete', 'customers.view'] : ['boats.view', 'customers.view'],
      },
    }));
    await page.route('**/api/v1/customers*', route => route.fulfill({
      json: { data: [{ id: 'customer-1', name: 'Audit Owner', email: 'owner@example.test' }], meta: { total: 1, current_page: 1, last_page: 1, per_page: 100 } },
    }));
    await page.route('**/api/v1/boats**', route => {
      const path = new URL(route.request().url()).pathname;
      if (route.request().method() !== 'GET') { mutations++; return route.fulfill({ status: 403, json: { message: 'Forbidden' } }); }
      if (path.endsWith('/boats/stats')) {
        return route.fulfill({ json: { total_boats: 1, boats_in_storage: 0, active_work_orders: 0, open_balance_cents: 0 } });
      }
      return route.fulfill({
        json: {
          data: [{
            id: 'boat-1', name: 'Audit Boat', type: 'motor', customer: { id: 'customer-1', name: 'Audit Owner' },
            length_cm: 900, location_code: 'A-1', current_status: 'registered',
          }],
          meta: { total: 1, current_page: 1, last_page: 1, per_page: 20 },
        },
      });
    });
    await page.goto('/nl/admin/boten?new=1');
    await expect(page.locator('tbody')).toContainText('Audit Boat');
    const create = page.locator('main').getByRole('button', { name: label('nl', 'adminNew.boats.new'), exact: true });
    const remove = page.locator('main').getByRole('button', { name: label('nl', 'adminNew.common.delete'), exact: true });
    await expect(create).toBeVisible();
    await expect(remove).toBeVisible();
    if (write) {
      await expect(create).toBeEnabled();
      await expect(remove).toBeEnabled();
      await expect(page.getByRole('dialog')).toBeVisible();
    } else {
      await expect(create).toBeDisabled();
      await expect(remove).toBeDisabled();
      await expect(page.getByRole('dialog')).toHaveCount(0);
    }
    expect(mutations).toBe(0);
  });
}

test('boat loading empty validation create and delete retain data then mutate', async ({ page }, info) => {
  await session(page, 'staff', false);
  let release!: () => void;
  const held = new Promise<void>(resolve => { release = resolve; });
  let first = true;
  let rejected = true;
  let posts = 0;
  let deletes = 0;
  let record: Record<string, unknown> | null = null;
  await page.route('**/api/v1/auth/me', route => route.fulfill({
    json: {
      id: 'boat-writer', name: 'Boat Writer', email: 'boat-writer@example.test', role: 'staff',
      permissions: ['boats.view', 'boats.write', 'boats.delete', 'customers.view'],
    },
  }));
  await page.route('**/api/v1/customers*', route => route.fulfill({
    json: {
      data: [{ id: 'customer-1', name: 'Audit Owner', email: 'owner@example.test' }],
      meta: { total: 1, current_page: 1, last_page: 1, per_page: 100 },
    },
  }));
  await page.route('**/api/v1/boats**', async route => {
    const method = route.request().method();
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/boats/stats')) {
      return route.fulfill({
        json: { total_boats: record ? 1 : 0, boats_in_storage: 0, active_work_orders: 0, open_balance_cents: 0 },
      });
    }
    if (method === 'POST') {
      posts++;
      const payload = route.request().postDataJSON();
      expect(payload).toMatchObject({ customer_id: 'customer-1', name: 'Audit Created Boat', type: 'motor' });
      if (rejected) return route.fulfill({ status: 422, json: { message: 'Audit validation failure', errors: { name: ['Audit boat name taken'] } } });
      record = {
        ...payload, id: 'created-boat', customer: { id: 'customer-1', name: 'Audit Owner' },
        current_status: 'registered', length_cm: payload.length_cm ?? null, location_code: payload.location_code ?? null,
      };
      return route.fulfill({ status: 201, json: record });
    }
    if (method === 'DELETE') {
      deletes++;
      record = null;
      return route.fulfill({ status: 200, json: { message: 'deleted' } });
    }
    if (method === 'GET' && /\/boats\/?$/.test(path)) {
      if (first) { first = false; await held; }
      return route.fulfill({
        json: {
          data: record ? [record] : [],
          meta: { total: record ? 1 : 0, current_page: 1, last_page: 1, per_page: 20 },
        },
      });
    }
    return route.fulfill({ json: { data: [], meta: { total: 0, current_page: 1, last_page: 1, per_page: 20 } } });
  });
  await page.goto('/nl/admin/boten');
  await expect(page.locator('main .animate-pulse').first()).toBeVisible();
  release();
  await expect(page.getByText(label('nl', 'adminNew.boats.emptyTitle'), { exact: true })).toBeVisible();
  await page.locator('main').getByRole('button', { name: label('nl', 'adminNew.boats.new'), exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: label('nl', 'adminNew.boats.selectCustomer'), exact: true }).click();
  await page.getByRole('option', { name: 'Audit Owner', exact: true }).click();
  const name = dialog.getByLabel(label('nl', 'adminNew.common.name'), { exact: false }).first();
  await dialog.getByRole('button', { name: label('nl', 'adminNew.common.save'), exact: true }).click();
  expect(posts).toBe(0);
  expect(await name.evaluate((input: HTMLInputElement) => input.validity.valueMissing)).toBe(true);
  await name.fill('Audit Created Boat');
  await dialog.getByRole('button', { name: label('nl', 'adminNew.common.save'), exact: true }).click();
  await expect(page.getByText(/Audit boat name taken/).first()).toBeVisible();
  await expect(name).toHaveValue('Audit Created Boat');
  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect.poll(() => dialog.evaluate(element => element.getBoundingClientRect().width)).toBeLessThanOrEqual(width);
    await page.screenshot({ path: info.outputPath(`boat-validation-${width}.png`), fullPage: true });
  }
  rejected = false;
  await dialog.getByRole('button', { name: label('nl', 'adminNew.common.save'), exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.locator('tbody')).toContainText('Audit Created Boat');
  expect(posts).toBe(2);
  await page.locator('main').getByRole('button', { name: label('nl', 'adminNew.common.delete'), exact: true }).click();
  const confirm = page.getByRole('dialog');
  await expect(confirm).toContainText(label('nl', 'adminNew.boats.confirmDelete'));
  await confirm.getByRole('button', { name: label('nl', 'adminNew.common.delete'), exact: true }).click();
  await expect(page.getByText(label('nl', 'adminNew.boats.emptyTitle'), { exact: true })).toBeVisible();
  expect(deletes).toBe(1);
});

test('boat detail update modal saves and read-only hides mutations', async ({ page }) => {
  await session(page, 'staff', false);
  let patches = 0;
  let boat = {
    id: 'boat-1', name: 'Audit Detail Boat', type: 'motor', brand: 'Bavaria', model: '34',
    customer_id: 'customer-1', length_cm: 900, location_code: 'A-1', public_listing_url: null,
  };
  await page.route('**/api/v1/auth/me', route => route.fulfill({
    json: {
      id: 'boat-writer', name: 'Boat Writer', email: 'boat-writer@example.test', role: 'staff',
      permissions: ['boats.view', 'boats.write', 'customers.view'],
    },
  }));
  await page.route('**/api/v1/customers*', route => route.fulfill({
    json: { data: [{ id: 'customer-1', name: 'Audit Owner' }], meta: { total: 1, current_page: 1, last_page: 1, per_page: 200 } },
  }));
  await page.route('**/api/v1/boats/boat-1/dossier', route => route.fulfill({
    json: {
      boat, owner: { id: 'customer-1', name: 'Audit Owner' }, stats: {}, storage_contracts: [],
      work_orders: [], financial: { invoices: [] }, timeline: [], qr: { payload: 'qr-boat-1' },
    },
  }));
  await page.route('**/api/v1/boats/boat-1/audit-log*', route => route.fulfill({
    json: { data: [], meta: { total: 0, current_page: 1, last_page: 1, per_page: 25 } },
  }));
  await page.route('**/api/v1/boats/boat-1', async route => {
    if (route.request().method() === 'PATCH') {
      patches++;
      const payload = route.request().postDataJSON();
      expect(payload.name).toBe('Audit Updated Boat');
      boat = { ...boat, ...payload };
      return route.fulfill({ status: 200, json: boat });
    }
    return route.fulfill({ json: boat });
  });
  await page.goto('/nl/admin/boten/boat-1');
  await expect(page.locator('main h1')).toContainText('Audit Detail Boat');
  await page.getByRole('button', { name: label('nl', 'adminNew.common.edit'), exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  const name = dialog.getByLabel(label('nl', 'adminNew.common.name'), { exact: false }).first();
  await name.fill('Audit Updated Boat');
  await dialog.getByRole('button', { name: label('nl', 'adminNew.common.save'), exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.locator('main h1')).toContainText('Audit Updated Boat');
  expect(patches).toBe(1);

  await page.route('**/api/v1/auth/me', route => route.fulfill({
    json: {
      id: 'boat-reader', name: 'Boat Reader', email: 'boat-reader@example.test', role: 'staff',
      permissions: ['boats.view', 'customers.view'],
    },
  }));
  await page.reload();
  await expect(page.locator('main h1')).toContainText('Audit Updated Boat');
  await expect(page.getByRole('button', { name: label('nl', 'adminNew.common.edit'), exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: label('nl', 'adminNew.boats.transfer'), exact: true })).toHaveCount(0);
});

for (const write of [false, true]) {
  test(`supplier list write controls and create deep link (${write})`, async ({ page }) => {
    await session(page, 'staff', false);
    let mutations = 0;
    await page.route('**/api/v1/auth/me', route => route.fulfill({
      json: {
        id: 'supplier-reader', name: 'Supplier Reader', email: 'supplier-reader@example.test', role: 'staff',
        permissions: write ? ['products.view', 'products.write'] : ['products.view'],
      },
    }));
    await page.route('**/api/v1/suppliers**', route => {
      if (route.request().method() !== 'GET') { mutations++; return route.fulfill({ status: 403, json: { message: 'Forbidden' } }); }
      return route.fulfill({
        json: {
          data: [{ id: 'supplier-1', name: 'Audit Supplier', email: 'supplier@example.test', vat_number: 'NL123', payment_terms_days: 30 }],
          meta: { total: 1, current_page: 1, last_page: 1, per_page: 50 },
        },
      });
    });
    await page.goto('/nl/admin/leveranciers?new=1');
    await expect(page.locator('tbody')).toContainText('Audit Supplier');
    const create = page.getByRole('button', { name: label('nl', 'adminNew.suppliers.new'), exact: true });
    const edit = page.locator('main').getByRole('button', { name: label('nl', 'adminNew.common.edit'), exact: true });
    await expect(create).toBeVisible();
    await expect(edit).toBeVisible();
    if (write) {
      await expect(create).toBeEnabled();
      await expect(edit).toBeEnabled();
      await expect(page.getByRole('dialog')).toBeVisible();
    } else {
      await expect(create).toBeDisabled();
      await expect(edit).toBeDisabled();
      await expect(page.getByRole('dialog')).toHaveCount(0);
    }
    expect(mutations).toBe(0);
  });
}

test('supplier loading empty validation create and update retain data then mutate', async ({ page }, info) => {
  await session(page, 'staff', false);
  let release!: () => void;
  const held = new Promise<void>(resolve => { release = resolve; });
  let first = true;
  let rejected = true;
  let posts = 0;
  let patches = 0;
  let record: Record<string, unknown> | null = null;
  await page.route('**/api/v1/auth/me', route => route.fulfill({
    json: {
      id: 'supplier-writer', name: 'Supplier Writer', email: 'supplier-writer@example.test', role: 'staff',
      permissions: ['products.view', 'products.write'],
    },
  }));
  await page.route('**/api/v1/suppliers**', async route => {
    const method = route.request().method();
    const path = new URL(route.request().url()).pathname;
    if (method === 'POST') {
      posts++;
      const payload = route.request().postDataJSON();
      expect(payload).toMatchObject({ name: 'Audit Created Supplier', default_purchase_ledger: '4000' });
      expect(payload).not.toHaveProperty('default_ledger_account');
      if (rejected) return route.fulfill({ status: 422, json: { message: 'Audit validation failure', errors: { name: ['Audit supplier name taken'] } } });
      record = { ...payload, id: 'created-supplier', email: payload.email ?? null, phone: payload.phone ?? null, vat_number: payload.vat_number ?? null, payment_terms_days: payload.payment_terms_days ?? null };
      return route.fulfill({ status: 201, json: record });
    }
    if (method === 'PATCH' && path.includes('/suppliers/')) {
      patches++;
      const payload = route.request().postDataJSON();
      expect(payload.name).toBe('Audit Updated Supplier');
      expect(payload).toMatchObject({ default_purchase_ledger: '4000' });
      record = { ...(record ?? {}), ...payload, id: 'created-supplier' };
      return route.fulfill({ status: 200, json: record });
    }
    if (method === 'GET' && /\/suppliers\/?$/.test(path)) {
      if (first) { first = false; await held; }
      return route.fulfill({
        json: {
          data: record ? [record] : [],
          meta: { total: record ? 1 : 0, current_page: 1, last_page: 1, per_page: 50 },
        },
      });
    }
    return route.fulfill({ json: record ?? {} });
  });
  await page.goto('/nl/admin/leveranciers');
  await expect(page.locator('main .animate-pulse').first()).toBeVisible();
  release();
  await expect(page.getByText(label('nl', 'adminNew.suppliers.emptyTitle'), { exact: true })).toBeVisible();
  await page.getByRole('button', { name: label('nl', 'adminNew.suppliers.new'), exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  const name = dialog.getByLabel(label('nl', 'adminNew.suppliers.columns.name'), { exact: false }).first();
  await dialog.getByRole('button', { name: label('nl', 'adminNew.common.save'), exact: true }).click();
  expect(posts).toBe(0);
  expect(await name.evaluate((input: HTMLInputElement) => input.validity.valueMissing)).toBe(true);
  await name.fill('Audit Created Supplier');
  await dialog.getByLabel(label('nl', 'adminNew.suppliers.fields.ledgerAccount'), { exact: false }).first().fill('4000');
  await dialog.getByRole('button', { name: label('nl', 'adminNew.common.save'), exact: true }).click();
  await expect(page.getByText(/Audit supplier name taken/).first()).toBeVisible();
  await expect(name).toHaveValue('Audit Created Supplier');
  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect.poll(() => dialog.evaluate(element => element.getBoundingClientRect().width)).toBeLessThanOrEqual(width);
    await page.screenshot({ path: info.outputPath(`supplier-validation-${width}.png`), fullPage: true });
  }
  rejected = false;
  await dialog.getByRole('button', { name: label('nl', 'adminNew.common.save'), exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.locator('tbody')).toContainText('Audit Created Supplier');
  expect(posts).toBe(2);
  await page.locator('main').getByRole('button', { name: label('nl', 'adminNew.common.edit'), exact: true }).click();
  const edit = page.getByRole('dialog');
  await expect(edit).toBeVisible();
  await expect(edit.getByLabel(label('nl', 'adminNew.suppliers.fields.ledgerAccount'), { exact: false }).first()).toHaveValue('4000');
  await edit.getByLabel(label('nl', 'adminNew.suppliers.columns.name'), { exact: false }).first().fill('Audit Updated Supplier');
  await edit.getByRole('button', { name: label('nl', 'adminNew.common.save'), exact: true }).click();
  await expect(edit).toHaveCount(0);
  await expect(page.locator('tbody')).toContainText('Audit Updated Supplier');
  expect(patches).toBe(1);
});

for (const write of [false, true]) {
  test(`product list write controls and create deep link (${write})`, async ({ page }) => {
    await session(page, 'staff', false);
    let mutations = 0;
    await page.route('**/api/v1/auth/me', route => route.fulfill({
      json: {
        id: 'product-reader', name: 'Product Reader', email: 'product-reader@example.test', role: 'staff',
        permissions: write ? ['products.view', 'products.write'] : ['products.view'],
      },
    }));
    await page.route('**/api/v1/product-groups**', route => route.fulfill({
      json: { data: [], meta: { total: 0, current_page: 1, last_page: 1, per_page: 100 } },
    }));
    await page.route('**/api/v1/products**', route => {
      if (route.request().method() !== 'GET') { mutations++; return route.fulfill({ status: 403, json: { message: 'Forbidden' } }); }
      return route.fulfill({
        json: {
          data: [{ id: 'product-1', code: 'AUDIT-1', name: 'Audit Product', vat_rate: 21, price_excl_vat: 1000, price_incl_vat: 1210, active: true }],
          meta: { total: 1, current_page: 1, last_page: 1, per_page: 20 },
        },
      });
    });
    await page.goto('/nl/admin/producten');
    await expect(page.locator('tbody')).toContainText('Audit Product');
    const create = page.getByRole('button', { name: label('nl', 'adminNew.products.new'), exact: true });
    const remove = page.locator('main').getByRole('button', { name: label('nl', 'adminNew.common.delete'), exact: true });
    await expect(create).toBeVisible();
    await expect(remove).toBeVisible();
    if (write) {
      await expect(create).toBeEnabled();
      await expect(remove).toBeEnabled();
    } else {
      await expect(create).toBeDisabled();
      await expect(remove).toBeDisabled();
    }
    await page.goto('/nl/admin/producten/nieuw');
    if (write) {
      await expect(page.locator('form')).toBeVisible();
      await expect(page).toHaveURL(/\/admin\/producten\/nieuw/);
    } else {
      // RequireAuth redirects create deep-links without products.write to the dashboard.
      await expect(page).toHaveURL(/\/nl\/admin\/?$/);
      await expect(page.locator('form')).toHaveCount(0);
      await expect(page.locator('main h1')).toBeVisible();
    }
    expect(mutations).toBe(0);
  });
}

test('product empty validation create and delete retain data then mutate', async ({ page }, info) => {
  await session(page, 'staff', false);
  let rejected = true;
  let posts = 0;
  let deletes = 0;
  let record: Record<string, unknown> | null = null;
  await page.route('**/api/v1/auth/me', route => route.fulfill({
    json: {
      id: 'product-writer', name: 'Product Writer', email: 'product-writer@example.test', role: 'staff',
      permissions: ['products.view', 'products.write'],
    },
  }));
  await page.route('**/api/v1/product-groups**', route => route.fulfill({
    json: { data: [], meta: { total: 0, current_page: 1, last_page: 1, per_page: 100 } },
  }));
  await page.route('**/api/v1/products**', async route => {
    const method = route.request().method();
    const path = new URL(route.request().url()).pathname;
    if (method === 'POST' && (path.endsWith('/products') || path.endsWith('/products/'))) {
      posts++;
      const payload = route.request().postDataJSON();
      expect(payload).toMatchObject({ code: 'AUDIT-CREATE', name: 'Audit Created Product', price_excl_vat: 10050 });
      if (rejected) return route.fulfill({ status: 422, json: { message: 'Audit validation failure', errors: { code: ['Audit product code taken'] } } });
      record = {
        ...payload, id: 'created-product', public_id: 'prd_audit', slug: 'audit-created-product',
        price_incl_vat: payload.price_incl_vat ?? 12161, active: true,
      };
      return route.fulfill({ status: 201, json: record });
    }
    if (method === 'DELETE') {
      deletes++;
      record = null;
      return route.fulfill({ status: 200, json: { message: 'deleted' } });
    }
    if (method === 'GET' && (path.endsWith('/products') || path.endsWith('/products/'))) {
      return route.fulfill({
        json: {
          data: record ? [record] : [],
          meta: { total: record ? 1 : 0, current_page: 1, last_page: 1, per_page: 20 },
        },
      });
    }
    if (method === 'GET' && record && path.includes(`/products/${record.id}`)) {
      return route.fulfill({ json: record });
    }
    return route.fulfill({ json: { data: [], meta: { total: 0, current_page: 1, last_page: 1, per_page: 20 } } });
  });
  await page.goto('/nl/admin/producten', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText(label('nl', 'adminNew.products.emptyTitle'), { exact: true })).toBeVisible();
  await page.goto('/nl/admin/producten/nieuw', { waitUntil: 'domcontentloaded' });
  const form = page.locator('form');
  await expect(form).toBeVisible();
  await form.getByRole('button', { name: label('nl', 'adminNew.common.save'), exact: true }).click();
  expect(posts).toBe(0);
  const name = form.getByLabel(label('nl', 'adminNew.products.columns.name'), { exact: false }).first();
  expect(await name.evaluate((input: HTMLInputElement) => input.validity.valueMissing)).toBe(true);
  await form.getByLabel(label('nl', 'adminNew.products.columns.code'), { exact: false }).first().fill('AUDIT-CREATE');
  await name.fill('Audit Created Product');
  await form.getByLabel(label('nl', 'adminNew.products.fields.priceExcl'), { exact: false }).first().fill('100.50');
  await form.getByRole('button', { name: label('nl', 'adminNew.common.save'), exact: true }).click();
  await expect(page.getByText(/Audit product code taken/).first()).toBeVisible();
  await expect(name).toHaveValue('Audit Created Product');
  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect.poll(() => page.locator('main').evaluate(element => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: info.outputPath(`product-validation-${width}.png`), fullPage: true });
  }
  rejected = false;
  const created = page.waitForResponse(response => {
    const path = new URL(response.url()).pathname;
    return response.request().method() === 'POST' && (path.endsWith('/products') || path.endsWith('/products/')) && response.status() === 201;
  });
  await form.getByRole('button', { name: label('nl', 'adminNew.common.save'), exact: true }).click();
  await created;
  expect(posts).toBe(2);
  await page.goto('/nl/admin/producten', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('tbody')).toContainText('Audit Created Product');
  await page.locator('main').getByRole('button', { name: label('nl', 'adminNew.common.delete'), exact: true }).click();
  const confirm = page.getByRole('dialog');
  await expect(confirm).toContainText(label('nl', 'adminNew.products.confirmDelete'));
  await confirm.getByRole('button', { name: label('nl', 'adminNew.common.delete'), exact: true }).click();
  await expect(page.getByText(label('nl', 'adminNew.products.emptyTitle'), { exact: true })).toBeVisible();
  expect(deletes).toBe(1);
});
