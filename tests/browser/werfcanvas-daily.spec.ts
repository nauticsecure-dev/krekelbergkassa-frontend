import { expect, test, type Page } from '@playwright/test';

// Intercepted UI regression. Persistence, permissions and delivery recovery are
// covered separately by YardCanvasTest against disposable SQLite databases.
async function workspace(page: Page, map?: () => object, revision?: () => string) {
  const origin = test.info().project.use.baseURL!;
  await page.context().addCookies([{ name: 'krek_session', value: 'synthetic-yard', url: origin }]);
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.origin !== origin) return route.abort();
    if (!url.pathname.startsWith('/api/')) return route.continue();
    const json = (value: unknown) => route.fulfill({ json: value });
    if (url.pathname.endsWith('/auth/me')) return json({ id: 'worker', email: 'yard@example.test', role: 'super_admin', name: 'Synthetic Planner', permissions: ['*'] });
    if (url.pathname.endsWith('/calendar/locations')) return json([]);
    if (url.pathname.endsWith('/yard-canvas/move-assignees')) return json([]);
    if (url.pathname.endsWith('/yard-canvas/revision')) return json({ revision: revision?.() ?? 'initial' });
    if (url.pathname.endsWith('/check') && url.pathname.includes('/yard-canvas/placements/')) {
      return json({ warnings: [], severity: 'green', requires_approval: false, details: [] });
    }
    if (url.pathname.endsWith('/yard-canvas/schedule-resources')) return json({ teams: [], equipment: [], shifts: [], leave: [] });
    if (url.pathname.endsWith('/calendar')) return json({ regular_hours: [], exceptions: [], lunch_block: null });
    if (url.pathname.endsWith('/daily-plan')) return json({
      date: url.searchParams.get('date'), timezone: 'Europe/Amsterdam', generated_at: '2026-11-11T08:00:00Z',
      jobs: ['yard_move', 'boat', 'appointment', 'work_order'].map((type, i) => ({
        id: `job-${i}`, type, boat_id: 'boat-1', boat: 'Synthetic Aurora', title: `Synthetic ${type}`,
        due_at: type === 'work_order' ? null : '2026-11-11T09:30:00+01:00', priority: 'normal', status: 'planned',
        assigned_to: 'Synthetic Worker', actual: { x: 10, y: 20 }, planned: null, photo_url: null,
      })),
    });
    if (url.pathname.endsWith('/yard-canvas') && map && url.searchParams.get('placed') === '1') return json(map());
    if (url.pathname.endsWith('/yard-canvas')) return json({ width: 120, height: 90, background: null,
      can_edit: false, can_plan: false, can_execute: false, can_view_daily_plan: true, can_manage_photos: false,
      boats: { data: [], current_page: 1, last_page: 1, total: 0 },
    });
    if (url.pathname.endsWith('/admin/tasks')) return json({ data: [{
      id: 'task-1', entity_type: 'boat', entity_id: 'boat-1', title: 'Synthetic inspection',
      status: 'open', priority: 'normal', assigned_to_user_id: 'worker',
    }], current_page: 1, last_page: 1, total: 1 });
    return json({ data: [], items: [], meta: { total: 0 }, cards: [] });
  });
}

