import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { randomBytes } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const frontend = fileURLToPath(new URL('../', import.meta.url));
const backend = path.resolve(frontend, '../krekelbergkassa-backend');
const runtime = fs.mkdtempSync(path.join(backend, 'storage/yard-local-'));
const storage = path.join(runtime, 'storage');
for (const name of ['framework/views', 'framework/cache/data', 'framework/sessions', 'logs', 'app']) fs.mkdirSync(path.join(storage, name), { recursive: true });
const database = path.join(runtime, 'yard.sqlite'); fs.writeFileSync(database, '');
const env = { ...process.env, YARD_LOCAL_ISOLATED: '1', APP_ENV: 'testing', APP_DEBUG: 'false',
  PLAYWRIGHT_BROWSERS_PATH: process.env.PLAYWRIGHT_BROWSERS_PATH ?? path.join(frontend, '.playwright-browsers'),
  LARAVEL_STORAGE_PATH: storage, APP_CONFIG_CACHE: path.join(runtime, 'config.php'), APP_ROUTES_CACHE: path.join(runtime, 'routes.php'),
  APP_KEY: 'base64:' + randomBytes(32).toString('base64'), DB_CONNECTION: 'sqlite', DB_DATABASE: database, DB_URL: '',
  DB_BUSY_TIMEOUT: '10000', DB_TRANSACTION_MODE: 'IMMEDIATE', CACHE_STORE: 'array', SESSION_DRIVER: 'array',
  MAIL_MAILER: 'array', QUEUE_CONNECTION: 'sync', BROADCAST_CONNECTION: 'null', FILESYSTEM_DISK: 'local',
  SEED_ADMIN_PASSWORD: randomBytes(24).toString('base64url'), YARD_LOCAL_FIXTURE: path.join(runtime, 'fixture-private.json'),
  MOLLIE_KEY: '', MOLLIE_TEST_KEY: '', MOLLIE_LIVE_KEY: '', OPENAI_API_KEY: '', ANTHROPIC_API_KEY: '',
  TWILIO_ACCOUNT_SID: '', TWILIO_AUTH_TOKEN: '', AWS_ACCESS_KEY_ID: '', AWS_SECRET_ACCESS_KEY: '',
  NEXT_DIST_DIR: '.next-yard-local', NEXT_PUBLIC_API_URL: '/api', E2E_DEV_LOW_MEMORY: '1',
  NEXT_FONT_GOOGLE_MOCKED_RESPONSES: path.join(frontend, 'tests/fixtures/journey-fonts.cjs') };
