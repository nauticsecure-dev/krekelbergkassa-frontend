import { expect, test } from '@playwright/test';

test('logs in and loads the Dutch admin home', async ({ page }) => {
  const email = process.env.E2E_ADMIN_EMAIL;
  const password = process.env.E2E_ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error('Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD before running the smoke test.');
  }

  // Default login role is customer (magic link, no password). Manager shows the password form
  // and sends staff to /admin.
  await page.goto('/nl/login?role=manager');
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  await page.locator('form button[type="submit"]').click();

  await expect(page).toHaveURL(/\/nl\/admin\/?$/);
  await expect(page.getByRole('heading', { name: 'Operationeel overzicht' })).toBeVisible();
});
