import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { readRows, writeRows } from './lib/cms-manifests.mjs';

const frontend = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const backend = path.resolve(frontend, '../krekelbergkassa-backend');
const flag = name => process.argv[process.argv.indexOf(name) + 1];
if (!process.argv.includes('--fixtures')) throw new Error('Provide --fixtures with trusted local scenario/role configuration.');
const config = JSON.parse(fs.readFileSync(path.resolve(flag('--fixtures')), 'utf8'));
const baseURL = new URL(config.baseURL).origin;
const local = ['localhost', '127.0.0.1', '[::1]'].includes(new URL(baseURL).hostname);
if (config.environment !== 'staging' && !(config.environment === 'local' && local)) throw new Error('Only staging or loopback local deployments are accepted.');
const frozenLocalSource = config.frozenLocalSource === true;
if (frozenLocalSource && (config.environment !== 'local' || !local || process.env.CMS_TEXT_ISOLATED !== '1' || !fs.existsSync(path.join(frontend, '../snapshot.json')))) {
  throw new Error('Frozen source optimization requires an isolated local snapshot.');
}
const directory = path.resolve(config.evidenceDirectory ?? path.join(backend, 'storage/quality-private'));
fs.mkdirSync(directory, { recursive: true });
const inventoryReport = JSON.parse(fs.readFileSync(path.join(directory, 'cms-static.json'), 'utf8'));
const inventory = inventoryReport.inventory;
inventory.required_fields = readRows(inventory, 'required_fields', 'field_manifest', directory);
inventory.route_matrix = readRows(inventory, 'route_matrix', 'route_manifest', directory);
const runId = crypto.randomUUID();
const runDir = path.join(directory, 'cms-runs', runId);
fs.mkdirSync(runDir, { recursive: true });
const report = { schema: 2, run_id: runId, environment: config.environment, build_hash: inventoryReport.build_hash,
  inventory_hash: inventory.source_hash, generated_at: new Date().toISOString(), fields: [], routes: [] };