if (fs.existsSync(chromium.executablePath())) env.CROSS_BROWSER_CHROMIUM_EXECUTABLE ??= chromium.executablePath();
const children = [];
let stage = 'browser-startup';
const phpServerFlags = ['-d', 'opcache.enable_cli=1'];
function run(exe, args, cwd, filename) {
  const result = spawnSync(exe, args, { cwd, env, windowsHide: true, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  fs.writeFileSync(path.join(runtime, filename), (result.stdout ?? '') + (result.stderr ?? ''));
  if (result.error || result.status !== 0) throw new Error(filename + ' failed; inspect ' + runtime);
}
function suite(match, filename, expected) {
  run(process.execPath, ['node_modules/@playwright/test/cli.js', 'test', '--config=playwright.werfcanvas-live.config.ts', '--max-failures=1', match], frontend, filename);
  const { stats } = JSON.parse(fs.readFileSync(path.join(env.WERFCANVAS_LIVE_REPORT_DIR, 'results.json'), 'utf8'));
  if (stats.expected !== expected || stats.skipped || stats.unexpected || stats.flaky) {
    throw new Error(filename + ' did not produce the required uninterrupted pass without skips or retries.');
  }
}
async function port() {
  const server = net.createServer(); await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const value = server.address().port; await new Promise(resolve => server.close(resolve)); return value;
}
function start(exe, args, cwd, filename) {
  const fd = fs.openSync(path.join(runtime, filename), 'a');
  const child = spawn(exe, args, { cwd, env, windowsHide: true, stdio: ['ignore', fd, fd] });
  fs.closeSync(fd); children.push(child); return child;
}
async function ready(url, child) {
  const deadline = Date.now() + 240000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error('Local server exited; inspect ' + runtime);
    try { if ((await fetch(url, { signal: AbortSignal.timeout(10000) })).ok) return; } catch {}
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  throw new Error('Local server readiness timed out.');
}
try {
  console.log('Isolated local yard: ' + runtime);
  env.YARD_STARTUP_REPORT_FILE = path.join(runtime, 'browser-startup.json');
  run(process.execPath, ['scripts/check-yard-browsers.mjs'], frontend, 'browser-startup.log');
  // Cache PHP bytecode between HTTP requests, as a deployed PHP worker does.
  // Without it, two polling browsers can saturate Windows' single-threaded
  // development servers just bootstrapping Laravel on every request.
  const loaded = spawnSync('php', ['-r', 'echo extension_loaded("Zend OPcache") ? "1" : "0";'], { cwd: backend, env, windowsHide: true, encoding: 'utf8' });
  if (loaded.stdout === '0') {
    const available = spawnSync('php', ['-d', 'zend_extension=opcache', '-r', 'echo extension_loaded("Zend OPcache") ? "1" : "0";'],
      { cwd: backend, env, windowsHide: true, encoding: 'utf8' });
    if (available.status === 0 && available.stdout === '1') phpServerFlags.push('-d', 'zend_extension=opcache');
  }
  stage = 'database-fixture';
  run('php', ['artisan', 'migrate', '--force', '--no-interaction'], backend, 'migrations.log');
  for (const name of ['UserSeeder', 'OpeningHourSeeder']) run('php', ['artisan', 'db:seed', '--class=' + name, '--force', '--no-interaction'], backend, name + '.log');
  run('php', ['scripts/seed-yard-local.php'], backend, 'fixtures.log');
  const fixture = JSON.parse(fs.readFileSync(env.YARD_LOCAL_FIXTURE, 'utf8')); fs.unlinkSync(env.YARD_LOCAL_FIXTURE);
  [env.WERFCANVAS_RACE_FIRST_TOKEN, env.WERFCANVAS_RACE_SECOND_TOKEN] = fixture.tokens;
  env.WERFCANVAS_RACE_BOAT_ID = fixture.boat_id; env.WERFCANVAS_LOCAL_BOAT_NAME = fixture.boat_name;
  env.WERFCANVAS_RACE_DUE_AT = fixture.due_at;
  for (const [index, variable] of ['WERFCANVAS_RACE_API_URL', 'WERFCANVAS_RACE_SECOND_API_URL'].entries()) {
    const address = '127.0.0.1:' + await port(); env[variable] = 'http://' + address;
    const child = start('php', [...phpServerFlags, '-S', address, path.join(backend, 'vendor/laravel/framework/src/Illuminate/Foundation/resources/server.php')], path.join(backend, 'public'), 'backend-' + index + '.log');
    await ready(env[variable] + '/api/health', child);
  }
  stage = 'api-race';
  env.WERFCANVAS_LIVE_REPORT_DIR = path.join(runtime, 'api-race');
  suite('werfcanvas-live-concurrent.spec.ts', 'api-race.log', 1);
  console.log('Two-instance API race passed. Starting the real browser save check.');
  const webPort = await port(); env.WERFCANVAS_LOCAL_WEB_URL = 'http://127.0.0.1:' + webPort;
  const proxyPort = await port(); env.API_PROXY_TARGET = 'http://127.0.0.1:' + proxyPort;
  const proxy = start(process.execPath, ['scripts/yard-local-proxy.cjs', String(proxyPort),
    env.WERFCANVAS_RACE_API_URL, env.WERFCANVAS_RACE_SECOND_API_URL], frontend, 'proxy.log');
  await ready(env.API_PROXY_TARGET + '/api/health', proxy);
  const web = start(process.execPath, ['scripts/isolated-next-server.cjs', String(webPort)], frontend, 'frontend.log');
  await ready(env.WERFCANVAS_LOCAL_WEB_URL + '/sw.js', web);
  stage = 'browser-save-and-race';
  env.WERFCANVAS_LIVE_REPORT_DIR = path.join(runtime, 'browser');
  suite('werfcanvas-live-browser.spec.ts', 'browser-save.log', 9);
  fs.copyFileSync(path.join(runtime, 'browser/results.json'), path.join(runtime, 'browser-results.json'));
  fs.writeFileSync(path.join(runtime, 'result.json'), JSON.stringify({ status: 'PASS', environment: 'isolated-local',
    backendInstances: 2, boats: 250, database: 'SQLite IMMEDIATE transactions', apiRace: 'PASS', historyCoverage: 'PASS', realBrowserSave: 'PASS', realBrowserRace: 'PASS',
    browserEngines: ['webkit', 'firefox', 'chromium'], browserApiTopology: 'ordinary UI round-robin; racing clients pinned to distinct backend instances',
    hostPlatform: process.platform, productionWrites: false }, null, 2));
  console.log('PASS: two-instance race and real browser save/readback/reload. Evidence: ' + runtime);
} catch (error) {
  fs.writeFileSync(path.join(runtime, 'result.json'), JSON.stringify({ status: 'FAIL', stage, error: error.message,
    environment: 'isolated-local', productionWrites: false }, null, 2));
  console.error(error.message); process.exitCode = 1;
}
finally { for (const child of children.reverse()) if (child.exitCode === null) { child.kill('SIGTERM'); child.unref(); } }
