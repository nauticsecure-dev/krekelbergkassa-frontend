import { expect, test, type Page } from '@playwright/test';

const customer = { id: 'customer-one', name: 'Portal Customer', email: 'portal@example.test', preferred_locale: 'en', customer_number: 'C-ONE', phone: '', has_password: false };
const appointment = { id: 'appointment-one', boat_id: 'boat-one', appointment_date: '2027-01-12', start_time: '09:00', status: 'requested', duration_minutes: 45, service_codes: ['crane-out'], approval_type: 'manual' };
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64');

async function fixture(page: Page, session = false) {
  const origin = String(test.info().project.use.baseURL);
  const state = {
    meStatus: 200, loginStatus: 200, verifyStatus: 200, locale: 'en', hasPassword: false,
    photo: 'photo-one', photos: [] as string[], posts: [] as { path: string; body: Record<string, unknown> }[],
  };
  if (session) await page.context().addCookies([{ name: 'krek_portal_session', value: 'portal-fixture', url: origin }]);
  const boats = () => ['one', 'two'].map(suffix => ({ id: `boat-${suffix}`, name: `Boat ${suffix}`, type: 'motor', length_cm: 890,
    photo_file_id: suffix === 'one' ? state.photo : 'photo-two', photo_url: `/api/v1/portal/boats/boat-${suffix}/photos/${suffix === 'one' ? state.photo : 'photo-two'}` }));
  await page.route('**/*', async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin !== origin) return route.abort();
    if (!url.pathname.startsWith('/api/')) return route.continue();
    const path = url.pathname;
    if (['POST', 'PUT'].includes(request.method()) && !request.headers()['content-type']?.includes('multipart')) {
      state.posts.push({ path, body: request.postDataJSON() ?? {} });
    }
    if (path.endsWith('/customer/login') || path.endsWith('/verify-magic-link')) {
      const status = path.endsWith('/customer/login') ? state.loginStatus : state.verifyStatus;
      return route.fulfill({ status, json: status === 200 ? { success: true, portal_token: 'portal-fixture', customer: { ...customer, preferred_locale: state.locale } } : { message: 'Invalid credentials or expired link' } });
    }
    if (path.endsWith('/portal/me')) return route.fulfill({ status: state.meStatus, json: state.meStatus === 200 ? {
      customer: { ...customer, has_password: state.hasPassword }, summary: { open_balance_cents: 0, open_invoices_count: 0, boats_count: 2, active_contracts_count: 0 },
    } : { message: 'Profile unavailable' } });
    if (path.endsWith('/portal/password')) { state.hasPassword = true; return route.fulfill({ json: { success: true } }); }
    if (path.endsWith('/boats/boat-one/photo')) { state.photo = 'photo-replaced'; return route.fulfill({ json: boats()[0] }); }
    if (/\/photos\//.test(path)) {
      expect(request.headers().authorization).toBe('Bearer portal-fixture');
      state.photos.push(path);
      return route.fulfill({ contentType: 'image/svg+xml', body: `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="640" height="360" fill="${path.includes('boat-two') ? '#187487' : '#17334d'}"/><text x="40" y="180" fill="white" font-size="32">${path.includes('boat-two') ? 'Boat two' : 'Boat one'} · ${path.includes('replaced') ? 'Replaced photo' : 'Original photo'}</text></svg>` });
    }
    if (path.endsWith('/portal/boats')) return route.fulfill({ json: boats() });
    if (path.endsWith('/portal/appointments')) return route.fulfill({ json: { data: [appointment], total: 1, has_more: false } });
    if (path.endsWith('/portal/timeline')) return route.fulfill({ json: { items: ['one', 'two'].map(suffix => ({ id: `event-${suffix}`, title: `Event ${suffix}`, type: 'photo', boat: { id: `boat-${suffix}`, name: `Boat ${suffix}` }, created_at: new Date().toISOString() })), pagination: { unread_count: 0 } } });
    if (path.endsWith('/portal/notifications')) return route.fulfill({ json: { latest: [], unread_count: 0 } });
    return route.fulfill({ json: { success: true, data: [], items: [], media_blocks: [], content_blocks: [], settings: {}, meta: { total: 0 } } });
  });
  return state;
}

