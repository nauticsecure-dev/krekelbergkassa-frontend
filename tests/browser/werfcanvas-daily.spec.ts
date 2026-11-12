import { expect, test, type Page } from '@playwright/test';

// Intercepted UI regression. Persistence, permissions and delivery recovery are
// covered separately by YardCanvasTest against disposable SQLite databases.
async function workspace(page: Page) {
  const origin = test.info().project.use.baseURL!;
  await page.context().addCookies([{ name: 'krek_session', value: 'synthetic-yard', url: origin }]);
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.origin !== origin) return route.abort();
    if (!url.pathname.startsWith('/api/')) return route.continue();
    const json = (value: unknown) => route.fulfill({ json: value });
    if (url.pathname.endsWith('/auth/me')) return json({ id: 'worker', email: 'yard@example.test', role: 'super_admin', name: 'Synthetic Planner', permissions: ['*'] });
    if (url.pathname.endsWith('/calendar/locations')) return json([]);
    if (url.pathname.endsWith('/calendar')) return json({ regular_hours: [], exceptions: [], lunch_block: null });
    if (url.pathname.endsWith('/daily-plan')) return json({
      date: url.searchParams.get('date'), timezone: 'Europe/Amsterdam', generated_at: '2026-11-11T08:00:00Z',
      jobs: ['yard_move', 'boat', 'appointment', 'work_order'].map((type, i) => ({
        id: `job-${i}`, type, boat_id: 'boat-1', boat: 'Synthetic Aurora', title: `Synthetic ${type}`,
        due_at: type === 'work_order' ? null : '2026-11-11T09:30:00+01:00', priority: 'normal', status: 'planned',
        assigned_to: 'Synthetic Worker', actual: { x: 10, y: 20 }, planned: null, photo_url: null,
      })),
    });
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
