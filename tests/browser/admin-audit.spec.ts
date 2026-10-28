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