const checkpoint = () => {
  fs.writeFileSync(path.join(directory, 'cms-progress.json'), JSON.stringify({ run_id: runId, fields: report.fields.length, routes: report.routes.length, last_field: report.fields.at(-1) }));
};
const persistReport = () => {
  const file = path.join(directory, config.environment === 'local' ? 'cms-functional-local.json' : 'cms-functional.json');
  const output = { ...report, fields: undefined, routes: undefined,
    field_manifest: writeRows(directory, `cms-${runId}.fields.ndjson`, report.fields),
    route_manifest: writeRows(directory, `cms-${runId}.routes.ndjson`, report.routes) };
  fs.writeFileSync(file + '.tmp', JSON.stringify(output, null, 2)); fs.renameSync(file + '.tmp', file);
};
function artifact(id, value) {
  const file = path.join(runDir, crypto.createHash('sha256').update(id).digest('hex') + '.json');
  fs.writeFileSync(file + '.tmp', JSON.stringify(value, null, 2)); fs.renameSync(file + '.tmp', file);
  return { path: path.relative(directory, file).replaceAll('\\', '/'), sha256: crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex') };
}
function probe(key, restoration = false, fullSourceCheck = false) {
  const args = ['artisan', 'quality:cms-probe', key, '--url=' + baseURL];
  if (frozenLocalSource && !fullSourceCheck) args.push('--local-source-hash=' + report.build_hash);
  const result = spawnSync(config.php ?? 'php', args, {
    cwd: backend, env: process.env, windowsHide: true, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024,
  });
  if (result.status !== 0) throw new Error('Database probe refused or failed; inspect the local runner configuration.');
  const value = JSON.parse(result.stdout.trim());
  if (!restoration && value.build_hash !== report.build_hash) {
    const error = new Error('Source changed during verification. Current-run proof is stale.');
    error.code = 'CMS_SOURCE_CHANGED';
    throw error;
  }
  return value;
}
if (frozenLocalSource) probe('home.hero.title', false, true);
const browser = await chromium.launch({ headless: true });
const contexts = new Map();
const sessions = new Map();
const observed = new Map();
async function context(role) {
  if (contexts.has(role)) return contexts.get(role);
  const account = config.roles?.[role];
  if (role !== 'guest' && !account) { contexts.set(role, null); return null; }
  const ctx = await browser.newContext({ baseURL, serviceWorkers: 'block', ...(account?.storageState ? { storageState: account.storageState } : {}) });
  if (account?.tokenEnv) {
    const token = process.env[account.tokenEnv];
    if (!token) { await ctx.close(); contexts.set(role, null); return null; }
    await ctx.addCookies([{ name: role === 'customer' ? 'krek_portal_session' : 'krek_session', value: token, url: baseURL }]);
  }
  if (role !== 'guest') {
    const name = role === 'customer' ? 'krek_portal_session' : 'krek_session';
    const cookie = (await ctx.cookies(baseURL)).find(cookie => cookie.name === name);
    const state = await ctx.storageState();
    const stored = state.origins.find(origin => origin.origin === baseURL)?.localStorage.find(item => item.name === name);
    const token = cookie?.value ?? stored?.value;
    const endpoint = role === 'customer' ? '/api/v1/portal/me' : '/api/v1/auth/me';
    let actor;
    try {
      const response = token && await ctx.request.get(baseURL + endpoint, { headers: { Authorization: 'Bearer ' + token }, maxRedirects: 0 });
      actor = response?.ok() ? await response.json() : null;
    } catch { actor = null; }
    const verified = role === 'customer' ? actor?.customer?.id : actor?.user?.role === role && actor.user.id;
    if (!verified) { await ctx.close(); contexts.set(role, null); return null; }
    sessions.set(role, { token, actor: verified });
  }
  contexts.set(role, ctx); return ctx;
}
async function actions(page, steps = []) {
  for (const step of steps) {
    if (step.click) await page.locator(step.click).click();
    else if (step.fill) await page.locator(step.fill.selector).fill(step.fill.value);
    else if (step.visible) await page.locator(step.visible).waitFor({ state: 'visible' });
    else if (step.hidden) await page.locator(step.hidden).waitFor({ state: 'hidden' });
    else if (step.text) {
      const locator = page.locator(step.text.selector);
      await locator.filter({ hasText: step.text.value }).waitFor({ state: 'visible' });
      assert.equal(await locator.innerText(), step.text.value);
    }
    else throw new Error('Unsupported scenario action.');
  }
}
function onSiteURL(route, locale) {
  const resolved = new URL(route.replaceAll('[locale]', locale), baseURL);
  assert.equal(resolved.origin, baseURL, 'Fixture must stay on the deployment origin.');
  return resolved.href;
}
function waitForApi(page, endpoint, method) {
  const pending = page.waitForResponse(response => {
    const url = new URL(response.url());
    return url.origin === baseURL && url.pathname === '/api/v1/admin/cms/' + endpoint && response.request().method() === method;
  });
  // The UI action can fail before the caller awaits the network response.
  pending.catch(() => {});
  return pending;
}
try {
  // The denominator is discovered, never reduced to the configured happy paths.
  for (const row of inventory.route_matrix ?? []) {
    const result = { id: row.id, run_id: runId, status: 'UNTESTED', reason: row.reason, steps: {} };
    report.routes.push(result);
    const scenario = config.scenarios?.[row.id] ?? config.scenarios?.[`${row.file}:${row.role}:${row.state}`];
    if (!scenario) { result.status = 'BLOCKED'; result.reason = 'A state scenario and expected authorization outcome are required.'; continue; }
    if (scenario.excluded) { result.status = 'EXCLUDED'; result.reason = scenario.excluded; continue; }
    const ctx = await context(row.role);
    if (!ctx) { result.status = 'BLOCKED'; result.reason = 'Verified role session is missing.'; continue; }
    const page = await ctx.newPage();
    try {
      const route = (scenario.url ?? row.route).replaceAll('[locale]', row.locale);
      if (/\[[^\]]+\]/.test(route)) {
        result.status = 'BLOCKED'; result.reason = 'Authorized dynamic-route fixture is missing.'; continue;
      }
      const url = onSiteURL(route, row.locale);
      const response = await page.goto(url, { waitUntil: 'domcontentloaded' });
      assert.equal(response?.status(), scenario.httpStatus ?? 200);
      await actions(page, scenario.actions);
      assert.ok(scenario.assertions?.length, 'A navigation alone is not state/authorization proof.');
      await actions(page, scenario.assertions);
      if (scenario.expectedURL) assert.equal(page.url(), onSiteURL(scenario.expectedURL, row.locale));
      assert.equal(new URL(page.url()).origin, baseURL);
      result.steps = { browser: true, assertions: true }; result.status = 'PASS'; result.reason = '';
      const surfaces = await page.locator('[data-cms-field-id]').evaluateAll(nodes => nodes.map(node => ({
        key: node.getAttribute('data-cms-key'), field_id: node.getAttribute('data-cms-field-id'), source: node.getAttribute('data-cms-source'),
        record_id: node.getAttribute('data-cms-record-id'), version: node.getAttribute('data-cms-version'),
      })));
      for (const surface of surfaces) if (row.role === 'super_admin' && !scenario.readOnly) {
        const key = `${surface.key}:${row.locale}`;
        const variants = observed.get(key) ?? [];
        if (!variants.some(item => item.url === url && item.state === row.state)) variants.push({ ...surface, url, state: row.state,
          file: row.file, dependencies: inventory.routes.find(route => route.file === row.file)?.dependencies ?? [], actions: scenario.actions ?? [] });
        observed.set(key, variants);
      }
      result.artifacts = [artifact(row.id, { url, final_url: page.url(), role: row.role, actor_id: sessions.get(row.role)?.actor,
        state: row.state, surfaces, assertions: scenario.assertions })];
    } catch (error) { result.status = 'FAIL'; result.reason = error.message; }
    finally { await page.close(); checkpoint(); }
  }

  const editor = await context('super_admin');
  const { token, actor } = sessions.get('super_admin') ?? {};
  const tags = { nl: 'nl-NL', en: 'en-GB', de: 'de-DE', fr: 'fr-FR' };
  for (const field of inventory.required_fields ?? []) {
    const row = { id: field.id, run_id: runId, status: 'UNTESTED', reason: 'Not selected in this run.', steps: {} };
    report.fields.push(row);
    if (config.onlyKeys && !config.onlyKeys.includes(field.key)) continue;
    const variants = (observed.get(`${field.key}:${field.locale}`) ?? []).filter(surface => surface.file === field.file || surface.dependencies.includes(field.file));
    const surface = variants[0];
    const fixture = config.fields?.[field.key];
    const settings = ['EditableGlobalText', 'EditableHeaderCta'].includes(field.editor) && field.key !== 'header.cta.path';
    const cards = { EditableCertificationBadge: '[data-cms-badge]', EditableHiswaCard: '[data-cms-card]' };
    const batch = !!cards[field.editor] || (field.editor === 'EditableHeroCta' && !field.key?.endsWith('.link'));
    if (!editor || !token || !field.key || (!surface && !fixture && field.surface !== 'catalog')) {
      row.status = 'BLOCKED'; row.reason = 'Missing canonical field, reachable editor surface or authorized editor session.'; continue;
    }
    if (!settings && !['content_block', 'i18n'].includes(field.source)) {
      row.status = 'BLOCKED'; row.reason = 'Canonical settings/record adapter requires its own versioned mutation and restore scenario.'; continue;
    }
    if (field.editor && !settings && !batch) {
      row.status = 'BLOCKED'; row.reason = 'Specialized editor requires its own field-specific mutation scenario: ' + field.editor; continue;
    }
    const key = field.key;
    const encoded = encodeURIComponent(key);
    const endpoint = (settings ? 'global-settings/' : 'content-blocks/') + encoded;
    const tag = tags[field.locale];
    const valuesByLocale = values => settings && typeof values === 'string'
      ? Object.fromEntries(Object.values(tags).map(locale => [locale, values])) : values;
    const fieldSelector = fixture?.selector ?? `[data-cms-key=${JSON.stringify(key)}]`;
    const rendered = page => page.locator(fieldSelector + ':visible').first();
    const visibleMarker = page => page.locator(fieldSelector + ':visible').filter({ hasText: marker }).first();
    const marker = 'CMS_QA_' + runId.slice(0, 8) + '_' + field.locale;
    let before, after, page, savedRevision, restoreRequired = false;
    const proof = {};
    try {
      before = probe(key);
      Object.assign(proof, { key, locale: field.locale, marker, before });
      row.artifacts = [artifact(field.id, proof)]; checkpoint();
      if (!before.record_id && /^(?:i18n\.)?home\.svc\./.test(key)) {
        const error = new Error('The canonical service record needs a fixture.'); error.blocked = true; throw error;
      }
      page = await editor.newPage();
      await page.goto(onSiteURL(fixture?.url ?? surface?.url ?? '/[locale]', field.locale));
      const pageActions = fixture?.actions ?? surface?.actions;
      await actions(page, pageActions);
      proof.url = page.url();
      if (field.surface !== 'catalog') proof.rendered_before = await rendered(page).textContent();
      await page.locator('[data-cms-toggle]').click();
      const hiswa = field.editor === 'EditableHiswaCard';
      const loaded = waitForApi(page, settings ? 'global-settings' : hiswa ? 'content-blocks' : endpoint, 'GET');
      if (field.surface === 'catalog') {
        await page.locator('[data-cms-catalog-open]').click();
        await page.locator('[data-cms-catalog-search]').fill(key.slice(5));
        await page.locator(`[data-cms-catalog-key=${JSON.stringify(key.slice(5))}]`).click();
      } else if (cards[field.editor]) {
        await page.locator(cards[field.editor]).filter({ has: page.locator(fieldSelector) }).locator('[data-cms-edit]').click();
      } else if (field.editor === 'EditableGlobalText') await rendered(page).locator('[data-cms-edit]').click();
      else await rendered(page).click();
      const loadedRecord = await (await loaded).json();
      const loadedRevision = settings ? loadedRecord.revisions?.[key] : hiswa
        ? loadedRecord.data.find(record => record.key === key)?.cms_revision ?? null : loadedRecord.cms_revision;
      assert.equal(loadedRevision, before.revision, 'Field changed while editor opened');
      const dialog = page.getByRole('dialog');
      const input = settings ? dialog.locator(`[data-cms-setting-input=${JSON.stringify(key)}]`)
        : batch ? dialog.locator(`[data-cms-text-input=${JSON.stringify(key)}]`) : dialog.locator('textarea');
      if (field.editor === 'EditableHiswaCard') await dialog.locator(`[data-cms-editor-locale="${tag}"]`).click();
      else {
        const tab = dialog.getByRole('tab', { name: field.locale.toUpperCase(), exact: true });
        if (settings) await dialog.locator(`[data-cms-setting-editor=${JSON.stringify(key)}]`).getByRole('tab', { name: field.locale.toUpperCase(), exact: true }).click();
        else await tab.click();
      }
      await input.fill(marker); row.steps.edit = true;
      row.artifacts = [artifact(field.id, proof)]; checkpoint();
      restoreRequired = true;
      const saved = waitForApi(page, batch ? 'content-blocks' : endpoint, 'PATCH');
      await dialog.locator(settings ? '[data-cms-save]' : '[data-cms-publish]').click();
      const savedResponse = await saved;
      assert.equal(savedResponse.status(), 200);
      const savedRecord = await savedResponse.json();
      savedRevision = (batch ? savedRecord.data.find(record => record.key === key) : savedRecord)?.cms_revision;
      assert.ok(savedRevision, 'Mutation did not return a revision.');
      proof.saved_revision = savedRevision;
      row.artifacts = [artifact(field.id, proof)]; checkpoint();
      await dialog.waitFor({ state: 'hidden' }); row.steps.save = true;
      after = probe(key); proof.before = before; proof.after = after;
      assert.equal(after.revision, savedRevision, 'Record changed after this run saved');
      assert.equal(after.values[tag], marker); assert.equal(after.published_values[tag], marker); row.steps.database = true;
      assert.equal(after.unrelated_hash, before.unrelated_hash);
      if (before.record_id) assert.equal(after.other_fields_hash, before.other_fields_hash);
      row.steps.unrelated_fields = true;
      const untouched = values => Object.fromEntries(Object.entries(valuesByLocale(values)).filter(([locale]) => locale !== tag));
      assert.deepEqual(untouched(after.values), untouched(before.values));
      assert.deepEqual(untouched(after.published_values), untouched(before.published_values)); row.steps.other_locales = true;
      assert.ok(after.audit?.id && after.audit.id !== before.audit?.id);
      assert.equal(after.audit.user_id, actor);
      const auditField = after.field;
      const auditedValues = after.audit.after_data?.[auditField];
      assert.equal(auditedValues?.[tag], marker);
      assert.deepEqual(after.audit.before_data?.[auditField] ?? [], before.values);
      row.steps.audit = true;
      await page.evaluate(() => sessionStorage.clear()); await page.reload();
      await actions(page, pageActions);
      if (field.surface !== 'catalog') await visibleMarker(page).waitFor();
      else {
        const publicRead = await page.request.get(baseURL + '/api/v1/cms/page-content?page=global&locale=' + tags[field.locale]);
        assert.equal((await publicRead.json()).content_blocks.find(block => block.key === key)?.value, marker);
      }
      row.steps.reload = true;
      // The same canonical field can appear on multiple routes. Verify every
      // discovered presentation for this source, not just the editor trigger.
      for (const presentation of variants.filter(item => item.url !== surface?.url || item.state !== surface?.state)) {
        await page.goto(presentation.url); await actions(page, presentation.actions);
        await visibleMarker(page).waitFor();
      }
    } catch (error) { row.status = error.code === 'CMS_SOURCE_CHANGED' ? 'STALE' : error.blocked ? 'BLOCKED' : 'FAIL'; row.reason = error.message; }
    finally {
      if (restoreRequired) {
        try {
          // Never restore against a revision fetched after a third party edit.
          after = probe(key, true);
          if (after.build_hash !== report.build_hash) { row.status = 'STALE'; row.reason = 'Source changed during verification. This proof cannot approve a release.'; }
          if (!savedRevision) {
            assert.equal(after.revision, before.revision, 'Unconfirmed write or newer data; automatic restore refused');
            assert.deepEqual(after.values, before.values); assert.deepEqual(after.published_values, before.published_values);
            proof.no_mutation = true; row.steps.restore = true;
          } else {
            assert.equal(after.revision, savedRevision, 'Newer changes exist; automatic restore refused');
            assert.ok(after.audit?.id && after.audit.id !== before?.audit?.id, 'No audited mutation to restore');
            assert.equal(after.values[tags[field.locale]], marker, 'Newer editor data detected');
            const response = await editor.request.post(baseURL + '/api/v1/admin/cms/' + endpoint + '/restore', {
              headers: { Authorization: 'Bearer ' + token, Accept: 'application/json' }, data: { expected_revision: savedRevision, audit_id: after.audit.id },
            });
            assert.equal(response.status(), 200, 'Version-checked restoration was refused');
            const restored = probe(key, true); assert.deepEqual(restored.values, before.values); assert.deepEqual(restored.published_values, before.published_values);
            row.steps.restore = true; proof.restored = restored;
            if (restored.build_hash !== report.build_hash) { row.status = 'STALE'; row.reason = 'Source changed during verification. This proof cannot approve a release.'; }
            if (row.status !== 'STALE' && proof.rendered_before !== undefined) {
              await page.evaluate(() => sessionStorage.clear()); await page.goto(proof.url); await actions(page, fixture?.actions ?? surface?.actions);
              await page.waitForFunction(({ selector, text }) => [...document.querySelectorAll(selector)]
                .some(node => node.getClientRects().length && node.textContent === text), { selector: fieldSelector, text: proof.rendered_before });
            }
          }
        } catch (error) { row.status = 'BLOCKED'; row.reason = 'RESTORE NEEDS ATTENTION: ' + error.message; }
      }
      if (row.status === 'UNTESTED' && Object.keys(row.steps).length === 8 && Object.values(row.steps).every(Boolean)) { row.status = 'PASS'; row.reason = ''; }
      row.artifacts = [artifact(field.id, proof)];
      await page?.close(); checkpoint();
      if (row.reason.startsWith('RESTORE NEEDS ATTENTION')) throw new Error(row.reason);
    }
    if (row.status === 'STALE') break;
  }
} finally {
  if (frozenLocalSource) {
    try { probe('home.hero.title', false, true); }
    catch (error) {
      for (const row of [...report.fields, ...report.routes]) if (row.status === 'PASS') {
        row.status = error.code === 'CMS_SOURCE_CHANGED' ? 'STALE' : 'BLOCKED';
        row.reason = 'Frozen source verification failed: ' + error.message;
      }
    }
  }
  persistReport(); await browser.close();
  const counts = [...report.fields, ...report.routes].reduce((out, row) => ({ ...out, [row.status]: (out[row.status] ?? 0) + 1 }), {});
  console.log(JSON.stringify({ runId, environment: config.environment, counts, directory }, null, 2));
}
if ([...report.fields, ...report.routes].some(row => row.status !== 'PASS' && row.status !== 'EXCLUDED')) process.exitCode = 1;
