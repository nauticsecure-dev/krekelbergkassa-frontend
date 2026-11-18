import { expect, test, type Locator, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const canvasPath = '/nl/admin/stalling/werfcanvas';
const mapLabel = 'Interactieve werfkaart';
const boatName = 'Synthetic Aurora';
const position = { x: 60, y: 45, scale: 1, rotation: 0 };
const placement = { actual: position, planned: null, previous: null, presence: 'arrived', version: 1 };
const sampleBoat = {
  id: 'boat-1', name: boatName, registration_number: 'WC-001', length_cm: 900, width_cm: 300,
  statuses: {}, placement,
};

function yard(boats: object[] = [sampleBoat]) {
  return {
    width: 120, height: 90, background: null, can_edit: true, can_plan: true, can_execute: true,
    boats: { data: boats, current_page: 1, last_page: 1, total: boats.length },
  };
}

async function openCanvas(page: Page) {
  await page.goto(canvasPath);
  const map = page.getByLabel(mapLabel);
  await expect(map).toBeVisible();
  return map;
}

async function selectBoat(map: Locator) {
  const boat = map.getByRole('button', { name: boatName, exact: true });
  await boat.press('Enter');
  await expect(boat).toHaveAttribute('aria-pressed', 'true');
  return boat;
}

function confirmNext(page: Page, message: string, accept: boolean) {
  const dialog = page.waitForEvent('dialog').then(async dialog => {
    await (accept ? dialog.accept() : dialog.dismiss());
    expect(dialog.type()).toBe('confirm');
    expect(dialog.message()).toBe(message);
  });
  return dialog;
}

// Intercepted UI regression. Persistence, permissions and delivery recovery are
// covered separately by YardCanvasTest against disposable SQLite databases.
async function workspace(page: Page, map?: (url: URL) => object, revision?: () => string) {
  const origin = new URL(test.info().project.use.baseURL!).origin;
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
    if (url.pathname.endsWith('/yard-canvas') && map && url.searchParams.get('placed') === '1') return json(map(url));
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
  let locked = false;
  let version = 1;
  await workspace(page, () => ({
    width: 120, height: 90, background: null, can_edit: true, can_plan: true, can_execute: true,
    boats: { data: Array.from({ length: 250 }, (_, i) => ({
      id: 'inventory-' + i, name: 'Inventory Boat ' + i, length_cm: 600, width_cm: 240, statuses: {},
      placement: { actual: { x: 5 + 4.4 * (i % 25), y: 5 + 8 * Math.floor(i / 25), scale: 1, rotation: 0 },
        planned: null, previous: null, presence: 'arrived', version: i === 0 ? version : 1, interaction_locked: i === 0 && locked },
    })), current_page: 1, last_page: 1, total: 250 },
  }));
  const changes: object[] = [];
  await page.route('**/placements/inventory-0/lock', route => {
    const update = route.request().postDataJSON();
    expect(route.request().method()).toBe('PATCH');
    expect(update).toEqual({ version, locked: !locked });
    changes.push(update);
    locked = update.locked;
    return route.fulfill({ json: {
      ...placement, actual: { ...position, x: 5, y: 5 }, version: ++version, interaction_locked: locked,
    } });
  });
  await page.goto('/nl/admin/stalling/werfcanvas');
  const map = page.getByLabel('Interactieve werfkaart');
  const boat = map.getByRole('button', { name: 'Inventory Boat 0', exact: true });
  await expect(map.getByRole('button', { name: /^Inventory Boat / })).toHaveCount(250);
  const undo = page.locator('button[aria-label="Ongedaan maken"]');
  const boatActions = page.getByLabel('Acties voor Inventory Boat 0', { exact: true });
  async function toggleLock(label: string) {
    await boat.click({ button: 'right' });
    await boatActions.getByRole('button', { name: label, exact: true }).click();
    await expect(boatActions).toHaveCount(0);
    await page.reload();
  }
  await toggleLock('Deze boot vergrendelen');
  for (const reload of [false, true]) {
    if (reload) await page.reload();
    await boat.focus();
    await boat.press('Enter');
    await map.press('ArrowRight');
    await expect(undo).toBeDisabled();
  }
  await map.press('0');
  await toggleLock('Deze boot ontgrendelen');
  await boat.focus();
  await boat.press('Enter');
  await map.press('ArrowRight');
  await expect(undo).toBeEnabled();
  await page.keyboard.press('Control+z');
  await expect(undo).toBeDisabled();
  expect(changes).toEqual([{ version: 1, locked: true }, { version: 2, locked: false }]);
});