async function passwordLogin(page: Page) {
  await page.locator('#email').fill(customer.email);
  await page.locator('#password').fill('portal-password-2026');
  await page.locator('form').getByRole('button', { name: 'Sign in', exact: true }).click();
}

test('password recovery preserves the appointment through the emailed reset and subsequent login', async ({ page }) => {
  const state = await fixture(page);
  const destination = '/en/dashboard/afspraken?appointment=appointment-one';
  await page.goto('/en/login?returnTo=' + encodeURIComponent(destination));
  await page.locator('form a[href*="forgot-password"]').click();
  await expect(page.getByRole('heading', { name: 'Forgot password', exact: true })).toBeVisible();
  expect(new URL(page.url()).searchParams.get('returnTo')).toBe(destination);
  await page.locator('input[type=email]').fill(customer.email);
  await page.locator('form button[type=submit]').click();
  await expect(page.getByText('Check your inbox', { exact: true })).toBeVisible();
  expect(state.posts.find(post => post.path.endsWith('/forgot-password'))?.body.returnTo).toBe(destination);
  await page.goto('/en/forgot-password?' + new URLSearchParams({ token: 'reset-fixture', email: customer.email, returnTo: destination }));
  await page.locator('input[type=password]').nth(0).fill('replacement-password');
  await page.locator('input[type=password]').nth(1).fill('replacement-password');
  await page.locator('form button[type=submit]').click();
  await page.getByRole('link', { name: 'Back to login', exact: true }).click();
  await expect(page.locator('#password')).toBeVisible();
  expect(new URL(page.url()).searchParams.get('returnTo')).toBe(destination);
  await passwordLogin(page);
  await expect(page.getByRole('dialog')).toBeVisible();
});

test('signup and its navigation retain the appointment destination', async ({ page }) => {
  const state = await fixture(page);
  const destination = '/en/dashboard/afspraken?appointment=appointment-one';
  await page.goto('/en/login?returnTo=' + encodeURIComponent(destination));
  await page.locator('form a[href*="signup"]').click();
  expect(new URL(page.url()).searchParams.get('returnTo')).toBe(destination);
  await page.locator('#name').fill(customer.name);
  await page.locator('#email').fill(customer.email);
  await page.locator('form button[type=submit]').click();
  await expect.poll(() => state.posts.find(post => post.path.endsWith('/customer/register'))?.body.returnTo).toBe(destination);
  await expect(page.locator(`a[href*="login?returnTo="]`).first()).toBeVisible();
});

test('CP09 magic callback preserves appointment and opens its details', async ({ page }) => {
  const state = await fixture(page);
  await page.goto('/en/portal/verify?token=fixture&returnTo=' + encodeURIComponent('/en/dashboard/afspraken?appointment=appointment-one'));
  await expect(page).toHaveURL(/dashboard\/afspraken\?appointment=appointment-one/);
  await expect(page.getByRole('dialog')).toBeVisible();
  expect(state.posts.filter(post => post.path.endsWith('/verify-magic-link'))).toHaveLength(1);
});

test('CP10 French preferred locale is used without an explicit destination', async ({ page }) => {
  const state = await fixture(page); state.locale = 'fr-FR';
  await page.goto('/en/portal/verify?token=fixture');
  await expect(page).toHaveURL(/\/fr\/feed$/);
});

test('CP11 expired magic link displays recovery', async ({ page }) => {
  const state = await fixture(page); state.verifyStatus = 422;
  await page.goto('/en/portal/verify?token=expired');
  await expect(page.getByRole('link', { name: /login|sign in/i })).toBeVisible();
  await expect(page).toHaveURL(/portal\/verify/);
});

test('CP12 absent magic token does not call verification', async ({ page }) => {
  const state = await fixture(page);
  await page.goto('/en/portal/verify');
  await expect(page.getByRole('link', { name: /login|sign in/i })).toBeVisible();
  expect(state.posts.some(post => post.path.endsWith('/verify-magic-link'))).toBe(false);
});

test('CP13 password login establishes portal session at appointment destination', async ({ page }) => {
  await fixture(page);
  await page.goto('/en/login?returnTo=' + encodeURIComponent('/en/dashboard/afspraken?appointment=appointment-one'));
  await passwordLogin(page);
  await expect(page.getByRole('dialog')).toBeVisible();
  expect((await page.context().cookies()).find(cookie => cookie.name === 'krek_portal_session')?.value).toBe('portal-fixture');
});

