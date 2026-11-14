const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const source = ts.transpileModule(fs.readFileSync(require('node:path').join(__dirname, '../src/lib/quality-navigation.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
function load(env = {}, api, extras = {}) {
  const exports = {};
  vm.runInNewContext(source, { exports, process: { env: { NEXT_PUBLIC_API_URL: api, ...env } }, require: () => ({ getAuthToken: () => 'fixture-bearer' }), AbortSignal, URL, ...extras });
  return exports;
}
test('QA URLs derive from direct API/QA configuration and preserve deployment prefixes', () => {
  assert.equal(load().qualityUrls('en'), null);
  assert.equal(load({}, '/api').qualityUrls('en'), null);
  assert.equal(load({ QUALITY_API_PROXY_TARGET: 'https://staging-api.example/deployment/public/' }, '/api').qualityUrls('en').base, 'https://staging-api.example/deployment/public/api/v1/quality');
  assert.equal(load({ QUALITY_API_PROXY_TARGET: 'https://internal.example', NEXT_PUBLIC_QUALITY_ORIGIN: 'https://qa.example/prefix' }, '/api').qualityUrls('en').base, 'https://qa.example/prefix/api/v1/quality');
  assert.equal(load({ QUALITY_API_PROXY_TARGET: 'https://internal.example' }, '//other.example/api').qualityUrls('en'), null);
  assert.equal(load({ NEXT_PUBLIC_QUALITY_ORIGIN: 'https://user:secret@qa.example' }).qualityUrls('en'), null);
  assert.equal(load({}, 'https://backend.example/api/v1').qualityUrls('fr').assigned, 'https://backend.example/api/v1/quality/assigned?locale=fr');
  assert.equal(load({ NEXT_PUBLIC_QUALITY_ORIGIN: 'https://qa.example' }).qualityUrls('de').portal, 'https://qa.example/api/v1/admin/quality/portal?locale=de');
  assert.equal(load({ NEXT_PUBLIC_QUALITY_ASSIGNED_URL: 'http://localhost/prefix/public/api/v1/quality/assigned?locale=nl' }).qualityUrls('en').base, 'http://localhost/prefix/public/api/v1/quality');
});
test('handoff sends bearer only in authenticated request and posts only a code to the QA host', async () => {
  const requests = [], forms = [];
  const helper = load({}, 'https://qa.example/api', {
    fetch: async (url, options) => { requests.push({ url, options }); return { ok: true, json: async () => ({ code: 'one-use-code' }) }; },
    document: { body: { append: form => forms.push(form) }, createElement: () => ({ children: [], append(input) { this.children.push(input); }, submit() { this.submitted = true; }, remove() {} }) },
  });
  await helper.openQuality(helper.qualityUrls('en').assigned, 'en');
  assert.equal(requests[0].options.headers.Authorization, 'Bearer fixture-bearer');
  assert.equal(forms[0].action, 'https://qa.example/api/v1/quality/session/open');
  assert.equal(forms[0].method, 'POST');
  assert.equal(forms[0].children[0].name, 'code');
  assert.equal(forms[0].children[0].value, 'one-use-code');
  assert.ok(forms[0].submitted);
  assert.ok(!forms[0].action.includes('fixture-bearer'));
  await assert.rejects(helper.openQuality('https://evil.example', 'en'), /Invalid QA/);
});
test('network denial hides QA and a failed handoff leaves the current page recoverable', async () => {
  const helper = load({}, 'https://qa.example/api', { fetch: async () => ({ ok: false, status: 403 }) });
  assert.equal((await helper.qualityAccess(helper.qualityUrls('en').base, new AbortController().signal)).assigned, false);
  await assert.rejects(helper.openQuality(helper.qualityUrls('en').assigned, 'en'), /403/);
});