test('canvas shortcuts scope commands and preserve the draft when leaving fullscreen', async ({ page }) => {
  await page.setViewportSize({ width: 1680, height: 1000 });
  await page.addInitScript(() => {
    Element.prototype.requestFullscreen = () => Promise.reject(new DOMException('Denied', 'NotAllowedError'));
  });
  await workspace(page, () => yard());
  const map = await openCanvas(page);
  const boat = await selectBoat(map);
  const draft = page.getByLabel('Plaatsingsconcept');
  const zoom = page.getByLabel('Zoomniveau');
  await expect(zoom).toHaveText('250%');
  await map.press('0');
  await expect(zoom).toHaveText('100%');
  await map.press('Equal');
  await expect(zoom).toHaveText('125%');
  await map.press('Minus');
  await expect(zoom).toHaveText('100%');
  await map.press('?');
  await expect(page.getByRole('button', { name: 'Sneltoetsen sluiten' })).toBeVisible();
  await map.press('Escape');
  await expect(page.getByRole('button', { name: 'Sneltoetsen sluiten' })).toHaveCount(0);

  const view = map.locator(':scope > g');
  const original = await view.getAttribute('transform');
  const point = await mapPoint(map, position.x, position.y);
  await map.focus();
  await page.mouse.move(point.x, point.y);
  await page.keyboard.down('Space');
  await page.mouse.down();
  await page.mouse.move(point.x + 45, point.y + 30, { steps: 5 });
  await page.mouse.up();
  await page.keyboard.up('Space');
  await expect(view).not.toHaveAttribute('transform', original!);
  await expect(draft).toHaveCount(0);
  await map.press('0');

  for (const [key, destination] of [
    ['ArrowRight', 'translate(60.1 45)'], ['Shift+ArrowDown', 'translate(60.1 46)'],
    ['ArrowLeft', 'translate(60 46)'], ['Shift+ArrowUp', 'translate(60 45)'],
  ]) {
    await map.press(key);
    await expect(map.locator(`path[transform^="${destination}"]`)).toHaveCount(1);
  }
  await map.press('Control+z');
  await expect(map.locator('path[transform^="translate(60 46)"]')).toHaveCount(1);
  await map.press('Control+Shift+z');
  await expect(map.locator('path[transform^="translate(60 45)"]')).toHaveCount(1);
  await map.press('Meta+z');
  await expect(map.locator('path[transform^="translate(60 46)"]')).toHaveCount(1);
  await map.press('Control+y');
  await expect(map.locator('path[transform^="translate(60 45)"]')).toHaveCount(1);

  const search = page.getByRole('textbox', { name: /Zoek boot/ });
  const observed = await search.evaluate(element => ['z', 's', 'Delete', 'ArrowRight'].map(key => (
    element.dispatchEvent(new KeyboardEvent('keydown', { key, ctrlKey: key.length === 1, bubbles: true, cancelable: true }))
  )));
  expect(observed).toEqual([true, true, true, true]);
  const toolbar = page.getByRole('group', { name: 'Werfcanvas werkbalk' });
  const status = toolbar.getByRole('combobox', { name: 'Status', exact: true });
  await status.selectOption('present');
  await map.press('Equal');
  await toolbar.getByRole('button', { name: 'Volledig scherm', exact: true }).click();
  await expect(page.getByRole('heading', { name: /Operationele werfplanning/ })).toBeHidden();
  await expect(toolbar.getByRole('button', { name: 'Volledig scherm sluiten' })).toBeFocused();
  await map.press('Escape');
  await expect(page.getByRole('heading', { name: /Operationele werfplanning/ })).toBeVisible();
  await expect(status).toHaveValue('present');
  await expect(zoom).toHaveText('125%');
  await expect(boat).toHaveAttribute('aria-pressed', 'true');
  await expect(draft).toBeVisible();
  await map.press('Escape');
  await expect(draft).toHaveCount(0);
  await map.press('Escape');
  await expect(boat).toHaveAttribute('aria-pressed', 'false');
});

test('keyboard removal asks for confirmation and leaves no undo for a committed removal', async ({ page }) => {
  let removed = false;
  let writes = 0;
  await workspace(page, () => yard(removed ? [] : [sampleBoat]));
  await page.route('**/placements/boat-1', route => {
    writes++;
    expect(route.request().method()).toBe('PATCH');
    expect(route.request().postDataJSON()).toMatchObject({ operation: 'remove', version: 1 });
    removed = true;
    return route.fulfill({ json: { ...placement, actual: null, previous: position, version: 2 } });
  });
  const map = await openCanvas(page);
  const boat = await selectBoat(map);
  await Promise.all([
    confirmNext(page, 'Boot van de werfkaart verwijderen?', false), map.press('Delete'),
  ]);
  await expect(boat).toBeVisible();
  expect(writes).toBe(0);
  await Promise.all([
    confirmNext(page, 'Boot van de werfkaart verwijderen?', true), map.press('Backspace'),
  ]);
  await expect(boat).toHaveCount(0);
  await map.press('Control+z');
  await expect(boat).toHaveCount(0);
  await expect(page.locator('button[aria-label="Ongedaan maken"]')).toBeDisabled();
  expect(writes).toBe(1);
});