test('office instructions refresh across clients and an offline draft stays unsaved on reconnect', async ({ page, browser }) => {
  await page.setViewportSize({ width: 1600, height: 950 });
  let version = 1;
  const mapResponse = () => ({
    width: 120, height: 90, background: null, can_edit: true, can_plan: true, can_execute: true,
    boats: { data: [{
      id: 'yard-reconnect', name: 'Reconnect Boat', length_cm: 600, width_cm: 240, statuses: {},
      placement: { actual: { x: 30, y: 20, scale: 1, rotation: 0 },
        planned: version > 1 ? { x: 50, y: 20, scale: 1, rotation: 0 } : null,
        previous: null, presence: 'arrived', version },
      move_job: version > 1 ? { due_at: '2026-11-12T08:00:00Z', state: 'assigned', instructions: 'Wacht op de kraan.' } : null,
    }], current_page: 1, last_page: 1, total: 1 },
  });
  const observer = await browser.newPage({ viewport: { width: 1600, height: 950 } });
  try {
    const selectBoat = async (client: Page) => {
      const boat = client.getByLabel('Interactieve werfkaart').getByRole('button', { name: 'Reconnect Boat', exact: true });
      await boat.focus();
      await boat.press('Enter');
    };
    await Promise.all([page, observer].map(async client => {
      await workspace(client, mapResponse, () => String(version));
      const baseline = client.waitForResponse(response => response.url().endsWith('/yard-canvas/revision'));
      await client.goto('/nl/admin/stalling/werfcanvas');
      await baseline;
      await selectBoat(client);
    }));
    let writes = 0;
    page.on('request', request => {
      if (request.method() === 'PATCH' && request.url().includes('/yard-canvas/placements/')) writes++;
    });
    await page.context().setOffline(true);
    await page.getByLabel('Interactieve werfkaart').press('ArrowRight');
    await expect(page.getByLabel('Plaatsingsconcept')).toBeVisible();
    version = 2;
    await expect(observer.getByText(/Geplande verplaatsing ·/).first()).toBeVisible({ timeout: 12000 });
    await page.context().setOffline(false);
    await expect(page.getByText('Wacht op de kraan.', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Plaatsingsconcept')).toBeVisible();
    await expect(page.getByRole('button', { name: /^Opslaan/ }).first()).toBeDisabled();
    expect(writes).toBe(0);
  } finally {
    await observer.close();
  }
});

test('arrival sends selected booking service, condition and dossier photo together', async ({ page }) => {
  await workspace(page);
  const arrivalBoat = { id: 'arrival-boat', name: 'Arrival Boat', statuses: {}, length_cm: 600, width_cm: 240 };
  let arrival: object | null = null;
  await page.route('**/yard-canvas?*', route => {
    const placed = new URL(route.request().url()).searchParams.get('placed');
    return route.fulfill({ json: { width: 120, height: 90, can_edit: true, background: null, boats: {
      data: placed === '1' ? [] : [{ ...arrivalBoat, placement: { actual: null, planned: null, previous: null,
        presence: arrival ? 'arrived' : null, version: arrival ? 1 : 0, arrival } }],
      current_page: 1, last_page: 1, total: placed === '1' ? 0 : 1,
    } } });
  });
  await page.route('**/arrival-context', route => route.fulfill({ json: {
    appointments: [{ id: 'booking-1', appointment_date: '2026-11-12', start_time: '09:00', service_codes: ['kranen', 'afspuiten'] }],
    photos: [{ id: 'arrival-photo', name: 'inspection.jpg', url: null }],
  } }));
  await page.route('**/placements/arrival-boat', route => {
    const request = route.request().postDataJSON();
    arrival = request.arrival;
    expect(request).toEqual({ operation: 'arrive', version: 0, confirmed: true, arrival: {
      appointment_id: 'booking-1', service_code: 'afspuiten', condition: 'Kras aan bakboord.', photo_ids: ['arrival-photo'],
    } });
    return route.fulfill({ json: { presence: 'arrived', version: 1, arrival } });
  });
  await page.goto('/nl/admin/stalling/werfcanvas');
  await page.getByRole('button', { name: /Arrival Boat/ }).first().click();
  await page.getByRole('button', { name: 'Aankomst bevestigen' }).click();
  const form = page.getByRole('form', { name: 'Aankomst registreren' });
  await form.getByLabel('Afspraak', { exact: true }).selectOption('booking-1');
  await form.getByLabel('Dienst', { exact: true }).selectOption('afspuiten');
  await form.getByLabel('Conditierapport').fill('Kras aan bakboord.');
  await form.getByLabel('inspection.jpg').check();
  await form.getByLabel('Boot fysiek aangekomen').check();
  await form.getByRole('button', { name: 'Aankomst opslaan' }).click();
  await expect(page.getByText('Kras aan bakboord.', { exact: true })).toBeVisible();
});

test('persisted boat lock blocks keyboard nudging after reload on a populated map', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 950 });
  let locked = true;
  await workspace(page, () => ({
    width: 120, height: 90, background: null, can_edit: true, can_plan: true, can_execute: true,
    boats: { data: Array.from({ length: 250 }, (_, i) => ({
      id: 'inventory-' + i, name: 'Inventory Boat ' + i, length_cm: 600, width_cm: 240, statuses: {},
      placement: { actual: { x: 5 + 4.4 * (i % 25), y: 5 + 8 * Math.floor(i / 25), scale: 1, rotation: 0 },
        planned: null, previous: null, presence: 'arrived', version: 1, interaction_locked: i === 0 && locked },
    })), current_page: 1, last_page: 1, total: 250 },
  }));
  await page.goto('/nl/admin/stalling/werfcanvas');
  const map = page.getByLabel('Interactieve werfkaart');
  const boat = map.getByRole('button', { name: 'Inventory Boat 0', exact: true });
  await expect(map.getByRole('button', { name: /^Inventory Boat / })).toHaveCount(250);
  const undo = page.locator('button[aria-label="Ongedaan maken"]');
  for (const reload of [false, true]) {
    if (reload) await page.reload();
    await boat.focus();
    await boat.press('Enter');
    await map.press('ArrowRight');
    await expect(undo).toBeDisabled();
  }
  locked = false;
  await page.reload();
  await boat.focus();
  await boat.press('Enter');
  await map.press('ArrowRight');
  await expect(undo).toBeEnabled();
  await page.keyboard.press('Control+z');
  await expect(undo).toBeDisabled();
});

