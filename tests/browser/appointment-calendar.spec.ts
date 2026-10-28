import { expect, test, type Page } from '@playwright/test';

test.setTimeout(180_000);

async function session(page: Page, permissions = ['planning.view', 'planning.manage', 'planning.write']) {
  const baseURL = test.info().project.use.baseURL!;
  const mutations: Array<{ path: string; body: Record<string, unknown> }> = [];
  const ranges: URL[] = [];
  let rejectMove = false;
  const appointments = [
    { id: 'first', appointment_date: '2026-06-08', start_time: '09:00', end_time: '10:00', duration_minutes: 60,
      status: 'confirmed', service_codes: ['CRANE'], boat: { name: 'First boat' }, customer: { name: 'Customer' }, next_status: 'planned' },
    { id: 'overlap', appointment_date: '2026-06-08', start_time: '09:30', end_time: '10:30', duration_minutes: 60,
      status: 'confirmed', service_codes: ['WASH'], boat: { name: 'Overlapping boat' }, customer: { name: 'Other customer' } },
  ];
  await page.context().addCookies([{ name: 'krek_session', value: 'calendar-fixture', url: baseURL }]);
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== baseURL) return route.abort();
    const path = url.pathname;
    if (path.endsWith('/auth/me')) return route.fulfill({ json: { id: 'viewer', name: 'Viewer', email: 'viewer@example.test', role: 'staff', permissions } });
    if (path.endsWith('/appointments/calendar')) { ranges.push(url); return route.fulfill({ json: { data: appointments } }); }
    if (path.endsWith('/appointments/options')) return route.fulfill({ json: {
      locations: [{ id: 'location', code: 'A1' }], employees: [{ id: 'employee', name: 'Planner' }],
    } });
    if (path.endsWith('/service-catalog/services')) return route.fulfill({ json: { services: [
      { code: 'crane-product', service_code: 'CRANE', name: 'Catalog crane', visibility: { booking: true } },
      { code: 'hidden', service_code: 'HIDDEN', name: 'Ineligible service', visibility: { booking: false } },
    ] } });
    if (path.endsWith('/customers')) return route.fulfill({ json: { data: [{ id: 'customer', name: 'Calendar customer' }] } });
    if (path.endsWith('/boats')) return route.fulfill({ json: { data: [{ id: 'boat', name: 'Calendar boat', customer_id: 'customer' }] } });
    if (path.endsWith('/appointments/check-conflicts')) return route.fulfill({ json: { has_conflicts: false, conflicts: [] } });
    if (path.endsWith('/schedule') || (path.endsWith('/appointments') && route.request().method() === 'POST')) {
      const body = route.request().postDataJSON();
      mutations.push({ path, body });
      if (rejectMove) return route.fulfill({ status: 422, json: { message: 'This time slot is not available.' } });
      if (path.endsWith('/schedule')) Object.assign(appointments[0], {
        start_time: body.start_time,
        end_time: `${String(Number(body.start_time.slice(0, 2)) + Number(body.duration_minutes) / 60).padStart(2, '0')}:00`,
        duration_minutes: body.duration_minutes,
      });
      return route.fulfill({ status: path.endsWith('/schedule') ? 200 : 201, json: appointments[0] });
    }
    return route.fulfill({ json: { data: [], items: [], cards: [], meta: { total: 0 } } });
  });
  return { mutations, ranges, reject: () => { rejectMove = true; } };
}

test('loads overlapping events, restores the view and URL filters, and protects read-only users', async ({ page }) => {
  const fixture = await session(page, ['planning.view']);
  await page.goto('/nl/admin/afspraken?view=week&date=2026-06-08&service_code=CRANE&location_id=location&assigned_to=employee&create=1', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.fc-timeGridWeek-view')).toBeVisible({ timeout: 60_000 });
  await expect(page.locator('.fc-event')).toHaveCount(2);
  expect(fixture.ranges.at(-1)?.searchParams.get('to')).toBe('2026-06-15');
  expect(fixture.ranges.at(-1)?.searchParams.get('service_code')).toBe('CRANE');
  expect(fixture.ranges.at(-1)?.searchParams.get('location_id')).toBe('location');
  expect(fixture.ranges.at(-1)?.searchParams.get('assigned_to')).toBe('employee');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('.fc-event-resizer')).toHaveCount(0);
  // FullCalendar can cover an event's center with a later overlapping event.
  // Use its exposed upper-left area, as a user would, without forcing the click.
  await page.locator('.fc-event').filter({ hasText: 'First boat' }).click({ position: { x: 10, y: 5 } });
  await expect(page.getByRole('dialog')).toContainText('First boat');
  await expect(page.getByRole('dialog').getByRole('button', { name: /bevestigen|annuleren|planned/i })).toHaveCount(0);
  expect(fixture.mutations).toHaveLength(0);
});