test('shift-click proposes a group move and Escape closes desktop boat actions', async ({ page }) => {
  await page.setViewportSize({ width: 1680, height: 1000 });
  const second = {
    ...sampleBoat, id: 'boat-2', name: 'Synthetic Vega',
    placement: { ...placement, actual: { ...position, x: 78 } },
  };
  await workspace(page, () => yard([sampleBoat, second]));
  const map = await openCanvas(page);
  const firstBoat = await selectBoat(map);
  await map.press('0');
  const secondBoat = map.getByRole('button', { name: second.name });
  await secondBoat.click({ modifiers: ['Shift'] });
  await expect(firstBoat).toHaveAttribute('aria-pressed', 'true');
  await expect(secondBoat).toHaveAttribute('aria-pressed', 'true');
  const toolbar = page.getByRole('group', { name: 'Werfcanvas werkbalk' });
  await toolbar.locator('summary[title="Kaartacties"]:visible').click();
  await toolbar.getByRole('button', { name: 'Groepsverplaatsing voorstellen' }).click();
  await map.press('Shift+ArrowRight');
  await expect(map.locator('path[transform^="translate(61 45)"]')).toHaveCount(1);
  await expect(map.locator('path[transform^="translate(79 45)"]')).toHaveCount(1);
  await map.press('Escape');
  await expect(page.getByLabel('Plaatsingsconcept')).toHaveCount(0);
  await secondBoat.click({ button: 'right' });
  const menu = page.getByLabel(`Acties voor ${second.name}`);
  await expect(menu.getByRole('link', { name: 'Bekijk boot' })).toHaveAttribute('href', /\/boten\/boat-2$/);
  await map.press('Escape');
  await expect(menu).toHaveCount(0);
});

async function mapPoint(map: Locator, x: number, y: number) {
  return map.locator(':scope > g').evaluate((layer: SVGGElement, { x, y }) => {
    const point = new DOMPoint(x, y).matrixTransform(layer.getScreenCTM()!);
    return { x: Math.round(point.x), y: Math.round(point.y) };
  }, { x, y });
}

async function touchInput(page: Page) {
  const touch = await page.context().newCDPSession(page);
  await touch.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 2 });
  return (type: 'touchStart' | 'touchMove' | 'touchEnd' | 'touchCancel', ...points: { x: number; y: number }[]) =>
    touch.send('Input.dispatchTouchEvent', { type, touchPoints: points.map((point, id) => ({ ...point, id })) });
}

test('touch pans the map, selects a boat, and pinches without producing a placement', async ({ page }) => {
  await page.setViewportSize({ width: 820, height: 1000 });
  await workspace(page, () => yard());
  const writes: string[] = [];
  await page.route('**/placements/boat-1', route => {
    writes.push(route.request().method());
    return route.abort();
  });
  const map = await openCanvas(page);
  const boat = map.getByRole('button', { name: boatName, exact: true });
  const view = map.locator(':scope > g');
  const original = await view.getAttribute('transform');
  const send = await touchInput(page);
  const empty = await mapPoint(map, 36, 33);
  await send('touchStart', empty);
  await send('touchMove', { x: empty.x + 50, y: empty.y + 25 });
  await send('touchEnd');
  await expect(view).not.toHaveAttribute('transform', original!);
  await expect(boat).toHaveAttribute('aria-pressed', 'false');

  const center = await mapPoint(map, position.x, position.y);
  await send('touchStart', center);
  await send('touchEnd');
  await expect(boat).toHaveAttribute('aria-pressed', 'true');
  const actions = page.getByRole('button', { name: 'Acties voor geselecteerde boot' });
  await actions.click();
  const menu = page.getByLabel(`Acties voor ${boatName}`, { exact: true });
  await expect(menu.getByRole('button', { name: 'Deze boot vergrendelen' })).toBeVisible();
  await menu.getByRole('button', { name: 'Bootacties sluiten' }).click();

  await send('touchStart', center);
  const dragged = { x: center.x - 20, y: center.y };
  await send('touchMove', dragged);
  await expect(page.getByLabel('Plaatsingsconcept')).toBeVisible();
  await send('touchStart', dragged, { x: center.x + 40, y: center.y });
  await expect(page.getByLabel('Plaatsingsconcept')).toHaveCount(0);
  await send('touchMove', { x: center.x - 35, y: center.y }, { x: center.x + 90, y: center.y });
  await send('touchEnd');
  await expect(page.getByLabel('Zoomniveau')).not.toHaveText('100%');
  await expect(page.getByLabel('Plaatsingsconcept')).toHaveCount(0);
  const movedCenter = await mapPoint(map, position.x, position.y);
  await send('touchStart', movedCenter);
  await send('touchMove', { x: movedCenter.x + 45, y: movedCenter.y + 30 });
  await expect(page.getByLabel('Plaatsingsconcept')).toBeVisible();
  await send('touchCancel');
  await expect(page.getByLabel('Plaatsingsconcept')).toHaveCount(0);
  const move = page.getByRole('dialog', { name: 'Verplaatsing plannen' });
  await expect(move).toHaveCount(0);
  await page.route('**/placements/boat-1/move-options*', route =>
    route.fulfill({ json: { choices: { next: '2026-11-20T09:00:00+01:00' } } }));
  await send('touchStart', movedCenter);
  await send('touchMove', { x: movedCenter.x + 45, y: movedCenter.y + 30 });
  await send('touchEnd');
  await expect(move).toBeVisible();
  await move.getByRole('button', { name: 'Annuleren' }).click();
  await expect(page.getByLabel('Plaatsingsconcept')).toHaveCount(0);
  expect(writes).toEqual([]);
});

