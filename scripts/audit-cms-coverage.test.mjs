import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scanSource } from './audit-cms-coverage.mjs';
import { buildRegistry } from './build-cms-registry.mjs';
import { fileURLToPath } from 'node:url';

test('visible hardcoded JSX and translated copy without a binding are detected', () => {
  const result = scanSource('src/example.tsx', `const View = () => <><h1>New uneditable heading</h1><p>{t('example.title')}</p></>`);
  assert.equal(result.findings.filter(item => item.kind === 'hardcoded_jsx').length, 1);
  assert.equal(result.findings.filter(item => item.kind === 'unbound_translation').length, 1);
});
test('bindings keep canonical IDs and start UNTESTED', () => {
  const result = scanSource('src/example.tsx', `const View = () => <><TranslatedText textKey="example.title" /><EditableText blockKey="home.hero" page="home">{t('home.hero')}</EditableText><CompanyText field="email" /></>`);
  assert.deepEqual(result.fields.map(field => field.key), ['i18n.example.title', 'home.hero', 'company.email']);
  assert.ok(result.fields.every(field => field.status === 'UNTESTED'));
  assert.equal(result.findings.length, 0);
});
test('dynamic record values require source review and changes invalidate fingerprints', () => {
  const before = scanSource('src/example.tsx', `const View = () => <h1>{customer.name}</h1>`);
  assert.equal(before.findings[0].kind, 'dynamic_source_review');
  const after = scanSource('src/example.tsx', `const View = () => <h1>{boat.name}</h1>`);
  assert.notEqual(before.findings[0].fingerprint, after.findings[0].fingerprint);
});

test('registry authorizes exact real fields and generated legal/service fields, never arbitrary wildcard keys', () => {
  const registry = buildRegistry(fileURLToPath(new URL('../', import.meta.url)));
  for (const key of ['home.hero.title', 'home.hero.cta_primary.link', 'home.werf.cert_sub', 'over-ons.hiswa.desc',
    'privacy.section.0.body.0', 'diensten/winterstalling.feature.0.title', 'i18n.email.greeting']) assert.ok(registry.content_keys.includes(key), key);
  for (const key of ['arbitrary.unregistered', 'home.unregistered_random_field', 'i18n.unregistered_random_field']) assert.ok(!registry.content_keys.includes(key), key);
});

test('specialized dialogs remain visible in the denominator and cannot masquerade as main text editors', () => {
  const result = scanSource('src/example.tsx', '<><EditableHiswaCard/><EditableCertificationBadge/><EditableHeroCta blockKey="home.hero.cta"/><EditableImage blockKey="home.hero.image"/></>');
  assert.equal(result.fields.length, 8);
  assert.ok(result.fields.every(field => field.editor));
  assert.equal(result.fields.filter(field => field.source === 'media_block').length, 2);
});
