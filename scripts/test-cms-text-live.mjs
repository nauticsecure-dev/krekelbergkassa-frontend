import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { randomBytes } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { readRows } from './lib/cms-manifests.mjs';

const frontend = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const backend = path.resolve(frontend, '../krekelbergkassa-backend');
const runtime = fs.mkdtempSync(path.join(backend, 'storage', 'cms-text-live-'));
const storage = path.join(runtime, 'storage');
for (const dir of ['framework/views', 'framework/cache/data', 'framework/sessions', 'logs', 'app', 'quality-private']) fs.mkdirSync(path.join(storage, dir), { recursive: true });
const database = path.join(runtime, 'fixtures.sqlite'); fs.writeFileSync(database, '');
const env = { ...process.env, APP_ENV: 'testing', APP_DEBUG: 'false', CMS_TEXT_ISOLATED: '1',
  LARAVEL_STORAGE_PATH: storage, APP_CONFIG_CACHE: path.join(runtime, 'config.php'), APP_ROUTES_CACHE: path.join(runtime, 'routes.php'),
  APP_KEY: 'base64:' + randomBytes(32).toString('base64'), DB_CONNECTION: 'sqlite', DB_DATABASE: database, DB_URL: '',
  CACHE_STORE: 'array', SESSION_DRIVER: 'array', MAIL_MAILER: 'array', QUEUE_CONNECTION: 'sync', BROADCAST_CONNECTION: 'null',
  FILESYSTEM_DISK: 'local', SEED_ADMIN_PASSWORD: randomBytes(24).toString('base64url'), CMS_TEXT_TOKEN_FILE: path.join(runtime, 'editor-token'),
  QA_STAGING_ENABLED: 'true', MOLLIE_KEY: '', MOLLIE_TEST_KEY: '', MOLLIE_LIVE_KEY: '', OPENAI_API_KEY: '', ANTHROPIC_API_KEY: '',
  TWILIO_ACCOUNT_SID: '', TWILIO_AUTH_TOKEN: '', AWS_ACCESS_KEY_ID: '', AWS_SECRET_ACCESS_KEY: '', SENTRY_DSN: '', SENTRY_LARAVEL_DSN: '',
  NEXT_DIST_DIR: '.next-cms-text-live', NEXT_PUBLIC_API_URL: '/api', NEXT_FONT_GOOGLE_MOCKED_RESPONSES: path.join(frontend, 'tests/fixtures/journey-fonts.cjs') };
const children = [];
function run(exe, args, cwd, log, allowed = [0]) {
  const result = spawnSync(exe, args, { cwd, env, encoding: 'utf8', windowsHide: true, maxBuffer: 32 * 1024 * 1024 });
  fs.writeFileSync(path.join(runtime, log), (result.stdout ?? '') + (result.stderr ?? ''));
  if (result.error || !allowed.includes(result.status)) throw new Error(log + ' failed. Inspect ' + runtime);
}
async function port() {
  const server = net.createServer(); await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const value = server.address().port; await new Promise(resolve => server.close(resolve)); return value;
}
function start(exe, args, cwd, log) {
  const fd = fs.openSync(path.join(runtime, log), 'a'); const child = spawn(exe, args, { cwd, env, windowsHide: true, stdio: ['ignore', fd, fd] });
  fs.closeSync(fd); children.push(child); return child;
}
async function ready(url, child) {
  const deadline = Date.now() + 300000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error('Local server exited. Inspect ' + runtime);
    try { if ((await fetch(url, { signal: AbortSignal.timeout(10000) })).ok) return; } catch {}
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  throw new Error('Local server readiness timed out.');
}
try {
  console.log('Isolated local CMS runtime: ' + runtime);
  run('php', ['artisan', 'migrate', '--force', '--no-interaction'], backend, 'migrations.log');
  for (const seeder of ['UserSeeder', 'ServiceProductSeeder', 'SettingsSeeder']) run('php', ['artisan', 'db:seed', '--class=' + seeder, '--force', '--no-interaction'], backend, seeder + '.log');
  run('php', ['scripts/seed-cms-text-live.php'], backend, 'fixtures.log');
  env.CMS_LOCAL_EDITOR_TOKEN = fs.readFileSync(env.CMS_TEXT_TOKEN_FILE, 'utf8');
  const apiPort = await port(); env.APP_URL = 'http://127.0.0.1:' + apiPort;
  const api = start('php', ['-d', 'zend_extension=opcache', '-d', 'opcache.enable_cli=1', '-S', '127.0.0.1:' + apiPort,
    path.join(backend, 'vendor/laravel/framework/src/Illuminate/Foundation/resources/server.php')], path.join(backend, 'public'), 'backend.log');
  await ready(env.APP_URL + '/api/health', api);
  const webPort = await port(); env.QA_STAGING_URL = 'http://127.0.0.1:' + webPort; env.API_PROXY_TARGET = env.APP_URL;
  const web = start(process.execPath, ['scripts/isolated-next-server.cjs', String(webPort)], frontend, 'frontend.log');
  for (const locale of ['nl', 'en', 'de', 'fr']) { console.log('Warming local /' + locale); await ready(env.QA_STAGING_URL + '/' + locale, web); }
  run('php', ['artisan', 'quality:cms-inventory'], backend, 'inventory.log');
  const fixtures = { environment: 'local', frozenLocalSource: process.env.CMS_FROZEN_LOCAL_SOURCE === '1', baseURL: env.QA_STAGING_URL, evidenceDirectory: path.join(storage, 'quality-private'),
    roles: { super_admin: { tokenEnv: 'CMS_LOCAL_EDITOR_TOKEN' } },
    scenarios: { 'src/app/[locale]/(site)/page.tsx:super_admin:default': { assertions: [{ visible: 'main h1' }, { visible: '[data-cms-key="home.hero.title"]' }] } },
    onlyKeys: ['home.hero.title', 'i18n.footer.services', ...['crane', 'wash', 'storage', 'diy', 'sale', 'week'].flatMap(service => ['title', 'tagline', 'desc'].map(field => `home.svc.${service}.${field}`))] };
  const fixtureFile = path.join(runtime, 'scenarios.json'); fs.writeFileSync(fixtureFile, JSON.stringify(fixtures, null, 2));
  console.log('Verifying real local UI saves, database, reloads, audits, isolation and restoration in all four locales.');
  run(process.execPath, ['scripts/verify-cms-staging.mjs', '--fixtures', fixtureFile], frontend, 'verification.log', [0, 1]);
  const report = JSON.parse(fs.readFileSync(path.join(storage, 'quality-private/cms-functional-local.json'), 'utf8'));
  const selected = readRows(report, 'fields', 'field_manifest', path.join(storage, 'quality-private')).filter(row => row.status !== 'UNTESTED');
  const passed = selected.filter(row => row.status === 'PASS');
  const result = { status: selected.length === fixtures.onlyKeys.length * 4 && passed.length === selected.length ? 'PASS' : 'FAIL',
    environment: 'isolated-local', selected: selected.length, passed: passed.length, productionWrites: false,
    allWebsiteCoverage: 'UNTESTED', report: path.join(storage, 'quality-private/cms-functional-local.json') };
  fs.writeFileSync(path.join(runtime, 'result.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
  if (result.status !== 'PASS') process.exitCode = 1;
} catch (error) { console.error(error.message); process.exitCode = 1; }
finally { for (const child of children.reverse()) { if (child.exitCode === null) { child.kill('SIGTERM'); child.unref(); } } }