for (const status of [409, 503]) {
  test(`touch placement survives HTTP ${status} and recovers after leaving the canvas`, async ({ page }) => {
    await page.setViewportSize({ width: 820, height: 1000 });
    const due = '2026-11-20T09:00:00+01:00';
    const conflict = status === 409;
    const error = conflict ? 'De plaatsing is gewijzigd.' : 'Werf tijdelijk onbereikbaar.';
    const serverPosition = { ...position, x: 62 };
    let current = { ...placement, planned: null as typeof position | null };
    const writes: { operation: string; position: typeof position; version: number }[] = [];
    const mapResponse = () => yard([{ ...sampleBoat, placement: current }]);
    await workspace(page, mapResponse);
    await page.route(url => url.pathname.endsWith('/yard-canvas') && url.searchParams.get('search') === sampleBoat.id,
      route => route.fulfill({ json: mapResponse() }));
    await page.route('**/placements/boat-1/move-options*', route =>
      route.fulfill({ json: { choices: { next: due } } }));
    await page.route('**/placements/boat-1', route => {
      expect(route.request().method()).toBe('PATCH');
      const payload = route.request().postDataJSON();
      writes.push(payload);
      if (writes.length === 1) {
        if (conflict) current = { ...current, version: 2, actual: serverPosition };
        return route.fulfill({ status, json: { message: error, ...(conflict && { placement: current }) } });
      }
      current = { ...current, planned: payload.position, version: 2 };
      return route.fulfill({ json: current });
    });

    // Compile the destination before measuring navigation with an unsaved touch draft.
    expect((await page.goto('/nl/admin/taken', { timeout: 60_000 }))?.ok()).toBe(true);
    const map = await openCanvas(page);
    const send = await touchInput(page);
    const boat = map.getByRole('button', { name: boatName, exact: true });
    const center = await mapPoint(map, position.x, position.y);
    await send('touchStart', center);
    await send('touchEnd');
    await expect(boat).toHaveAttribute('aria-pressed', 'true');
    await send('touchStart', center);
    await send('touchMove', { x: center.x + 45, y: center.y + 30 });
    await send('touchEnd');

    const dialog = page.getByRole('dialog', { name: 'Verplaatsing plannen' });
    const submit = dialog.getByRole('button', { name: 'Opslaan & toewijzen' });
    const draft = page.getByLabel('Plaatsingsconcept');
    const destination = map.locator('g[stroke-dasharray=".7 .45"] > path');
    const proposal = dialog.getByText(/→/);
    await expect(dialog).toBeVisible();
    const originalProposal = await proposal.innerText();
    const draftTransform = await destination.getAttribute('transform');
    expect(draftTransform).toBeTruthy();
    expect(writes).toHaveLength(0);
    await submit.click();
    await expect(dialog.getByRole('alert')).toContainText(error);
    await expect(proposal).toHaveText(originalProposal);
    expect(writes).toHaveLength(1);
    expect(writes[0]).toMatchObject({ operation: 'plan', version: 1, due_at: due, idempotency_key: expect.any(String) });
    expect(writes[0].position.x).toBeGreaterThan(position.x);
    expect(writes[0].position.y).toBeGreaterThan(position.y);
    if (conflict) {
      await expect(dialog.getByText(/Serverversie\s*2/)).toBeVisible();
      await expect(submit).toBeDisabled();
    }

    await dialog.getByRole('button', { name: 'Positie aanpassen' }).click();
    const tasks = page.getByRole('navigation', { name: 'Werfweergaven' }).getByRole('link', { name: 'Taken' });
    const warning = 'Niet-opgeslagen wijzigingen verlaten?';
    await Promise.all([confirmNext(page, warning, false), tasks.click()]);
    await expect(page).toHaveURL(new RegExp(canvasPath + '$'));
    await expect(draft).toBeVisible();
    await expect(destination).toHaveAttribute('transform', draftTransform!);
    await expect.poll(() => page.evaluate(() => sessionStorage.getItem('werfcanvas.draft.worker')))
      .toContain(String(writes[0].position.x));
    await Promise.all([confirmNext(page, warning, true), tasks.click()]);
    await expect(page).toHaveURL(/\/nl\/admin\/taken$/);
    await page.goBack();
    await expect(page).toHaveURL(new RegExp(canvasPath + '$'));
    await expect(draft).toHaveCount(0);
    await page.getByRole('button', { name: 'Concept vergelijken en herstellen' }).click();
    await expect(draft).toBeVisible();
    await expect(destination).toHaveAttribute('transform', draftTransform!);
    expect(writes).toHaveLength(1);

    const save = page.getByRole('group', { name: 'Werfcanvas werkbalk' }).getByRole('button', { name: /^Opslaan/ });
    if (conflict) {
      await expect(page.getByText(/Serverversie\s*2/)).toBeVisible();
      await expect(save).toBeDisabled();
    } else {
      await save.click();
      await expect(proposal).toHaveText(originalProposal);
      await submit.click();
      await expect(page.getByRole('status').filter({ hasText: 'Verplaatsing ingepland.' })).toBeVisible();
      await expect(draft).toHaveCount(0);
      expect(writes).toHaveLength(2);
      expect(writes[1]).toMatchObject({ operation: 'plan', version: 1, position: writes[0].position });
    }
  });
}

