import { expect, test, type Page } from '@playwright/test';
import fs from 'node:fs';

const frenchCms = JSON.parse(fs.readFileSync('src/i18n/messages/fr.json', 'utf8')).cms;

async function fixture(page: Page) {
  const origin = new URL(test.info().project.use.baseURL!).origin;
  const submissions: Record<string, unknown>[] = [];
  const subject = { id: 'topic-1', key: 'algemeen', label_nl: 'Algemeen', label_en: 'General', label_de: 'Allgemein', label_fr: 'Question générale', category: 'general', recipient_email: null, sort_order: 10, active: true };
  await page.context().addCookies([{ name: 'krek_session', value: 'contact-test', url: origin }]);
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.origin !== origin) return route.abort();
    if (!url.pathname.startsWith('/api/')) return route.continue();
    if (url.pathname.endsWith('/auth/me')) return route.fulfill({ json: { id: 'editor', name: 'Editor', email: 'editor@example.test', role: 'super_admin', permissions: ['cms.manage'] } });
    if (url.pathname.endsWith('/cms/page-content')) return route.fulfill({ json: { content_blocks: [], media_blocks: [] } });
    if (url.pathname.includes('/admin/contact-subjects')) {
      if (route.request().method() === 'GET') return route.fulfill({ json: { data: [subject] } });
      Object.assign(subject, route.request().postDataJSON());
      return route.fulfill({ json: subject });
    }
    if (url.pathname.endsWith('/contact-subjects')) return route.fulfill({ json: { subjects: subject.active ? [{ key: subject.key, label: subject.label_fr, category: subject.category }] : [] } });
    if (url.pathname.endsWith('/content/contact')) return route.fulfill({ json: { show_chat: false, company: { name: 'Test Yard', email: 'yard@example.test', phone: '+31 (0)475 99 88 77', address: { street: 'Teststraat 12', postal_code: '1234 AB', city: 'Herten', country: 'NL' } } } });
    if (url.pathname.endsWith('/opening-hours')) return route.fulfill({ json: { status: { is_open: true, label: 'Ouvert' }, hours: [{ day: 'monday', label: 'Lundi', closed: false, display: '09:00 - 17:30', is_today: true }] } });
    if (url.pathname.endsWith('/contact') && route.request().method() === 'POST') {
      submissions.push(route.request().postDataJSON());
      return route.fulfill({ status: submissions.length === 1 ? 502 : 201, json: { message: submissions.length === 1 ? 'email_delivery_failed' : 'ok' } });
    }
    return route.fulfill({ json: { data: [], settings: {}, items: [] } });
  });
  return { submissions, subject };
}

test('French contact details, hours and failure retry retain a submission ID', async ({ page }) => {
  const state = await fixture(page);
  await page.goto('/fr/contact');
  await expect(page.getByText('yard@example.test', { exact: true })).toBeVisible();
  await expect(page.getByText('+31 (0)475 99 88 77', { exact: true })).toBeVisible();
  await expect(page.locator('a[href="tel:+31475998877"]')).toHaveCount(2);
  await expect(page.locator('a[href="mailto:yard@example.test"]')).toHaveCount(2);
  await expect(page.locator('iframe')).toHaveAttribute('src', /Teststraat%2012/);
  await expect(page.getByText('09:00 - 17:30', { exact: true })).toBeVisible();
  const form = page.locator('form').filter({ has: page.locator('textarea') });
  const inputs = form.locator('input:visible');
  await inputs.nth(0).fill('Marie Test');
  await inputs.nth(1).fill('marie@example.test');
  await form.getByRole('button', { name: 'Choisissez un objet…', exact: true }).click();
  await page.getByRole('option', { name: 'Question générale', exact: true }).click();
  await form.locator('textarea').fill('Bonjour, je souhaite des informations.');
  await form.getByRole('button', { name: 'Envoyer le message', exact: true }).click();
  await expect(form).toContainText('L’envoi a échoué');
  await form.getByRole('button', { name: 'Envoyer le message', exact: true }).click();
  await expect(page.getByText('Merci. Votre message a bien été reçu.', { exact: false })).toBeVisible();
  expect(state.submissions).toHaveLength(2);
  expect(state.submissions[0].submission_id).toMatch(/^[0-9a-f-]{36}$/);
  expect(state.submissions[1]).toEqual(state.submissions[0]);
  expect(state.submissions[0]).toMatchObject({ language: 'fr', source_locale: 'fr-FR', subject_key: 'algemeen' });
});

test('CMS editor saves French label, recipient, ordering and activation', async ({ page }) => {
  const state = await fixture(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/fr/contact');
  await page.getByRole('button', { name: frenchCms.enterEdit, exact: true }).click();
  await page.getByRole('button', { name: 'Objets de contact', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: /10 · Algemeen/ }).click();
  await dialog.getByLabel('Libellé (FR)', { exact: true }).fill('Question du chantier');
  await dialog.getByLabel('Destinataire', { exact: false }).fill('equipe@example.test');
  await dialog.getByLabel('Ordre', { exact: true }).fill('3');
  await dialog.getByLabel('Actif', { exact: true }).uncheck();
  await dialog.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await expect(dialog.getByRole('status')).toHaveText('Objet enregistré.');
  expect(state.subject).toMatchObject({ label_fr: 'Question du chantier', recipient_email: 'equipe@example.test', sort_order: 3, active: false });
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Objets de contact', exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('button', { name: /3 · Algemeen · Inactif/ })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.screenshot({ path: test.info().outputPath('subject-management-mobile.png'), fullPage: true });
});
