import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scanSource } from './audit-cms-coverage.mjs';

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