test('both zoom controls are usable from Kaartacties on a phone-width viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await workspace(page, () => yard());
  const map = await openCanvas(page);
  const toolbar = page.getByRole('group', { name: 'Werfcanvas werkbalk' });
  await toolbar.locator('summary[title="Meer filters en kaartbediening"]').click();
  await toolbar.locator('summary[title="Kaartacties"]:visible').click();
  const layer = map.locator(':scope > g');
  const original = await layer.getAttribute('transform');
  await toolbar.getByRole('button', { name: 'Inzoomen', exact: true }).click();
  await expect(layer).not.toHaveAttribute('transform', original!);
  await toolbar.getByRole('button', { name: 'Uitzoomen', exact: true }).click();
  await expect(layer).toHaveAttribute('transform', original!);
});

test('read-only touch actions allow inspection without exposing placement edits', async ({ page }) => {
  await page.setViewportSize({ width: 820, height: 1000 });
  await workspace(page, () => ({ ...yard(), can_edit: false, can_plan: false }));
  await page.route('**/auth/me', route => route.fulfill({ json: {
    id: 'viewer', email: 'viewer@example.test', role: 'staff', name: 'Yard Viewer', permissions: ['stalling.view'],
  } }));
  const map = await openCanvas(page);
  const boat = map.getByRole('button', { name: boatName, exact: true });
  const touch = await page.context().newCDPSession(page);
  await touch.send('Emulation.setTouchEmulationEnabled', { enabled: true });
  const center = await mapPoint(map, position.x, position.y);
  await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [center] });
  await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: center.x + 45, y: center.y }] });
  await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect(boat).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByLabel('Plaatsingsconcept')).toHaveCount(0);
  await page.getByRole('button', { name: 'Acties voor geselecteerde boot' }).click();
  const menu = page.getByLabel(`Acties voor ${boatName}`, { exact: true });
  await expect(menu.getByRole('link', { name: 'Bekijk boot' })).toBeVisible();
  await expect(menu.getByRole('button', { name: /vergrendelen|verplaatsen|verplaatsing plannen|verwijder/i })).toHaveCount(0);
});

test('a draft guards tabs, links and document unload', async ({ page }) => {
  await workspace(page, () => yard());
  await page.route(url => url.pathname.endsWith('/yard-canvas') && url.searchParams.get('search') === sampleBoat.id,
    route => route.fulfill({ json: yard() }));
  const map = await openCanvas(page);
  await selectBoat(map);
  await map.press('ArrowRight');
  const draft = page.getByLabel('Plaatsingsconcept');
  const views = page.getByRole('navigation', { name: 'Werfweergaven' });
  const boatList = views.getByRole('button', { name: 'Botenlijst' });
  const tasks = views.getByRole('link', { name: 'Taken' });
  const warning = 'Niet-opgeslagen wijzigingen verlaten?';
  await expect(draft).toBeVisible();
  const unloadWasPrevented = () => page.evaluate(() =>
    !window.dispatchEvent(new Event('beforeunload', { cancelable: true })));
  expect(await unloadWasPrevented()).toBe(true);
  await Promise.all([confirmNext(page, warning, false), boatList.click()]);
  await expect(boatList).toHaveAttribute('aria-pressed', 'false');
  await Promise.all([confirmNext(page, warning, false), tasks.click()]);
  await expect(page).toHaveURL(new RegExp(canvasPath + '$'));
  await expect(draft).toBeVisible();
  await Promise.all([confirmNext(page, warning, true), boatList.click()]);
  await expect(boatList).toHaveAttribute('aria-pressed', 'true');
  await expect(map).toHaveCount(0);
  await Promise.all([confirmNext(page, warning, true), views.getByRole('button', { name: 'Werfcanvas' }).click()]);
  await expect(draft).toBeVisible();
  await map.press('Escape');
  await expect(draft).toHaveCount(0);
  expect(await unloadWasPrevented()).toBe(false);
  await selectBoat(map);
  await map.press('ArrowRight');
  await expect(draft).toBeVisible();
  await expect.poll(() => page.evaluate(() => sessionStorage.getItem('werfcanvas.draft.worker'))).toContain('60.1');
  await Promise.all([confirmNext(page, warning, true), tasks.click()]);
  await expect(page).toHaveURL(/\/nl\/admin\/taken$/);
  await page.goBack();
  await expect(page).toHaveURL(new RegExp(canvasPath + '$'));
  await expect(draft).toHaveCount(0);
  await page.getByRole('button', { name: 'Concept vergelijken en herstellen' }).click();
  await expect(draft).toBeVisible();
  await expect(map.locator('path[transform^="translate(60.1 45)"]')).toHaveCount(1);
});

test('a failed map load and a failed search each recover through their retry action', async ({ page }) => {
  const error = 'Werf tijdelijk onbereikbaar.';
  let mapAvailable = false;
  let searchAvailable = false;
  await workspace(page);
  await page.route(url => url.pathname.endsWith('/yard-canvas') &&
    (url.searchParams.get('placed') === '1' || url.searchParams.has('search')), route => {
    const url = new URL(route.request().url());
    const available = url.searchParams.has('search') ? searchAvailable : mapAvailable;
    return available ? route.fulfill({ json: yard() }) : route.fulfill({ status: 503, json: { message: error } });
  });
  await page.goto(canvasPath);
  const map = page.getByLabel(mapLabel);
  const alert = page.getByRole('alert').filter({ hasText: error });
  await expect(alert).toBeVisible();
  await expect(map).toHaveCount(0);
  mapAvailable = true;
  await alert.getByRole('button', { name: 'Vernieuwen' }).click();
  await expect(map).toBeVisible();
  await page.getByRole('textbox', { name: /Zoek boot/ }).fill('WC-001');
  const results = page.getByLabel('Zoekresultaten');
  const searchAlert = results.getByRole('alert');
  await expect(searchAlert).toContainText(error);
  searchAvailable = true;
  await searchAlert.getByRole('button', { name: 'Opnieuw proberen' }).click();
  await results.getByRole('button', { name: /Synthetic Aurora/ }).click();
  await expect(map.getByRole('button', { name: boatName })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByLabel('Zoomniveau')).toHaveText('250%');
});

