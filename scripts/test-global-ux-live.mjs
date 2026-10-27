import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { randomBytes } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const frontend = fileURLToPath(new URL('../', import.meta.url));
const backend = path.resolve(frontend, '../krekelbergkassa-backend');
const runtime = fs.mkdtempSync(path.resolve(frontend, '../_audit/global-ux-live-'));
const php = process.env.E2E_PHP_BIN || (process.platform === 'win32' ? 'C:/wamp64/bin/php/php8.4.15/php.exe' : 'php');
const database = path.join(runtime, 'fixtures.sqlite');
fs.writeFileSync(database, '');
const env = { ...process.env, APP_ENV: 'testing', APP_DEBUG: 'false', GLOBAL_UX_LIVE: '1',
  APP_KEY: 'base64:' + randomBytes(32).toString('base64'), APP_CONFIG_CACHE: path.join(runtime, 'config.php'), APP_ROUTES_CACHE: path.join(runtime, 'routes.php'),
  DB_CONNECTION: 'sqlite', DB_DATABASE: database, DB_URL: '', CACHE_STORE: 'array', SESSION_DRIVER: 'array',
  MAIL_MAILER: 'array', BROADCAST_CONNECTION: 'null', QUEUE_CONNECTION: 'sync', FILESYSTEM_DISK: 'local',
  SEED_ADMIN_PASSWORD: randomBytes(24).toString('base64url'), E2E_GLOBAL_PASSWORD: randomBytes(24).toString('base64url'),
  E2E_PHP_BIN: php, E2E_GLOBAL_FIXTURES: path.join(runtime, 'records.json'), E2E_GLOBAL_RUNTIME: runtime,
  MOLLIE_KEY: '', MOLLIE_TEST_KEY: '', MOLLIE_LIVE_KEY: '', OPENAI_API_KEY: '', ANTHROPIC_API_KEY: '', TWILIO_ACCOUNT_SID: '', TWILIO_AUTH_TOKEN: '',
  AWS_ACCESS_KEY_ID: '', AWS_SECRET_ACCESS_KEY: '', SENTRY_LARAVEL_DSN: '', SENTRY_DSN: '',
  NEXT_PUBLIC_API_URL: '/api', NEXT_DIST_DIR: '.next-global-ux-live', NEXT_FONT_GOOGLE_MOCKED_RESPONSES: path.join(frontend, 'tests/fixtures/journey-fonts.cjs') };
const children = [];
function run(exe, args, cwd, filename) {
  const result = spawnSync(exe, args, { cwd, env, windowsHide: true, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
  fs.writeFileSync(path.join(runtime, filename), (result.stdout || '') + (result.stderr || ''));
  if (result.error || result.status !== 0) throw new Error(filename + ' failed; inspect ' + runtime);
}
async function port() {
  const s = net.createServer(); await new Promise((resolve, reject) => { s.once('error', reject); s.listen(0, '127.0.0.1', resolve); });
  const value = s.address().port; await new Promise(resolve => s.close(resolve)); return value;
}
function start(exe, args, cwd, filename) {
  const fd = fs.openSync(path.join(runtime, filename), 'a');
  const child = spawn(exe, args, { cwd, env, windowsHide: true, stdio: ['ignore', fd, fd] }); fs.closeSync(fd); children.push(child); return child;
}
async function ready(url, child, headers) {
  const end = Date.now() + 300000;
  while (Date.now() < end) {
    if (child.exitCode !== null) throw new Error('Server exited before readiness: ' + url);
    try { const response = await fetch(url, { headers, signal: AbortSignal.timeout(15000) }); if (response.ok) return; } catch {}
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  throw new Error('Server readiness timed out: ' + url);
}
function stop(child) {
  if (!child || child.exitCode !== null) return;
  // Both servers are direct children; terminate only the processes this runner owns.
  child.kill('SIGTERM');
  child.unref();
}
try {
  console.log('Runtime: ' + runtime);
  console.log('Provisioning an isolated real Laravel API.');
  run(php, ['-d', 'xdebug.mode=off', 'artisan', 'migrate', '--force', '--no-interaction'], backend, 'migrations.log');
  for (const name of ['UserSeeder', 'ProductSeeder', 'SettingsSeeder']) run(php, ['-d', 'xdebug.mode=off', 'artisan', 'db:seed', '--class=' + name, '--force', '--no-interaction'], backend, name + '.log');
  run(php, ['-d', 'xdebug.mode=off', 'scripts/seed-global-ux-live.php'], backend, 'fixtures.log');
  const apiPort = await port(); env.APP_URL = 'http://127.0.0.1:' + apiPort;
  const api = start(php, ['-d', 'xdebug.mode=off', '-d', 'zend_extension=opcache', '-d', 'opcache.enable_cli=1', '-S', '127.0.0.1:' + apiPort, path.join(backend, 'vendor/laravel/framework/src/Illuminate/Foundation/resources/server.php')], path.join(backend, 'public'), 'backend.log');
  await ready(env.APP_URL + '/api/health', api);
  const webPort = await port(); env.ISOLATED_BASE_URL = 'http://127.0.0.1:' + webPort; env.API_PROXY_TARGET = env.APP_URL;
  const web = start(process.execPath, ['scripts/isolated-next-server.cjs', String(webPort)], frontend, 'frontend.log');
  for (const route of ['/en/login?role=manager', '/en/admin', '/en/admin/klanten']) {
    console.log('Warming ' + route); await ready(env.ISOLATED_BASE_URL + route, web, route.includes('/admin') ? { Cookie: 'krek_session=compile-only' } : undefined);
  }
  console.log('Running real HTTP/browser UX flows; application API responses are not mocked.');
  const args = ['node_modules/@playwright/test/cli.js', 'test', '--config', 'playwright.global-ux-live.config.ts'];
  if (process.env.GLOBAL_UX_LIVE_GREP) args.push('--grep', process.env.GLOBAL_UX_LIVE_GREP);
  run(process.execPath, args, frontend, 'browser.log');
  fs.writeFileSync(path.join(runtime, 'result.json'), JSON.stringify({ status: 'passed', database, mockedApplicationHttp: false, liveDatabaseWrites: false }, null, 2));
  console.log('Passed. Evidence: ' + runtime);
} catch (error) {
  fs.writeFileSync(path.join(runtime, 'result.json'), JSON.stringify({ status: 'failed', error: error.message, database, mockedApplicationHttp: false, liveDatabaseWrites: false }, null, 2));
  console.error(error.message); process.exitCode = 1;
} finally { for (const child of children.reverse()) stop(child); }