test('two-finger touch zoom changes the viewport without editing a boat', async ({ page }) => {
  await workspace(page);
  await page.goto('/nl/admin/stalling/werfcanvas');
  const map = page.getByLabel('Interactieve werfkaart');
  const bounds = await map.boundingBox();
  expect(bounds).not.toBeNull();
  const x = Math.round(bounds!.x + bounds!.width / 2);
  const y = Math.round(bounds!.y + bounds!.height / 2);
  const touch = await page.context().newCDPSession(page);
  await touch.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 2 });
  await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x - 25, y, id: 1 }] });
  await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x - 25, y, id: 1 }, { x: x + 25, y, id: 2 }] });
  await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x - 60, y, id: 1 }, { x: x + 60, y, id: 2 }] });
  await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect(page.getByLabel('Zoomniveau')).not.toHaveText('100%');
  await expect(page.getByLabel('Plaatsingsconcept')).toHaveCount(0);
});

test('daily calendar includes every job source and date navigation on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await workspace(page);
  await page.goto('/nl/admin/kalender');
  await expect(page.getByRole('link', { name: /Synthetic Aurora · Synthetic appointment/ })).toHaveAttribute('href', /afspraken\?appointment_id=job-2/);
  await expect(page.getByRole('link', { name: /Synthetic Aurora · Synthetic work_order/ })).toHaveAttribute('href', /werkorders\/job-3/);
  await expect(page.getByRole('link', { name: /Synthetic Aurora · Synthetic boat/ })).toHaveAttribute('href', /taken\?task_id=job-1/);
  const date = page.getByLabel('Datum werfplanning');
  await date.fill('2026-12-28');
  await page.getByRole('button', { name: 'Een week verder', exact: true }).click();
  await expect(date).toHaveValue('2027-01-04');
});

test('print snapshot includes appointments and ordinary tasks', async ({ page }) => {
  await page.setViewportSize({ width: 1680, height: 1000 });
  await workspace(page);
  await page.goto('/nl/admin/stalling/werfcanvas');
  await page.getByRole('group', { name: 'Werfcanvas werkbalk' }).locator('summary[title="Kaartacties"]:visible').click();
  await page.getByRole('button', { name: 'Dagplanning afdrukken', exact: true }).click();
  const snapshot = page.locator('[data-yard-print]');
  await expect(snapshot.locator('article')).toHaveCount(4);
  await expect(snapshot.locator('[data-boat-id="boat-1"]')).toHaveCount(4);
  await page.evaluate(() => { window.print = () => { document.body.dataset.printed = 'true'; }; });
  await page.getByRole('button', { name: 'Afdrukken / PDF', exact: true }).click();
  await expect(page.locator('body')).toHaveAttribute('data-printed', 'true');
  await page.emulateMedia({ media: 'print' });
  await expect(snapshot.getByText('Synthetic Aurora · Synthetic appointment', { exact: true })).toBeVisible();
  await page.pdf({ path: test.info().outputPath('daily-plan.pdf'), format: 'A4' });
});

test('ordinary assigned boat task exposes categorized photo upload', async ({ page }) => {
  await workspace(page);
  await page.goto('/nl/admin/taken');
  await page.getByRole('button', { name: 'Foto toevoegen', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: /Foto toevoegen/ });
  await dialog.locator('select[name=folder]').selectOption('inspection');
  await dialog.locator('input[type=file]').setInputFiles({ name: 'condition.png', mimeType: 'image/png', buffer: Buffer.from('synthetic-ui-fixture') });
  const upload = page.waitForRequest(request => request.method() === 'POST' && request.url().includes('/boats/boat-1/tasks/task-1/photos'));
  await dialog.getByRole('button', { name: 'Uploaden', exact: true }).click();
  expect((await upload).postData()).toContain('inspection');
  await expect(dialog.getByRole('status')).toContainText('Foto toegevoegd');
});
