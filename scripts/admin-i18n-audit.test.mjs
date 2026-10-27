import test from 'node:test';
import assert from 'node:assert/strict';
import { translationCalls, checkCalls, hardcodedCopy } from './lib/admin-i18n-audit.mjs';

test('copy review finds JSX text and accessible labels without CSS/comments or translated copy', () => {
  const hits = hardcodedCopy(`// Ignore this comment\nconst x = <div className="grid grid-cols-2"><button aria-label="Collapse sidebar">Save</button><input placeholder={t('search')} /><p>{'Visible text'}</p></div>;`);
  assert.deepEqual(hits.map(hit => hit.text), ['Collapse sidebar', 'Save', 'Visible text']);
});

test('copy review follows conditional copy but ignores style bodies and spacing entities', () => {
  const hits = hardcodedCopy(`<><style>{'body { display: none }'}</style><span>&nbsp;</span><button className={busy ? 'hidden' : 'flex'}>{busy ? 'Saving' : 'Save'}</button><input placeholder={hint ?? 'Search here'} /></>`);
  assert.deepEqual(hits.map(hit=>hit.text), ['Saving', 'Save', 'Search here']);
});

test('AST finds multiline, const-prefix and conditional calls without parsing comments', () => {
  const calls = translationCalls("const prefix = 'hub'; // t('fake')\nt(`${prefix}.title`); t(flag ? 'a' : 'b'); t(\n'c', { defaultValue: 'Fallback' });");
  assert.deepEqual(calls.map((call) => call.patterns), [['hub.title'], ['a', 'b'], ['c']]);
  assert.equal(calls[2].line, 2);
});

test('fallbacks and empty values cannot conceal absent FR translations', () => {
  const calls = translationCalls("t('title', { defaultValue: 'Dutch' }); t('empty');");
  assert.deepEqual(checkCalls(calls, { nl: { title: 'Titel', empty: 'ok' }, fr: { empty: ' ' } }).missing.map((row) => row.key), ['title', 'empty']);
});

test('dynamic families check union parity and remain explicitly unresolved', () => {
  const result = checkCalls(translationCalls('t(`status.${state}`);'), {
    nl: { status: { paid: 'Betaald', failed: 'Mislukt' } }, fr: { status: { paid: 'Payé' } },
  });
  assert.deepEqual(result.missing.map((row) => [row.key, row.locales]), [['status.failed', ['fr']]]);
  assert.equal(result.unresolved.length, 1);
});

test('unknown branches, missing families and out-of-scope constants never claim coverage', () => {
  const result = checkCalls(translationCalls("t(key); t(`absent.${value}`); function a() { const prefix = 'private'; } t(`${prefix}.title`);"), { nl: {}, fr: {} });
  assert.equal(result.unresolved.length, 3);
  assert.equal(result.missing.length, 2);
});

test('bounded enum calls check every supported key in every locale', () => {
  const calls = translationCalls("tEnum(t, 'status', apiValue);", 'page.tsx', {
    status: { paid: 'status.paid', failed: 'status.failed' },
  });
  const result = checkCalls(calls, {
    nl: { status: { paid: 'Betaald', failed: 'Mislukt' } },
    fr: { status: { paid: 'Payé' } },
  });
  assert.equal(result.unresolved.length, 0);
  assert.deepEqual(result.missing.map((row) => [row.key, row.locales]), [['status.failed', ['fr']]]);
});

test('unknown, empty and runtime enum families still fail the strict gate', () => {
  const calls = translationCalls("tEnum(t, 'unknown', value); tEnum(t, 'empty', value); tEnum(t, runtimeFamily, value);", 'page.tsx', { empty: {} });
  assert.equal(checkCalls(calls, { nl: {}, fr: {} }).unresolved.length, 3);
});
