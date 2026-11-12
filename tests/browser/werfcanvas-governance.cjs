// Local integration regression. Requires isolated QA fixture script; never uses production data.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../../..');
const output = path.join(root, '_audit/werfcanvas-20261110');
const fixture = JSON.parse(execFileSync('php', ['werfcanvas-followup-fixture.php'], { cwd: path.join(root, '_audit'), encoding: 'utf8', env: {
  ...process.env, APP_ENV: 'testing', DB_CONNECTION: 'sqlite', DB_URL: '', DB_DATABASE: path.join(output, 'werfcanvas-qa.sqlite'), MAIL_MAILER: 'array',
} }));
const origin = 'http://127.0.0.1:3064';
const endpoint = 'http://127.0.0.1:8094/api/v1/admin/yard-canvas';
async function api(route, body, token = fixture.office_token, method = 'POST') {
  const response = await fetch(endpoint + route, { method: body ? method : 'GET', headers: { Authorization: 'Bearer ' + token, Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
  assert.ok(response.ok, `${response.status}: ${await response.clone().text()}`); return response.json();
}
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  let office, superPage;
  try {
    const geometry = await api('/geometry');
    await api('/geometry', { version: geometry.version, width: 120, height: 90, clearance_m: .5, boundary: [[0,0],[120,0],[120,90],[0,90]], zones: [], survey_reference: 'SYNTHETIC LOCAL QA — not a surveyed yard', confirmed: true }, fixture.super_token, 'PUT');
    async function open(token, viewport = { width: 1700, height: 1000 }, touch = false) {
      const context = await browser.newContext({ viewport, hasTouch: touch, serviceWorkers: 'block' });
      // The Windows PHP development server is serial; omit unrelated dashboard polling.
      await context.route(/\/api\/v1\/(invoices|sync\/status|stalling|admin\/reminders|track-event)(?:\?|$)/, route => route.abort());
      await context.addCookies([{ name: 'krek_session', value: token, url: origin }]);
      const page = await context.newPage(); page.setDefaultTimeout(45000);
      page.on('pageerror', e => { throw e; });
      await page.goto(origin + '/nl/admin/stalling/werfcanvas', { timeout: 180000 });
      try { await page.getByLabel('Interactieve werfkaart').waitFor(); }
      catch (e) { console.error('Workspace alerts:', await page.getByRole('alert').allTextContents()); console.error((await page.locator('main').innerText()).slice(0,1500)); throw e; }
      await page.getByRole('button', { name: 'Kaart bewerken', exact: true }).click();
      await page.getByRole('region', { name: 'Kaartbeheer en veiligheidsbeoordeling' }).waitFor();
      return page;
    }
    office = await open(fixture.office_token);
    const region = office.getByRole('region', { name: 'Kaartbeheer en veiligheidsbeoordeling' });
    await region.locator('input[type=file]').setInputFiles(fixture.image_path);
    await region.getByLabel('Meetrapport / referentie').fill('SYNTHETIC local QA calibration');
    for (const [i, p] of [[0,0],[1,0],[1,1],[0,1]].entries()) {
      for (const [key, value] of Object.entries({ label: 'Synthetic point ' + (i+1), image_x: p[0], image_y: p[1], yard_x: 120*p[0], yard_y: 90*p[1] })) await region.getByLabel(`Meetpunt ${i+1} ${key}`, { exact: true }).fill(String(value));
    }
    const submitted = office.waitForResponse(r => r.url().endsWith('/calibrations') && r.request().method() === 'POST');
    await region.getByRole('button', { name: 'Kalibratie indienen', exact: true }).click();
    const response = await submitted; assert.equal(response.status(), 201); const calibration = await response.json();
    const own = region.locator('article').filter({ hasText: calibration.id });
    assert.equal(await own.getByRole('button', { name: 'Kalibratie goedkeuren', exact: true }).count(), 0);
    superPage = await open(fixture.super_token);
    const reviewed = superPage.locator('article').filter({ hasText: calibration.id });
    await reviewed.getByText(/Gemiddelde afwijking 0.000 m/).waitFor();
    await reviewed.locator('summary').click();
    await reviewed.getByText('Synthetic point 1', { exact: false }).waitFor();
    superPage.once('dialog', d => d.accept());
    await reviewed.getByRole('button', { name: 'Kalibratie goedkeuren', exact: true }).click();
    await reviewed.getByRole('button', { name: 'Goedgekeurde kaart publiceren', exact: true }).waitFor();
    await region.getByRole('button', { name: 'Beoordelingen vernieuwen' }).click();
    await own.getByRole('button', { name: 'Goedgekeurde kaart publiceren', exact: true }).waitFor();
    const before = await api('?placed=1');
    office.once('dialog', d => d.accept());
    await own.getByRole('button', { name: 'Goedgekeurde kaart publiceren', exact: true }).click();
    await region.waitFor({ state: 'hidden' });
    const after = await api('?placed=1'); assert.equal(after.background.calibration_current, true);
    assert.deepEqual(after.boats.data.map(b => [b.id,b.placement.actual,b.placement.version]), before.boats.data.map(b => [b.id,b.placement.actual,b.placement.version]));
    await office.locator('svg image[transform^="matrix("]').first().waitFor();
    await office.screenshot({ path: path.join(output, 'task1-approved-calibration-desktop.png'), fullPage: true });
    for (const [name, viewport] of [['tablet',{width:1024,height:768}],['mobile',{width:390,height:844}]]) {
      const page = await open(fixture.office_token, viewport, true);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, name + ' document overflow');
      await page.screenshot({ path: path.join(output, `task1-map-management-${name}.png`), fullPage: true }); await page.context().close();
    }
    console.log('PASS: independent calibration review/publication, residual display, affine image, preserved boat placements, desktop/tablet/mobile layouts. Synthetic local evidence only.');
  } catch (e) {
    if (office) { console.error('Office alerts:', await office.getByRole('alert').allTextContents()); await office.screenshot({ path: path.join(output,'task1-governance-failure.png'), fullPage: true }); }
    throw e;
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
