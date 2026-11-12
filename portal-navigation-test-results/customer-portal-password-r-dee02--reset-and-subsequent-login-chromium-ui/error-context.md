# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: customer-portal.spec.ts >> password recovery preserves the appointment through the emailed reset and subsequent login
- Location: tests\browser\customer-portal.spec.ts:54:5

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('Check your inbox', { exact: true })
Expected: visible
Timeout: 20000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 20000ms
  - waiting for getByText('Check your inbox', { exact: true })

```

```yaml
- banner:
  - link "Krekelberg Nautic":
    - /url: /en
    - img "Krekelberg Nautic logo"
    - text: KREKELBERG Nautic · Jachtmakelaar
  - navigation:
    - list:
      - listitem:
        - link "Yard & services":
          - /url: /en/diensten
          - text: Yard & services
          - img
      - listitem:
        - link "Sales":
          - /url: /en/verkoop
      - listitem:
        - link "About":
          - /url: /en/over-ons
      - listitem:
        - link "Contact":
          - /url: /en/contact
  - button "en":
    - text: en
    - img
  - link "Login":
    - /url: /en/login
    - button "Login"
  - link "Stalling":
    - /url: /en/diensten/winterstalling
    - text: Stalling
    - img
- main:
  - img "Krekelberg Nautic logo"
  - text: KREKELBERG Nautic · Jachtmakelaar Account recovery
  - heading "Quickly back into your Krekelberg account." [level=1]
  - paragraph: We'll send you a secure reset link. No password puzzles, just calm.
  - img
  - text: Valid 15 minutes
  - paragraph: Single-use reset link, automatically expires.
  - img
  - text: No password leak
  - paragraph: We never reveal whether an email exists.
  - img
  - text: Direct help
  - paragraph: Call 0475 315 661 for personal support.
  - img
  - text: Physical support in Roermond Hertenerweg 2, 6049AA Herten
  - heading "Forgot password" [level=2]
  - paragraph: No problem. Enter your email and we'll send you a reset link.
  - text: Email address
  - img
  - textbox "Email address":
    - /placeholder: name@example.com
  - button "Send reset link":
    - text: Send reset link
    - img
  - link "Back to login":
    - /url: /en/login?returnTo=%2Fen%2Fdashboard%2Fafspraken%3Fappointment%3Dappointment-one
    - button "Back to login":
      - img
      - text: Back to login
- contentinfo:
  - img "Krekelberg Nautic logo"
  - text: KREKELBERG Nautic · Jachtmakelaar
  - paragraph: Yacht yard, storage and brokerage in Roermond. Craftsmanship, planning and boat storage since 1972.
  - text: Services
  - list:
    - listitem:
      - link "Crane":
        - /url: /en/kraanafspraak
    - listitem:
      - link "Pressure wash":
        - /url: /en/diensten/afspuiten
    - listitem:
      - link "Winter storage":
        - /url: /en/diensten/winterstalling
    - listitem:
      - link "A week ashore":
        - /url: /en/diensten/weekje-op-wal
    - listitem:
      - link "Sell your boat":
        - /url: /en/verkoop
  - text: Company
  - list:
    - listitem:
      - link "About":
        - /url: /en/over-ons
    - listitem:
      - link "Frequently asked questions":
        - /url: /en/faq
    - listitem:
      - link "Contact":
        - /url: /en/contact
    - listitem:
      - link "Timeline":
        - /url: /en/feed
    - listitem:
      - link "Login":
        - /url: /en/login
  - text: Contact
  - list:
    - listitem:
      - img
    - listitem:
      - img
    - listitem:
      - img
  - text: © 2026 Krekelberg Nautic — All rights reserved.
  - link "Privacy":
    - /url: /en/privacy
  - link "Voorwaarden":
    - /url: /en/voorwaarden
  - link "Cookies":
    - /url: /en/cookies