test('CP14 failed password login stays recoverable', async ({ page }) => {
  const state = await fixture(page); state.loginStatus = 422;
  await page.goto('/en/login'); await passwordLogin(page);
  await expect(page.getByText('Invalid credentials or expired link')).toBeVisible();
  await expect(page.locator('#password')).toBeEnabled();
});

test('CP15 forgot password calls API before showing sent confirmation', async ({ page }) => {
  const state = await fixture(page);
  await page.goto('/en/forgot-password');
  await page.locator('input[type=email]').fill(customer.email);
  await page.locator('form button[type=submit]').click();
  await expect(page.getByText('Check your inbox', { exact: true })).toBeVisible();
  expect(state.posts.find(post => post.path.endsWith('/forgot-password'))?.body).toMatchObject({ email: customer.email, locale: 'en' });
});

test('CP16 reset form submits emailed token email and confirmation', async ({ page }) => {
  const state = await fixture(page);
  await page.goto('/en/forgot-password?token=reset-fixture&email=' + encodeURIComponent(customer.email));
  const inputs = page.locator('input[type=password]');
  await inputs.nth(0).fill('replacement-password'); await inputs.nth(1).fill('replacement-password');
  await page.locator('form button[type=submit]').click();
  await expect(page.getByText('Your password has been saved', { exact: true })).toBeVisible();
  expect(state.posts.find(post => post.path.endsWith('/reset-password'))?.body).toMatchObject({ email: customer.email, token: 'reset-fixture', password_confirmation: 'replacement-password' });
});

test('CP17 magic link request carries appointment destination', async ({ page }) => {
  const state = await fixture(page); const destination = '/en/dashboard/afspraken?appointment=appointment-one';
  await page.goto('/en/login?returnTo=' + encodeURIComponent(destination));
  await page.getByRole('button', { name: 'Sign in without a password', exact: true }).click();
  await page.locator('#email').fill(customer.email);
  await page.getByRole('button', { name: 'Email me a sign-in link', exact: true }).click();
  await expect.poll(() => state.posts.find(post => post.path.endsWith('/magic-link'))?.body.returnTo).toBe(destination);
});

for (const destination of ['//example.com', '/\\example.com', '/en/admin', '/en/dashboard/../admin']) {
  test(`CP18 unsafe customer destination is rejected: ${destination}`, async ({ page }) => {
    await fixture(page);
    await page.goto('/en/login?returnTo=' + encodeURIComponent(destination)); await passwordLogin(page);
    await expect(page).toHaveURL(/\/en\/feed$/);
  });
}

