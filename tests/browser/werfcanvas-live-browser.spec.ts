import { expect, test } from '../helpers/browser-test';
import type { Page } from '@playwright/test';
import { appendFileSync, mkdirSync } from 'node:fs';

const target = process.env.WERFCANVAS_LOCAL_WEB_URL;
test.skip(!target, 'Requires the isolated local yard runner.');
test.use({ trace: 'off' });

test('history exposes source coverage and unresolved events without assigning them to a boat', async ({ page }) => {
  const token = process.env.WERFCANVAS_RACE_FIRST_TOKEN!;
  await page.context().addCookies([{ name: 'krek_session', value: encodeURIComponent(token), url: target! }]);
  await page.goto(target! + '/nl/admin/stalling/werfcanvas');
  await page.getByRole('navigation', { name: 'Werfweergaven' }).getByRole('button', { name: 'Historie', exact: true }).click();
  const coverage = page.locator('details').filter({ has: page.locator('summary').filter({ hasText: 'Dekking van de historie' }) });
  await coverage.locator('summary').click();
  await expect(coverage).toContainText('Deze zijn niet aan de geselecteerde boot toegewezen.');
  const loaded = page.waitForResponse(response => new URL(response.url()).pathname.endsWith('/yard-canvas/history'), { timeout: 30000 });
  await coverage.getByRole('checkbox', { name: 'Alleen registraties zonder bootkoppeling tonen' }).check();
  const response = await loaded;
  expect(new URL(response.url()).searchParams.get('attribution')).toBe('unlinked');
  expect(response.status()).toBe(200);
  const history = await response.json();
  expect(history.events.total).toBe(1);
  expect(history.events.data[0]).toMatchObject({ event: 'invoice.legacy_unlinked', boat_id: null, boat_ids: [], route: null });
  expect(history.coverage.sources.invoice).toMatchObject({ available_events: 1, unlinked_events: 1 });
  await expect(page.getByRole('heading', { name: 'Historie (1)', exact: true })).toBeVisible();
  await expect(coverage.getByRole('row').filter({ hasText: 'Facturen' })).toContainText('1');
  await expect(page.getByRole('textbox', { name: 'Boot-ID', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Filteren', exact: true }).click();
  await expect(coverage.getByRole('checkbox')).toBeChecked();
});

test('a real browser plans a move through Laravel and reads it back after reload', async ({ page, request }) => {
  const boatId = process.env.WERFCANVAS_RACE_BOAT_ID!;
  const name = process.env.WERFCANVAS_LOCAL_BOAT_NAME!;
  const token = process.env.WERFCANVAS_RACE_FIRST_TOKEN!;
  const endpoint = process.env.WERFCANVAS_RACE_API_URL! + '/api/v1/admin/yard-canvas';
  const headers = { Authorization: 'Bearer ' + token, Accept: 'application/json' };
  const read = async () => {
    const response = await request.get(endpoint, { headers, params: { placed: 1, search: boatId } });
    expect(response.status()).toBe(200);
    return (await response.json()).boats.data.find((boat: { id: string }) => boat.id === boatId).placement;
  };
  const initial = await read();
  expect(initial.planned).toBeNull();
  await page.context().addCookies([{ name: 'krek_session', value: encodeURIComponent(token), url: target! }]);
  await page.goto(target! + '/nl/admin/stalling/werfcanvas');
  const map = page.getByLabel('Interactieve werfkaart', { exact: true });
  await expect(map.getByRole('button')).toHaveCount(250, { timeout: 60000 });
  await map.getByRole('button', { name, exact: true }).press('Enter');
  await map.press('ArrowLeft');
  await page.getByRole('group', { name: 'Werfcanvas werkbalk' }).getByRole('button', { name: /^Opslaan/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Verplaatsing plannen' });
  await expect(dialog).toBeVisible();
  await dialog.locator('input[type=datetime-local]').fill(process.env.WERFCANVAS_RACE_DUE_AT!);
  const saved = page.waitForResponse(response => response.request().method() === 'PATCH'
    && new URL(response.url()).pathname.endsWith('/placements/' + boatId));
  await dialog.getByRole('button', { name: 'Opslaan & toewijzen' }).click();
  const response = await saved;
  expect(response.status(), await response.text()).toBe(200);
  const placement = await response.json();
  try {
    expect(placement.version).toBe(initial.version + 1);
    expect(placement.actual).toEqual(initial.actual);
    expect(placement.planned.task_id).toBeTruthy();
    expect(await read()).toMatchObject({ version: placement.version, planned: placement.planned });
    await page.reload();
    await expect(map.getByRole('button')).toHaveCount(250, { timeout: 60000 });
    await expect(map.getByRole('button', { name, exact: true })).toBeVisible();
    expect(await read()).toMatchObject({ version: placement.version, planned: placement.planned });
    await expect(page.getByRole('button', { name: 'Concept vergelijken en herstellen' })).toHaveCount(0);
  } finally {
    const current = await read();
    if (current.version === placement.version && current.planned?.task_id === placement.planned.task_id) {
      const cleanup = await request.patch(endpoint + '/placements/' + boatId,
        { headers, data: { operation: 'cancel_plan', version: current.version } });
      expect(cleanup.status()).toBe(200);
    }
  }
});

test('two real browser clients race across backends, recover the conflict and persist a replan', async ({ page, browser, request }) => {
  test.setTimeout(300_000);
  mkdirSync(test.info().outputDir, { recursive: true });
  const progress = (stage: string) => appendFileSync(test.info().outputPath('progress.log'), new Date().toISOString() + ' ' + stage + '\n');
  progress('starting');
  const boatId = process.env.WERFCANVAS_RACE_BOAT_ID!;
  const name = process.env.WERFCANVAS_LOCAL_BOAT_NAME!;
  const due = process.env.WERFCANVAS_RACE_DUE_AT!;
  const tokens = [process.env.WERFCANVAS_RACE_FIRST_TOKEN!, process.env.WERFCANVAS_RACE_SECOND_TOKEN!];
  const apis = [process.env.WERFCANVAS_RACE_API_URL!, process.env.WERFCANVAS_RACE_SECOND_API_URL!];
  expect(new URL(apis[0]).origin).not.toBe(new URL(apis[1]).origin);
  expect(tokens[0]).not.toBe(tokens[1]);
  const endpoint = '/api/v1/admin/yard-canvas';
  const headers = (index: number) => ({ Accept: 'application/json', Authorization: 'Bearer ' + tokens[index] });
  const read = async (index: number) => {
    const response = await request.get(apis[index] + endpoint, { headers: headers(index), params: { placed: 1, search: boatId } });
    expect(response.status()).toBe(200);
    return (await response.json()).boats.data.find((boat: { id: string }) => boat.id === boatId).placement;
  };
  const initial = await read(0);
  expect(initial.planned).toBeNull();
  const secondContext = await browser.newContext({ viewport: { width: 1440, height: 1000 }, serviceWorkers: 'block' });
  await secondContext.routeWebSocket('**/_next/webpack-hmr', socket => socket.close());
  const clients = [page, await secondContext.newPage()];
  for (const [index, client] of clients.entries()) {
    client.on('requestfailed', request => progress(`client ${index} request failed: ${new URL(request.url()).pathname}: ${request.failure()?.errorText}`));
  }
  let ownedVersion: number | undefined;
  let ownedTask: string | undefined;
  const map = (client: Page) => client.getByLabel('Interactieve werfkaart', { exact: true });
  const propose = async (client: Page, key: string) => {
    await client.bringToFront();
    await map(client).getByRole('button', { name, exact: true }).press('Enter');
    await map(client).press(key);
    const save = client.getByRole('group', { name: 'Werfcanvas werkbalk' }).getByRole('button', { name: /^Opslaan/ });
    await expect(save).toBeEnabled();
    await save.click();
    const dialog = client.getByRole('dialog', { name: 'Verplaatsing plannen' });
    await expect(dialog).toBeVisible();
    await dialog.locator('input[type=datetime-local]').fill(due);
    await expect(dialog.getByRole('button', { name: 'Opslaan & toewijzen' })).toBeEnabled();
    return dialog;
  };
  const waitForSave = (client: Page) => client.waitForResponse(response => response.request().method() === 'PATCH'
    && new URL(response.url()).pathname.endsWith('/placements/' + boatId));
  try {
    for (const [index, client] of clients.entries()) {
      // The local transport pins each browser to a different real PHP process.
      // No request or response is intercepted or fabricated.
      await client.context().setExtraHTTPHeaders({ 'X-Yard-Test-Backend': String(index) });
      await client.context().addCookies([{ name: 'krek_session', value: encodeURIComponent(tokens[index]), url: target! }]);
      await client.bringToFront();
      await client.goto(target! + '/nl/admin/stalling/werfcanvas');
      await expect(map(client).getByRole('button')).toHaveCount(250, { timeout: 60000 });
    }
    const dialogs = [];
    for (const [index, client] of clients.entries()) dialogs.push(await propose(client, index ? 'ArrowRight' : 'ArrowLeft'));
    const pending = clients.map(waitForSave);
    const started = performance.now();
    progress('submitting both browser saves');
    await Promise.all(dialogs.map(dialog => dialog.getByRole('button', { name: 'Opslaan & toewijzen' }).click()));
    const responses = await Promise.all(pending);
    const bodies = await Promise.all(responses.map(response => response.json()));
    const statuses = responses.map(response => response.status());
    progress('save responses: ' + statuses.join(','));
    // Capture ownership before assertions so fixture cleanup also runs on failure.
    const winner = statuses.indexOf(200);
    if (winner >= 0) { ownedVersion = bodies[winner].version; ownedTask = bodies[winner].planned?.task_id; }
    expect(statuses.toSorted()).toEqual([200, 409]);
    expect(responses.map(response => response.headers()['x-yard-test-backend'])).toEqual(['0', '1']);
    const loser = 1 - winner;
    await clients[loser].bringToFront();
    const saved = bodies[winner];
    expect(saved.version).toBe(initial.version + 1);
    expect(saved.actual).toEqual(initial.actual);
    expect(bodies[loser].placement).toMatchObject({ version: saved.version, actual: initial.actual, planned: saved.planned });
    for (const index of [0, 1]) expect(await read(index)).toMatchObject({ version: saved.version, planned: saved.planned });
    await expect(dialogs[loser].getByText(new RegExp('Serverversie\\s*' + saved.version))).toBeVisible();
    await expect(dialogs[loser].getByRole('button', { name: 'Opslaan & toewijzen' })).toBeDisabled();
    await dialogs[loser].getByRole('button', { name: 'Annuleren', exact: true }).click();
    await expect(dialogs[loser]).toHaveCount(0);
    progress('conflicting draft discarded; reloading loser ' + loser);
    // Reload discards the stale draft and establishes the persisted version.
    await clients[loser].reload();
    await expect(map(clients[loser]).getByRole('button')).toHaveCount(250, { timeout: 60000 });
    progress('loser reloaded; proposing replan');
    const recovery = await propose(clients[loser], 'ArrowDown');
    const replannedResponse = waitForSave(clients[loser]);
    await recovery.getByRole('button', { name: 'Opslaan & toewijzen' }).click();
    const response = await replannedResponse;
    expect(response.status(), await response.text()).toBe(200);
    const replanned = await response.json();
    progress('replan saved');
    ownedVersion = replanned.version; ownedTask = replanned.planned.task_id;
    expect(replanned.version).toBe(saved.version + 1);
    expect(replanned.actual).toEqual(initial.actual);
    expect(replanned.planned.task_id).toBe(saved.planned.task_id);
    for (const [index, client] of clients.entries()) {
      await client.bringToFront();
      await client.reload();
      await expect(map(client).getByRole('button')).toHaveCount(250, { timeout: 60000 });
      expect(await read(index)).toMatchObject({ version: replanned.version, planned: replanned.planned });
    }
    const plan = await request.get(apis[0] + endpoint + '/daily-plan', { headers: headers(0), params: { date: due.slice(0, 10) } });
    expect(plan.status()).toBe(200);
    const jobs = (await plan.json()).jobs.filter((job: { boat_id: string; type: string }) => job.boat_id === boatId && job.type === 'yard_move');
    expect(jobs).toHaveLength(1);
    expect(jobs[0].id).toBe(ownedTask);
    await test.info().attach('real-browser-race.json', { contentType: 'application/json', body: JSON.stringify({
      statuses, backendProcesses: responses.map(response => response.headers()['x-yard-test-backend']),
      raceResponseMs: responses.map(response => response.request().timing().responseEnd),
      raceAndRecoveryMs: performance.now() - started, persistedVersion: replanned.version, jobs: jobs.length,
    }, null, 2) });
    progress('all persistence and job checks passed');
  } catch (error) {
    for (const [index, client] of clients.entries()) {
      await test.info().attach(`browser-client-${index}-failure.txt`, { contentType: 'text/plain',
        body: client.url() + '\n' + await client.locator('body').innerText({ timeout: 5000 }).catch(() => 'Page unavailable') });
    }
    throw error;
  } finally {
    try {
      if (ownedVersion && ownedTask) {
        const current = await read(0);
        if (current.version === ownedVersion && current.planned?.task_id === ownedTask) {
          const cleanup = await request.patch(apis[0] + endpoint + '/placements/' + boatId,
            { headers: headers(0), data: { operation: 'cancel_plan', version: current.version } });
          expect(cleanup.status()).toBe(200);
        }
      }
    } finally { await secondContext.close(); }
  }
});