for (const failure of [503, 409]) {
  test(`keyboard save preserves the draft after HTTP ${failure} and handles recovery`, async ({ page }) => {
    const due = '2026-11-20T09:00:00+01:00';
    const serverPlacement = {
      ...placement, version: 2, actual: { ...position, x: 62 },
      assignment: { state: 'assigned', instructions: 'Wacht op de kraan.', due_at: due },
    };
    let current: object = placement;
    const writes: object[] = [];
    await workspace(page, () => yard([{ ...sampleBoat, placement: current }]));
    await page.route('**/placements/boat-1/move-options*', route => route.fulfill({ json: { choices: { next: due } } }));
    await page.route('**/placements/boat-1', route => {
      const payload = route.request().postDataJSON();
      writes.push(payload);
      if (writes.length === 1) {
        if (failure === 409) current = serverPlacement;
        return route.fulfill({ status: failure, json: {
          message: failure === 409 ? 'De plaatsing is gewijzigd.' : 'Werf tijdelijk onbereikbaar.',
          ...(failure === 409 && { placement: serverPlacement }),
        } });
      }
      current = { ...placement, planned: payload.position, version: 2 };
      return route.fulfill({ json: current });
    });
    const map = await openCanvas(page);
    await selectBoat(map);
    await map.press('ArrowRight');
    await map.press('Control+s');
    const dialog = page.getByRole('dialog', { name: 'Verplaatsing plannen' });
    const submit = dialog.getByRole('button', { name: 'Opslaan & toewijzen' });
    await expect(dialog).toBeVisible();
    expect(writes).toHaveLength(0);
    const proposal = dialog.getByText(/→/);
    const originalProposal = await proposal.innerText();
    await submit.click();
    await expect(dialog.getByRole('alert')).toContainText(failure === 409 ? 'De plaatsing is gewijzigd.' : 'Werf tijdelijk onbereikbaar.');
    await expect(proposal).toHaveText(originalProposal);
    expect(writes[0]).toMatchObject({
      operation: 'plan', version: 1, due_at: due, position: { ...position, x: 60.1 },
      idempotency_key: expect.any(String),
    });
    if (failure === 503) {
      await submit.click();
      await expect(dialog).toHaveCount(0);
      await expect(page.getByRole('status').filter({ hasText: 'Verplaatsing ingepland.' })).toBeVisible();
      await map.press('Control+z');
      await expect(page.getByLabel('Plaatsingsconcept')).toHaveCount(0);
      expect(writes).toEqual([writes[0], writes[0]]);
    } else {
      await expect(dialog.getByText(/Serverversie\s*2/)).toBeVisible();
      await expect(dialog.getByText('Wacht op de kraan.', { exact: true })).toBeVisible();
      await expect(submit).toBeDisabled();
      await dialog.getByRole('button', { name: 'Positie aanpassen' }).click();
      const refresh = page.getByRole('alert').getByRole('button', { name: 'Vernieuwen' });
      const warning = 'Concept wissen en kaart vernieuwen?';
      await Promise.all([confirmNext(page, warning, false), refresh.click()]);
      await expect(page.getByLabel('Plaatsingsconcept')).toBeVisible();
      await Promise.all([confirmNext(page, warning, true), refresh.click()]);
      await expect(page.getByLabel('Plaatsingsconcept')).toHaveCount(0);
      await expect(map.locator('g[transform="translate(62 45)"]').getByRole('button', { name: boatName })).toBeVisible();
      expect(writes).toHaveLength(1);
    }
  });
}