- alert
```

# Test source

```ts
  1   | import { expect, test, type Page } from '@playwright/test';
  2   | 
  3   | const customer = { id: 'customer-one', name: 'Portal Customer', email: 'portal@example.test', preferred_locale: 'en', customer_number: 'C-ONE', phone: '', has_password: false };
  4   | const appointment = { id: 'appointment-one', boat_id: 'boat-one', appointment_date: '2027-01-12', start_time: '09:00', status: 'requested', duration_minutes: 45, service_codes: ['crane-out'], approval_type: 'manual' };
  5   | const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64');
  6   | 
  7   | async function fixture(page: Page, session = false) {
  8   |   const origin = String(test.info().project.use.baseURL);
  9   |   const state = {
  10  |     meStatus: 200, loginStatus: 200, verifyStatus: 200, locale: 'en', hasPassword: false,
  11  |     photo: 'photo-one', photos: [] as string[], posts: [] as { path: string; body: Record<string, unknown> }[],
  12  |   };
  13  |   if (session) await page.context().addCookies([{ name: 'krek_portal_session', value: 'portal-fixture', url: origin }]);
  14  |   const boats = () => ['one', 'two'].map(suffix => ({ id: `boat-${suffix}`, name: `Boat ${suffix}`, type: 'motor', length_cm: 890,
  15  |     photo_file_id: suffix === 'one' ? state.photo : 'photo-two', photo_url: `/api/v1/portal/boats/boat-${suffix}/photos/${suffix === 'one' ? state.photo : 'photo-two'}` }));
  16  |   await page.route('**/*', async route => {
  17  |     const request = route.request();
  18  |     const url = new URL(request.url());
  19  |     if (url.origin !== origin) return route.abort();
  20  |     if (!url.pathname.startsWith('/api/')) return route.continue();
  21  |     const path = url.pathname;
  22  |     if (['POST', 'PUT'].includes(request.method()) && !request.headers()['content-type']?.includes('multipart')) {
  23  |       state.posts.push({ path, body: request.postDataJSON() ?? {} });
  24  |     }
  25  |     if (path.endsWith('/customer/login') || path.endsWith('/verify-magic-link')) {
  26  |       const status = path.endsWith('/customer/login') ? state.loginStatus : state.verifyStatus;
  27  |       return route.fulfill({ status, json: status === 200 ? { success: true, portal_token: 'portal-fixture', customer: { ...customer, preferred_locale: state.locale } } : { message: 'Invalid credentials or expired link' } });
  28  |     }
  29  |     if (path.endsWith('/portal/me')) return route.fulfill({ status: state.meStatus, json: state.meStatus === 200 ? {
  30  |       customer: { ...customer, has_password: state.hasPassword }, summary: { open_balance_cents: 0, open_invoices_count: 0, boats_count: 2, active_contracts_count: 0 },
  31  |     } : { message: 'Profile unavailable' } });
  32  |     if (path.endsWith('/portal/password')) { state.hasPassword = true; return route.fulfill({ json: { success: true } }); }
  33  |     if (path.endsWith('/boats/boat-one/photo')) { state.photo = 'photo-replaced'; return route.fulfill({ json: boats()[0] }); }
  34  |     if (/\/photos\//.test(path)) {
  35  |       expect(request.headers().authorization).toBe('Bearer portal-fixture');
  36  |       state.photos.push(path);
  37  |       return route.fulfill({ contentType: 'image/svg+xml', body: `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="640" height="360" fill="${path.includes('boat-two') ? '#187487' : '#17334d'}"/><text x="40" y="180" fill="white" font-size="32">${path.includes('boat-two') ? 'Boat two' : 'Boat one'} · ${path.includes('replaced') ? 'Replaced photo' : 'Original photo'}</text></svg>` });
  38  |     }
  39  |     if (path.endsWith('/portal/boats')) return route.fulfill({ json: boats() });
  40  |     if (path.endsWith('/portal/appointments')) return route.fulfill({ json: { data: [appointment], total: 1, has_more: false } });
  41  |     if (path.endsWith('/portal/timeline')) return route.fulfill({ json: { items: ['one', 'two'].map(suffix => ({ id: `event-${suffix}`, title: `Event ${suffix}`, type: 'photo', boat: { id: `boat-${suffix}`, name: `Boat ${suffix}` }, created_at: new Date().toISOString() })), pagination: { unread_count: 0 } } });
  42  |     if (path.endsWith('/portal/notifications')) return route.fulfill({ json: { latest: [], unread_count: 0 } });
  43  |     return route.fulfill({ json: { success: true, data: [], items: [], media_blocks: [], content_blocks: [], settings: {}, meta: { total: 0 } } });
  44  |   });
  45  |   return state;
  46  | }
  47  | 
  48  | async function passwordLogin(page: Page) {
  49  |   await page.locator('#email').fill(customer.email);
  50  |   await page.locator('#password').fill('portal-password-2026');
  51  |   await page.locator('form').getByRole('button', { name: 'Sign in', exact: true }).click();
  52  | }
  53  | 
  54  | test('password recovery preserves the appointment through the emailed reset and subsequent login', async ({ page }) => {
  55  |   const state = await fixture(page);
  56  |   const destination = '/en/dashboard/afspraken?appointment=appointment-one';
  57  |   await page.goto('/en/login?returnTo=' + encodeURIComponent(destination));
  58  |   await page.locator('form a[href*="forgot-password"]').click();
  59  |   expect(new URL(page.url()).searchParams.get('returnTo')).toBe(destination);
  60  |   await page.locator('input[type=email]').fill(customer.email);
  61  |   await page.locator('form button[type=submit]').click();
> 62  |   await expect(page.getByText('Check your inbox', { exact: true })).toBeVisible();
      |                                                                     ^ Error: expect(locator).toBeVisible() failed
  63  |   expect(state.posts.find(post => post.path.endsWith('/forgot-password'))?.body.returnTo).toBe(destination);
  64  |   await page.goto('/en/forgot-password?' + new URLSearchParams({ token: 'reset-fixture', email: customer.email, returnTo: destination }));
  65  |   await page.locator('input[type=password]').nth(0).fill('replacement-password');
  66  |   await page.locator('input[type=password]').nth(1).fill('replacement-password');
  67  |   await page.locator('form button[type=submit]').click();
  68  |   await page.getByRole('link', { name: 'Back to login', exact: true }).click();
  69  |   expect(new URL(page.url()).searchParams.get('returnTo')).toBe(destination);
  70  |   await passwordLogin(page);
  71  |   await expect(page.getByRole('dialog')).toBeVisible();
  72  | });
  73  | 
  74  | test('signup and its navigation retain the appointment destination', async ({ page }) => {
  75  |   const state = await fixture(page);
  76  |   const destination = '/en/dashboard/afspraken?appointment=appointment-one';
  77  |   await page.goto('/en/login?returnTo=' + encodeURIComponent(destination));
  78  |   await page.locator('form a[href*="signup"]').click();
  79  |   expect(new URL(page.url()).searchParams.get('returnTo')).toBe(destination);
  80  |   await page.locator('#name').fill(customer.name);
  81  |   await page.locator('#email').fill(customer.email);
  82  |   await page.locator('form button[type=submit]').click();
  83  |   await expect.poll(() => state.posts.find(post => post.path.endsWith('/customer/register'))?.body.returnTo).toBe(destination);
  84  |   await expect(page.locator(`a[href*="login?returnTo="]`).first()).toBeVisible();
  85  | });
  86  | 
  87  | test('CP09 magic callback preserves appointment and opens its details', async ({ page }) => {
  88  |   const state = await fixture(page);
  89  |   await page.goto('/en/portal/verify?token=fixture&returnTo=' + encodeURIComponent('/en/dashboard/afspraken?appointment=appointment-one'));
  90  |   await expect(page).toHaveURL(/dashboard\/afspraken\?appointment=appointment-one/);
  91  |   await expect(page.getByRole('dialog')).toBeVisible();
  92  |   expect(state.posts.filter(post => post.path.endsWith('/verify-magic-link'))).toHaveLength(1);
  93  | });
  94  | 
  95  | test('CP10 French preferred locale is used without an explicit destination', async ({ page }) => {
  96  |   const state = await fixture(page); state.locale = 'fr-FR';
  97  |   await page.goto('/en/portal/verify?token=fixture');
  98  |   await expect(page).toHaveURL(/\/fr\/feed$/);
  99  | });
  100 | 
  101 | test('CP11 expired magic link displays recovery', async ({ page }) => {
  102 |   const state = await fixture(page); state.verifyStatus = 422;
  103 |   await page.goto('/en/portal/verify?token=expired');
  104 |   await expect(page.getByRole('link', { name: /login|sign in/i })).toBeVisible();
  105 |   await expect(page).toHaveURL(/portal\/verify/);
  106 | });
  107 | 
  108 | test('CP12 absent magic token does not call verification', async ({ page }) => {
  109 |   const state = await fixture(page);
  110 |   await page.goto('/en/portal/verify');
  111 |   await expect(page.getByRole('link', { name: /login|sign in/i })).toBeVisible();
  112 |   expect(state.posts.some(post => post.path.endsWith('/verify-magic-link'))).toBe(false);
  113 | });
  114 | 
  115 | test('CP13 password login establishes portal session at appointment destination', async ({ page }) => {
  116 |   await fixture(page);
  117 |   await page.goto('/en/login?returnTo=' + encodeURIComponent('/en/dashboard/afspraken?appointment=appointment-one'));
  118 |   await passwordLogin(page);
  119 |   await expect(page.getByRole('dialog')).toBeVisible();
  120 |   expect((await page.context().cookies()).find(cookie => cookie.name === 'krek_portal_session')?.value).toBe('portal-fixture');
  121 | });
  122 | 
  123 | test('CP14 failed password login stays recoverable', async ({ page }) => {
  124 |   const state = await fixture(page); state.loginStatus = 422;
  125 |   await page.goto('/en/login'); await passwordLogin(page);
  126 |   await expect(page.getByText('Invalid credentials or expired link')).toBeVisible();
  127 |   await expect(page.locator('#password')).toBeEnabled();
  128 | });
  129 | 
  130 | test('CP15 forgot password calls API before showing sent confirmation', async ({ page }) => {
  131 |   const state = await fixture(page);
  132 |   await page.goto('/en/forgot-password');
  133 |   await page.locator('input[type=email]').fill(customer.email);
  134 |   await page.locator('form button[type=submit]').click();
  135 |   await expect(page.getByText('Check your inbox', { exact: true })).toBeVisible();
  136 |   expect(state.posts.find(post => post.path.endsWith('/forgot-password'))?.body).toMatchObject({ email: customer.email, locale: 'en' });
  137 | });
  138 | 
  139 | test('CP16 reset form submits emailed token email and confirmation', async ({ page }) => {
  140 |   const state = await fixture(page);
  141 |   await page.goto('/en/forgot-password?token=reset-fixture&email=' + encodeURIComponent(customer.email));
  142 |   const inputs = page.locator('input[type=password]');
  143 |   await inputs.nth(0).fill('replacement-password'); await inputs.nth(1).fill('replacement-password');
  144 |   await page.locator('form button[type=submit]').click();
  145 |   await expect(page.getByText('Your password has been saved', { exact: true })).toBeVisible();
  146 |   expect(state.posts.find(post => post.path.endsWith('/reset-password'))?.body).toMatchObject({ email: customer.email, token: 'reset-fixture', password_confirmation: 'replacement-password' });
  147 | });
  148 | 
  149 | test('CP17 magic link request carries appointment destination', async ({ page }) => {
  150 |   const state = await fixture(page); const destination = '/en/dashboard/afspraken?appointment=appointment-one';
  151 |   await page.goto('/en/login?returnTo=' + encodeURIComponent(destination));
  152 |   await page.getByRole('button', { name: 'Sign in without a password', exact: true }).click();
  153 |   await page.locator('#email').fill(customer.email);
  154 |   await page.getByRole('button', { name: 'Email me a sign-in link', exact: true }).click();
  155 |   await expect.poll(() => state.posts.find(post => post.path.endsWith('/magic-link'))?.body.returnTo).toBe(destination);
  156 | });
  157 | 
  158 | for (const destination of ['//example.com', '/\\example.com', '/en/admin', '/en/dashboard/../admin']) {
  159 |   test(`CP18 unsafe customer destination is rejected: ${destination}`, async ({ page }) => {
  160 |     await fixture(page);
  161 |     await page.goto('/en/login?returnTo=' + encodeURIComponent(destination)); await passwordLogin(page);
  162 |     await expect(page).toHaveURL(/\/en\/feed$/);
```