test('CP19 profile failure gives recovery instead of an endless spinner', async ({ page }) => {
  const state = await fixture(page, true); state.meStatus = 503;
  await page.goto('/en/dashboard/boten');
  await expect(page.getByText('The request failed. Please try again.', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible();
});

test('CP20 profile failure can be retried without discarding the token', async ({ page }) => {
  const state = await fixture(page, true); state.meStatus = 503;
  await page.goto('/en/dashboard/boten');
  await expect(page.getByText('The request failed. Please try again.', { exact: true })).toBeVisible();
  state.meStatus = 200;
  await page.getByRole('button', { name: /retry|try again/i }).click();
  await expect(page.getByRole('button', { name: /Boat one/ })).toBeVisible();
});

test('CP21 expired session redirects to login with appointment query intact', async ({ page }) => {
  const state = await fixture(page, true); state.meStatus = 401;
  await page.goto('/en/dashboard/afspraken?appointment=appointment-one');
  await expect(page).toHaveURL(/\/en\/login\?returnTo=/);
  expect(new URL(page.url()).searchParams.get('returnTo')).toBe('/en/dashboard/afspraken?appointment=appointment-one');
});

test('CP22 protected boat images are fetched with portal authorization and render blobs', async ({ page }) => {
  const state = await fixture(page, true);
  await page.goto('/en/dashboard/boten');
  await expect(page.locator('img[alt="Boat one"]')).toHaveAttribute('src', /^blob:/);
  expect(state.photos.some(path => path.includes('/boat-one/photos/photo-one'))).toBe(true);
  expect(await page.locator('img[alt="Boat one"]').evaluate(image => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
});

test('CP23 replacement refreshes card detail and subsequent Feed', async ({ page }) => {
  const state = await fixture(page, true);
  await page.goto('/en/dashboard/boten');
  await page.getByRole('button', { name: /Boat one/ }).click();
  await page.locator('input[type=file]').setInputFiles({ name: 'replacement.png', mimeType: 'image/png', buffer: png });
  await expect.poll(() => state.photos.some(path => path.includes('/photo-replaced'))).toBe(true);
  await expect(page.getByRole('dialog').locator('img[alt="Boat one"]')).toHaveAttribute('src', /^blob:/);
  await expect.poll(() => page.getByRole('dialog').locator('img').evaluate(image => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  await page.screenshot({ path: test.info().outputPath('replacement.png'), fullPage: true });
  await page.goto('/en/feed');
  await expect(page.locator('img[alt="Boat one"]').first()).toHaveAttribute('src', /^blob:/);
  expect(state.photo).toBe('photo-replaced');
});

test('CP24 settings supports first password then requires current password', async ({ page }) => {
  const state = await fixture(page, true);
  await page.goto('/en/dashboard/settings');
  await page.getByLabel('New password (12–72 characters)', { exact: true }).fill('new-portal-password');
  await page.getByLabel('Confirm new password', { exact: true }).fill('new-portal-password');
  await page.getByRole('button', { name: 'Save password', exact: true }).click();
  await expect(page.getByLabel('Current password', { exact: true })).toBeVisible();
  expect(state.posts.find(post => post.path.endsWith('/portal/password'))?.body).toMatchObject({ password: 'new-portal-password', password_confirmation: 'new-portal-password' });
});

test('saved password remains successful when the profile refresh fails', async ({ page }) => {
  const state = await fixture(page, true);
  await page.goto('/en/dashboard/settings');
  await page.getByLabel('New password (12–72 characters)', { exact: true }).fill('new-portal-password');
  await page.getByLabel('Confirm new password', { exact: true }).fill('new-portal-password');
  state.meStatus = 503;
  await page.getByRole('button', { name: 'Save password', exact: true }).click();
  await expect(page.getByText('Password saved.', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Current password', { exact: true })).toBeVisible();
});

test('CP25 Feed resolves each event to its own canonical boat image', async ({ page }) => {
  const state = await fixture(page, true);
  await page.goto('/en/feed');
  await expect(page.getByText('Event one', { exact: true })).toBeVisible();
  await expect(page.getByText('Event two', { exact: true })).toBeVisible();
  await expect(page.locator('img[alt="Boat two"]')).toHaveAttribute('src', /^blob:/);
  expect(state.photos.some(path => path.includes('/boat-two/photos/photo-two'))).toBe(true);
  const originalSrc = await page.locator('img[alt="Boat one"]').first().getAttribute('src');
  state.photo = 'photo-live-replaced';
  // A second tab publishes this storage event after replacing a photo.
  await page.evaluate(() => window.dispatchEvent(new StorageEvent('storage', { key: 'krek_boat_photo_changed', newValue: String(Date.now()) })));
  await expect.poll(() => state.photos.some(path => path.includes('/photo-live-replaced'))).toBe(true);
  await expect(page.locator('img[alt="Boat one"]').first()).not.toHaveAttribute('src', originalSrc!);
  await page.getByText('Event two', { exact: true }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: test.info().outputPath('feed.png'), fullPage: true });
});

for (const locale of ['nl', 'en', 'de', 'fr']) {
  test(`locale coverage: ${locale} boat photos and password settings on desktop and mobile`, async ({ page }) => {
    await fixture(page, true);
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`/${locale}/dashboard/boten`);
      await expect(page.locator('img[alt="Boat one"]')).toHaveAttribute('src', /^blob:/);
      await expect.poll(() => page.locator('main').evaluate(element => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1);
      await page.goto(`/${locale}/dashboard/settings`);
      await expect(page.locator('input[autocomplete="new-password"]')).toHaveCount(2);
      await expect(page.locator('input[autocomplete="new-password"]').first()).toHaveAttribute('minlength', '12');
      await expect.poll(() => page.locator('main').evaluate(element => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1);
      await page.locator('input[autocomplete="new-password"]').first().scrollIntoViewIfNeeded();
      await page.screenshot({ path: test.info().outputPath(`password-${locale}-${width}.png`) });
    }
  });
}
