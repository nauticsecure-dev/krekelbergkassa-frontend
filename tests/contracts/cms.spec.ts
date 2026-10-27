import { expect, test } from '@playwright/test';
import { API_BASE } from '../../src/lib/api';
import { cmsService } from '../../src/lib/services';
import { saveTextDraft, validateTranslations } from '../../src/components/cms/text-save';

const locales = ['nl-NL', 'en-GB', 'de-DE', 'fr-FR'];
const translations = { 'en-GB': 'Hello', 'de-DE': 'Hallo', 'fr-FR': 'Bonjour' };

test('CMS requests use the API base once and encode block keys', async () => {
  const originalFetch = globalThis.fetch;
  const requests: { url: URL; method: string; body: unknown }[] = [];
  globalThis.fetch = async (input, init) => {
    requests.push({ url: new URL(String(input)), method: init?.method ?? 'GET',
      body: init?.body ? JSON.parse(String(init.body)) : undefined });
    return Response.json({ translations });
  };
  try {
    await cmsService.pageContent('home', 'nl-NL');
    await cmsService.translate({ text: 'Hallo', source_locale: 'nl-NL', target_locales: locales.slice(1) });
    await cmsService.saveContentBlock('home/hero.title', { value_by_locale: { 'nl-NL': 'Hallo' } });
    const basePath = new URL(API_BASE.replace(/\/$/, '') + '/', 'http://localhost').pathname.replace(/\/$/, '');
    expect(requests.map((r) => r.url.pathname)).toEqual([
      `${basePath}/v1/cms/page-content`, `${basePath}/v1/admin/cms/translate`,
      `${basePath}/v1/admin/cms/content-blocks/home%2Fhero.title`,
    ]);
    expect(requests[0].url.searchParams.get('locale')).toBe('nl-NL');
    expect(requests.map((r) => r.method)).toEqual(['GET', 'POST', 'PATCH']);
    expect(requests[2].body).toEqual({ value_by_locale: { 'nl-NL': 'Hallo' } });
  } finally { globalThis.fetch = originalFetch; }
});

test('translation results must contain every requested nonempty string', () => {
  for (const response of [null, {}, { translations: [] }, { translations: {} },
    ...[null, 42, {}, [], '', '  '].map((bad) => ({ translations: { ...translations, 'de-DE': bad } }))]) {
    expect(() => validateTranslations(response, locales.slice(1))).toThrow();
  }
  expect(validateTranslations({ translations: { ...translations, unexpected: 'extra' } }, locales.slice(1)))
    .toEqual(translations);
});

function setup(autoTranslate = true) {
  const saved: unknown[] = [];
  const drafts: unknown[] = [];
  const calls: unknown[] = [];
  return { saved, drafts, calls, options: {
    values: { 'nl-NL': 'Nieuw' }, base: { 'nl-NL': 'Oud' }, source: 'nl-NL', locales, autoTranslate,
    translate: async (payload: unknown): Promise<unknown> => { calls.push(payload); return { translations }; },
    save: async (values: unknown) => { saved.push(values); },
    onTranslated: (values: unknown) => { drafts.push(values); },
  } };
}

test('checked translates before saving all languages', async () => {
  const { options, saved, calls } = setup();
  expect(await saveTextDraft(options)).toBe('translated');
  expect(calls).toEqual([{ text: 'Nieuw', source_locale: 'nl-NL', target_locales: locales.slice(1) }]);
  expect(saved).toEqual([{ 'nl-NL': 'Nieuw', ...translations }]);
});

test('unchecked saves only the edited language', async () => {
  const { options, saved, calls } = setup(false);
  expect(await saveTextDraft(options)).toBe('saved');
  expect(calls).toEqual([]);
  expect(saved).toEqual([{ 'nl-NL': 'Nieuw' }]);
});

test('manual translations survive and existing unedited languages are refreshed', async () => {
  const { options, saved, calls } = setup();
  expect(await saveTextDraft({ ...options,
    base: { ...options.base, 'en-GB': 'Old', 'de-DE': 'Alt' },
    values: { ...options.values, 'en-GB': 'Manual', 'de-DE': 'Alt' },
  })).toBe('translated');
  expect(calls).toEqual([{ text: 'Nieuw', source_locale: 'nl-NL', target_locales: ['de-DE', 'fr-FR'] }]);
  expect(saved).toEqual([{ 'nl-NL': 'Nieuw', 'en-GB': 'Manual', 'de-DE': 'Hallo', 'fr-FR': 'Bonjour' }]);
});

for (const failure of ['rejected', 'partial']) {
  test(`${failure} translation saves source only without merging partial output`, async () => {
    const { options, saved, drafts } = setup();
    const outcome = await saveTextDraft({ ...options, translate: async () => {
      if (failure === 'rejected') throw new Error('Provider failed');
      return { translations: { 'en-GB': 'Hello' } };
    } });
    expect(outcome).toBe('translationFailed');
    expect(saved).toEqual([{ 'nl-NL': 'Nieuw' }]);
    expect(drafts).toEqual([]);
  });
}

for (const translationFails of [true, false]) {
  test(`save failure rejects without returning success (translation fails: ${translationFails})`, async () => {
    const { options } = setup();
    await expect(saveTextDraft({ ...options,
      translate: async () => { if (translationFails) throw new Error('Translation failed'); return { translations }; },
      save: async () => { throw new Error('Save failed'); },
    })).rejects.toThrow('Save failed');
  });
}

test('no changes makes no save and failed translation does not claim a save', async () => {
  const { options, saved } = setup(false);
  expect(await saveTextDraft({ ...options, values: options.base })).toBe('unchanged');
  expect(await saveTextDraft({ ...options, values: options.base, autoTranslate: true,
    translate: async () => { throw new Error('Failed'); },
  })).toBe('translationFailedUnchanged');
  expect(saved).toEqual([]);
});