test('restores month and day navigation after reload', async ({ page }) => {
  await session(page);
  await page.goto('/nl/admin/afspraken?view=month&date=2026-06-08', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.fc-dayGridMonth-view')).toBeVisible({ timeout: 60_000 });
  await page.locator('.fc-timeGridDay-button').click();
  await expect(page).toHaveURL(/view=day/);
  await page.reload();
  await expect(page.locator('.fc-timeGridDay-view')).toBeVisible();
});

test('creation uses eligible catalog services and sends the checked duration', async ({ page }) => {
  const fixture = await session(page);
  await page.goto('/nl/admin/afspraken?view=day&date=2026-06-08&create=1', { waitUntil: 'domcontentloaded' });
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible({ timeout: 60_000 });
  await dialog.locator('label').filter({ has: page.locator('span', { hasText: /^Klant$/ }) }).getByRole('button').click();
  await page.getByRole('option', { name: 'Calendar customer', exact: true }).click();
  await dialog.locator('label').filter({ has: page.locator('span', { hasText: /^Boot$/ }) }).getByRole('button').click();
  await page.getByRole('option', { name: 'Calendar boat', exact: true }).click();
  await dialog.locator('label').filter({ has: page.locator('span', { hasText: /^Dienst$/ }) }).getByRole('button').click();
  await expect(page.getByRole('option', { name: 'Ineligible service' })).toHaveCount(0);
  await page.getByRole('option', { name: 'Catalog crane', exact: true }).click();
  await dialog.getByRole('spinbutton').fill('90');
  await dialog.getByRole('button', { name: 'Afspraak aanmaken', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  expect(fixture.mutations).toHaveLength(1);
  expect(fixture.mutations[0].body).toMatchObject({ service_codes: ['CRANE'], duration_minutes: 90, customer_id: 'customer', boat_id: 'boat' });
});

test('creation searches customers inside one dropdown and clears boats when the customer changes', async ({ page }) => {
  await session(page);
  const lookups: string[] = [];
  await page.route('**/api/v1/customers?**', async (route) => {
    const search = new URL(route.request().url()).searchParams.get('search');
    lookups.push(search ?? '');
    return route.fulfill({ json: { data: search ? [{ id: 'remote', name: 'Remote customer' }] : [
      { id: 'customer', name: 'Calendar customer' }, { id: 'empty', name: 'Empty customer' },
    ] } });
  });
  await page.route('**/api/v1/boats?**', async (route) => {
    const customerId = new URL(route.request().url()).searchParams.get('customer_id');
    return route.fulfill({ json: { data: customerId === 'customer' ? [
      { id: 'boat', name: 'Calendar boat', customer_id: 'customer' },
    ] : [] } });
  });
  await page.goto('/nl/admin/afspraken?view=day&date=2026-06-08&create=1', { waitUntil: 'domcontentloaded' });
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible({ timeout: 60_000 });
  const customer = dialog.getByRole('button', { name: 'Klant', exact: true });
  const boat = dialog.getByRole('button', { name: 'Boot', exact: true });
  await expect(boat).toBeDisabled();
  // The search input exists only inside the open dropdown.
  await expect(dialog.locator('label').filter({ has: customer }).getByRole('textbox')).toHaveCount(0);
  await customer.click();
  await page.getByRole('combobox').fill('Remote');
  await expect.poll(() => lookups.includes('Remote')).toBe(true);
  await expect(page.getByRole('option', { name: 'Remote customer', exact: true })).toBeVisible();
  await page.screenshot({ path: test.info().outputPath('appointment-customer-search.png') });
  await page.getByRole('option', { name: 'Remote customer', exact: true }).click();
  await expect(customer).toHaveText('Remote customer');
  // Refreshing the default result page must preserve the selected label.
  await expect.poll(() => lookups.at(-1)).toBe('');
  await expect(customer).toHaveText('Remote customer');
  await customer.click();
  await page.getByRole('option', { name: 'Calendar customer', exact: true }).click();
  await expect(boat).toBeEnabled();
  await boat.click();
  await page.getByRole('option', { name: 'Calendar boat', exact: true }).click();
  await expect(boat).toHaveText('Calendar boat');
  await customer.click();
  await page.getByRole('option', { name: 'Empty customer', exact: true }).click();
  await expect(boat).not.toHaveText('Calendar boat');
  await expect(boat).toBeEnabled();
  await boat.click();
  await expect(page.getByRole('option', { name: 'Calendar boat', exact: true })).toHaveCount(0);
  await expect(page.getByText('Deze klant heeft geen boten', { exact: true })).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Afspraak aanmaken', exact: true })).toBeDisabled();
});

test('drag rejection reverts the event, and resizing sends the changed duration', async ({ page }) => {
  const fixture = await session(page);
  await page.goto('/nl/admin/afspraken?view=day&date=2026-06-08', { waitUntil: 'domcontentloaded' });
  const event = page.locator('.fc-event').filter({ hasText: 'First boat' });
  await expect(event).toBeVisible({ timeout: 60_000 });
  await event.scrollIntoViewIfNeeded();
  const original = (await event.boundingBox())!;
  const slot = (await page.locator('.fc-timegrid-slot').first().boundingBox())!;
  // One hour longer, with a real pointer gesture on FullCalendar's resize handle.
  await event.hover({ position: { x: 10, y: 5 } });
  const handle = event.locator('.fc-event-resizer-end');
  const box = (await handle.boundingBox())!;
  const resizeX = box.x + Math.min(5, box.width / 2);
  await page.mouse.move(resizeX, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(resizeX, box.y + box.height / 2 + slot.height * 2, { steps: 15 });
  await page.mouse.up();
  await expect.poll(() => fixture.mutations.length).toBe(1);
  expect(fixture.mutations[0].body).toMatchObject({ date: '2026-06-08', start_time: '09:00', duration_minutes: 120 });
  fixture.reject();
  await event.scrollIntoViewIfNeeded();
  const moved = (await event.boundingBox())!;
  await page.mouse.move(moved.x + 20, moved.y + 15);
  await page.mouse.down();
  await page.mouse.move(moved.x + 20, moved.y + 15 + slot.height * 6, { steps: 20 });
  await page.mouse.up();
  await expect.poll(() => fixture.mutations.length).toBe(2);
  await expect(event).toContainText('9:00');
  expect(original.height).toBeGreaterThan(0);
});