test('250-boat photographic map meets load, zoom, search and concurrent planning budgets', async ({ page, browser }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1680, height: 1000 });
  // Warm the Next.js route compilation in a separate browser context.
  const warmup = await page.context().browser()!.newPage();
  try {
    await workspace(warmup, () => yard());
    await openCanvas(warmup);
  } finally {
    await warmup.close();
  }

  // Local photographs exercise raster fetch, decode and SVG compositing.
  const photo = (name: string) => readFile(resolve(__dirname, '../../public/img/krek', `${name}.webp`));
  const background = await photo('werf-hero');
  const thumbnails = ['boot-kranen', 'verkoop-schip', 'kranen-hero'];
  const images = new Map<string, Buffer>(
    await Promise.all(thumbnails.map(async name => [`/img/krek/${name}.webp`, await photo(name)] as const)),
  );
  const count = 250;
  const pageSize = 100; // YardCanvasController page size
  const boats = Array.from({ length: count }, (_, i) => {
    const actual = {
      x: 7 + 11 * (i % 20), y: 6 + 10 * Math.floor(i / 20),
      rotation: i % 4 === 0 ? 90 : 0, scale: 1, location_code: i % 2 === 0 ? 'Noord' : 'Zuid',
    };
    return {
      id: `perf-${i}`, name: `Fleet Boat ${i + 1}`, registration_number: `WC-${1000 + i}`,
      length_cm: 500 + 50 * (i % 12), width_cm: 200 + 25 * (i % 8),
      statuses: { storage: `storage-${i}`, ...(i % 3 === 0 && { planning: `booking-${i}` }) },
      top_view: i % 5 === 0 ? {
        id: `photo-${i}`, url: `/img/krek/${thumbnails[(i / 5) % thumbnails.length]}.webp?boat=perf-${i}`,
      } : null,
      move_job: i % 10 === 0 ? { date: '2026-11-20', due_at: '2026-11-20T09:00:00+01:00', state: 'assigned' } : null,
      placement: {
        ...placement, actual, planned: i % 10 === 0 ? { ...actual, x: actual.x + 6 } : null,
        interaction_locked: i % 17 === 0,
      },
    };
  });
  const pages = new Set<number>();
  const target = boats[249];
  const due = '2026-11-20T09:00:00+01:00';
  async function installFleet(client: Page, trackPages = false) {
    const fleet = (data: typeof boats, current: number, total: number) => ({
      ...yard(), width: 230, height: 140,
      background: {
        x: 0, y: 0, width: 230, height: 140, version: 1, calibration_current: true,
        transform: [230, 0, 0, 140, 0, 0],
        zones: [{ name: 'Kraanbaan', type: 'route', x: 0, y: 130, width: 230, height: 10 }],
      },
      boats: {
        data, current_page: current, last_page: Math.ceil(total / pageSize), total,
      },
    });
    await workspace(client, url => {
      const current = Number(url.searchParams.get('page') ?? 1);
      if (trackPages) pages.add(current);
      return fleet(boats.slice((current - 1) * pageSize, current * pageSize), current, count);
    });
    await client.route(url => url.pathname.endsWith('/yard-canvas') && url.searchParams.has('search'), route => {
      const search = new URL(route.request().url()).searchParams.get('search')?.toLowerCase();
      const results = boats.filter(boat => [boat.registration_number, boat.name, boat.id]
        .some(value => value.toLowerCase() === search));
      return route.fulfill({ json: fleet(results, 1, results.length) });
    });
    await client.route('**/yard-canvas/background/1', route =>
      route.fulfill({ body: background, contentType: 'image/webp' }));
    await client.route(url => images.has(url.pathname) && url.searchParams.has('boat'), route =>
      route.fulfill({ body: images.get(new URL(route.request().url()).pathname)!, contentType: 'image/webp' }));
    await client.route(`**/placements/${target.id}/move-options*`, route =>
      route.fulfill({ json: { choices: { next: due } } }));
  }
  await installFleet(page, true);
  await page.addInitScript(() => {
    document.addEventListener('load', event => {
      if (event.target instanceof SVGImageElement) event.target.dataset.fixtureLoaded = 'true';
    }, true);
  });
  await page.goto(canvasPath, { waitUntil: 'commit' });
  const map = page.getByLabel(mapLabel);
  await page.waitForFunction(({ label, count, imageCount }) => {
    const canvas = document.querySelector(`svg[aria-label="${label}"]`);
    return canvas?.querySelectorAll('g[role="button"]').length === count
      && canvas.querySelectorAll('image[data-fixture-loaded="true"]').length === imageCount;
  }, { label: mapLabel, count, imageCount: 51 }, { timeout: 15_000 });
  const loadMs = await page.evaluate(async () => {
    await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    return performance.now(); // Relative to this fresh document's navigation start.
  });
  expect([...pages]).toEqual([1, 2, 3]);
  await expect(map.locator('line[marker-end="url(#yard-arrow)"]')).toHaveCount(25);

  const zoom = await map.evaluate(async canvas => {
    const layer = canvas.querySelector(':scope > g')!;
    const bounds = canvas.getBoundingClientRect();
    const frames: number[] = [];
    const sampleMs = 4000;
    const nextFrame = () => new Promise<number>(resolve => requestAnimationFrame(resolve));
    const start = await nextFrame();
    let frame = start;
    let frameCallbacks = 0;
    let pending: { transform: string | null; start: number } | undefined;
    while (frame - start < sampleMs) {
      if (!pending) {
        pending = { transform: layer.getAttribute('transform'), start: performance.now() };
        canvas.dispatchEvent(new WheelEvent('wheel', {
          clientX: bounds.x + bounds.width / 2, clientY: bounds.y + bounds.height / 2,
          deltaY: frames.length % 6 < 3 ? -120 : 120, bubbles: true, cancelable: true,
        }));
      }
      frame = await nextFrame();
      frameCallbacks++;
      if (layer.getAttribute('transform') !== pending.transform) {
        frames.push(performance.now() - pending.start);
        pending = undefined;
      }
    }
    const sorted = frames.toSorted((a, b) => a - b);
    const seconds = (frame - start) / 1000;
    return {
      samples: frames.length, animationFramesPerSecond: frameCallbacks / seconds,
      updatedFramesPerSecond: frames.length / seconds,
      p95InputToFrameMs: sorted[Math.ceil(sorted.length * .95) - 1] ?? null,
    };
  });
  // Local headless Chromium regression floors, based on repeated development-server runs.
  const budget = { loadMs: 12_000, updatedFramesPerSecond: 8, p95InputToFrameMs: 180 };
  const metrics = { boats: count, boatImages: 50, backgroundBytes: background.length, loadMs, ...zoom, budget };
  await test.info().attach('werfcanvas-performance.json', {
    body: JSON.stringify(metrics, null, 2), contentType: 'application/json',
  });
  expect.soft(loadMs, 'navigation to decoded map').toBeLessThan(budget.loadMs);
  expect.soft(zoom.updatedFramesPerSecond, 'viewport updates per second during wheel zoom')
    .toBeGreaterThanOrEqual(budget.updatedFramesPerSecond);
  expect.soft(zoom.p95InputToFrameMs, 'p95 wheel dispatch to the first animation frame with the changed transform')
    .toBeLessThan(budget.p95InputToFrameMs);
  await expect(page.getByLabel('Plaatsingsconcept')).toHaveCount(0);

  const other = await browser.newPage({ viewport: page.viewportSize()! });
  try {
    await installFleet(other);
    const otherMap = await openCanvas(other);
    await expect(otherMap.getByRole('button', { name: /^Fleet Boat \d+$/ })).toHaveCount(count);

    const findStarted = performance.now();
    await page.getByRole('textbox', { name: /Zoek boot/ }).fill(target.registration_number);
    await page.getByLabel('Zoekresultaten').getByRole('button', { name: new RegExp(target.name) }).click({ timeout: 10_000 });
    await expect(map.getByRole('button', { name: target.name, exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByLabel('Zoomniveau')).toHaveText('250%');
    const findMs = performance.now() - findStarted;

    await otherMap.getByRole('button', { name: target.name, exact: true }).press('Enter');
    const planStarted = performance.now();
    const clients = [[page, map, 'ArrowRight'], [other, otherMap, 'ArrowLeft']] as const;
    const [first, second] = await Promise.all(clients.map(
      async ([client, canvas, direction]) => {
        const moveDialog = client.getByRole('dialog', { name: 'Verplaatsing plannen' });
        await canvas.press(direction);
        await canvas.press('Control+s');
        const submit = moveDialog.getByRole('button', { name: 'Opslaan & toewijzen' });
        await expect(submit).toBeEnabled();
        return { dialog: moveDialog, submit };
      },
    ));
    const losingProposal = await second.dialog.getByText(/→/).innerText();
    let releaseWrites!: () => void;
    const bothInFlight = new Promise<void>(resolve => { releaseWrites = resolve; });
    const requests: object[] = [];
    for (const client of [page, other]) {
      await client.route(`**/placements/${target.id}`, async route => {
        const payload = route.request().postDataJSON();
        expect(route.request().method()).toBe('PATCH');
        requests.push(payload);
        if (client === page) {
          target.placement.planned = payload.position;
          target.placement.version = 2;
        }
        if (requests.length === 2) releaseWrites();
        await bothInFlight;
        if (client === page) {
          return route.fulfill({ json: target.placement });
        }
        return route.fulfill({ status: 409, json: { message: 'De plaatsing is gewijzigd.', placement: target.placement } });
      });
    }
    const saveStarted = performance.now();
    await Promise.all([first.submit.click(), second.submit.click()]);
    const [successMs, conflictMs] = await Promise.all([
      expect(page.getByRole('status').filter({ hasText: 'Verplaatsing ingepland.' })).toBeVisible({ timeout: 10_000 })
        .then(() => performance.now() - saveStarted),
      expect(second.dialog.getByRole('alert')).toContainText('De plaatsing is gewijzigd.', { timeout: 10_000 })
        .then(() => performance.now() - saveStarted),
    ]);
    const planMs = performance.now() - planStarted;
    await expect(first.dialog).toHaveCount(0);
    await expect(second.dialog.getByText(/→/)).toHaveText(losingProposal);
    await expect(second.dialog.getByText(/Serverversie\s*2/)).toBeVisible();
    await expect(second.submit).toBeDisabled();
    expect(requests).toEqual(expect.arrayContaining([-0.1, 0.1].map(offset => expect.objectContaining({
      operation: 'plan', version: 1, due_at: due, idempotency_key: expect.any(String),
      position: expect.objectContaining({ x: target.placement.actual.x + offset }),
    }))));
    expect(requests).toHaveLength(2);
    await test.info().attach('werfcanvas-workflow-timings.json', {
      body: JSON.stringify({ boats: count, findMs, planMs, successMs, conflictMs }, null, 2),
      contentType: 'application/json',
    });
    expect(findMs, 'search input to focused boat').toBeLessThan(10_000);
    expect(planMs, 'first positioning action to both concurrent save outcomes').toBeLessThan(30_000);
    expect(successMs, 'concurrent submit to success').toBeLessThan(10_000);
    expect(conflictMs, 'concurrent submit to conflict').toBeLessThan(10_000);
  } finally {
    await other.close();
  }
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
