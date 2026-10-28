import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { randomBytes } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const frontend = fileURLToPath(new URL('../', import.meta.url));
const backend = path.resolve(frontend, '../krekelbergkassa-backend');
const audit = path.resolve(frontend, '../_audit');
// A fresh directory and DB file on every invocation; never use the local .env DB.
const runtime = fs.mkdtempSync(path.join(audit, 'isolated-live-'));
const database = path.join(runtime, 'fixtures.sqlite');
fs.writeFileSync(database, '');
const password = randomBytes(24).toString('base64url');
const email = 'e2e-admin@example.test';
const children = [];
const env = {
  ...process.env,
  APP_ENV: 'local', APP_DEBUG: 'false', APP_KEY: `base64:${randomBytes(32).toString('base64')}`,
  APP_CONFIG_CACHE: path.join(runtime, 'config.php'), DB_CONNECTION: 'sqlite', DB_DATABASE: database, DB_URL: '',
  CACHE_STORE: 'array', SESSION_DRIVER: 'array', MAIL_MAILER: 'array', BROADCAST_CONNECTION: 'null', QUEUE_CONNECTION: 'sync',
  FILESYSTEM_DISK: 'local', SEED_ADMIN_PASSWORD: password,
  MOLLIE_KEY: '', OPENAI_API_KEY: '', ANTHROPIC_API_KEY: '', TWILIO_ACCOUNT_SID: '', TWILIO_AUTH_TOKEN: '',
  AWS_ACCESS_KEY_ID: '', AWS_SECRET_ACCESS_KEY: '', SENTRY_LARAVEL_DSN: '', SENTRY_DSN: '',
  E2E_ADMIN_EMAIL: email, E2E_ADMIN_PASSWORD: password, PRICING_LIVE: '1',
  E2E_EXPECT_TIMEOUT: '60000',
};

function run(command, args, cwd, logName) {
  const result = spawnSync(command, args, { cwd, env, encoding: 'utf8', windowsHide: true, maxBuffer: 10 * 1024 * 1024 });
  fs.writeFileSync(path.join(runtime, logName), (result.stdout ?? '') + (result.stderr ?? ''));
  if (result.error || result.status !== 0) throw new Error(`${logName} failed; inspect ${runtime}`);
}
async function port() {
  const server = net.createServer();
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const value = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  return value;
}
function start(command, args, cwd, name) {
  const fd = fs.openSync(path.join(runtime, name), 'a');
  const child = spawn(command, args, { cwd, env, windowsHide: true, stdio: ['ignore', fd, fd] });
  fs.closeSync(fd);
  children.push(child);
  return child;
}
async function ready(url, child, headers) {
  const deadline = Date.now() + 240000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Test server exited: ${url}`);
    try {
      const response = await fetch(url, { headers, signal: AbortSignal.timeout(10000) });
      if (response.ok && new URL(response.url).pathname === new URL(url).pathname) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Test server did not become ready: ${url}`);
}

try {
  console.log('Creating isolated SQLite tables and dummy users, products and tariffs.');
  run('php', ['artisan', 'migrate', '--force', '--no-interaction'], backend, 'migrations.txt');
  for (const name of ['UserSeeder', 'ProductSeeder', 'SettingsSeeder']) {
    run('php', ['artisan', 'db:seed', `--class=${name}`, '--force', '--no-interaction'], backend, `${name}.txt`);
  }
  run('php', ['-r', 'require "vendor/autoload.php"; $app=require "bootstrap/app.php"; $app->make(Illuminate\\Contracts\\Console\\Kernel::class)->bootstrap(); $user=App\\Models\\User::factory()->admin()->create(["email"=>getenv("E2E_ADMIN_EMAIL"),"password_hash"=>Illuminate\\Support\\Facades\\Hash::make(getenv("E2E_ADMIN_PASSWORD")),"locale"=>"nl-NL"]); $user->assignRole("admin");'], backend, 'dummy-admin.txt');

  const backendPort = await port();
  env.APP_URL = `http://127.0.0.1:${backendPort}`;
  // Cache Laravel bytecode: Windows PHP serves one request at a time, and
  // repeatedly compiling vendor files can exhaust the browser request timeout.
  const api = start('php', ['-d', 'zend_extension=opcache', '-d', 'opcache.enable_cli=1', '-S', `127.0.0.1:${backendPort}`, path.join(backend, 'vendor/laravel/framework/src/Illuminate/Foundation/resources/server.php')], path.join(backend, 'public'), 'backend.txt');
  await ready(`${env.APP_URL}/api/health`, api);

  const frontendPort = await port();
  env.ISOLATED_BASE_URL = env.E2E_BASE_URL = `http://127.0.0.1:${frontendPort}`;
  env.API_PROXY_TARGET = env.APP_URL;
  env.NEXT_PUBLIC_API_URL = '/api';
  env.NEXT_DIST_DIR = '.next-isolated-live';
  env.NEXT_FONT_GOOGLE_MOCKED_RESPONSES = path.join(frontend, 'tests/fixtures/journey-fonts.cjs');
  env.ISOLATED_TEST_RESULTS = path.join(runtime, 'pricing-results');
  const web = start(process.execPath, ['scripts/isolated-next-server.cjs', String(frontendPort)], frontend, 'frontend.txt');
  await ready(`${env.ISOLATED_BASE_URL}/nl`, web);
  // Compile the routes before timed browser actions on a cold Windows dev server.
  for (const route of ['/nl/login?role=manager', '/nl/admin', '/nl/diensten/winterstalling', '/nl/admin/calculator/pricing']) {
    console.log(`Warming isolated route: ${route}`);
    // Middleware requires cookie presence even for a compile-only HTTP request.
    // The browser tests still authenticate against Laravel with the real dummy account.
    const headers = route.startsWith('/nl/admin') ? { Cookie: 'krek_session=compile-only' } : undefined;
    await ready(`${env.ISOLATED_BASE_URL}${route}`, web, headers);
  }

  console.log('Testing real staff login against the isolated backend.');
  run(process.execPath, ['node_modules/@playwright/test/cli.js', 'test', '--config', 'playwright.config.ts', '--timeout', '120000'], frontend, 'login-test.txt');
  console.log('Testing employee tariff save, public reload, denied write and restoration.');
  run(process.execPath, ['node_modules/@playwright/test/cli.js', 'test', '--config', 'playwright.isolated-live.config.ts'], frontend, 'pricing-test.txt');
  env.PLAYWRIGHT_BASE_URL = env.ISOLATED_BASE_URL;
  console.log('Testing pricing permission controls in the browser.');
  run(process.execPath, ['node_modules/@playwright/test/cli.js', 'test', '--config', 'playwright.ui.config.ts', 'pricing-permissions.spec.ts'], frontend, 'pricing-permissions-test.txt');
  fs.writeFileSync(path.join(runtime, 'result.json'), JSON.stringify({ status: 'passed', tests: ['staff login', 'employee pricing save/reload/permissions/restore', 'four browser pricing permission checks'], database, productionWrites: false }, null, 2));
  console.log(`Isolated live tests passed. Results: ${runtime}`);
} catch (error) {
  fs.writeFileSync(path.join(runtime, 'result.json'), JSON.stringify({ status: 'failed', error: error.message, database, productionWrites: false }, null, 2));
  console.error(error.message);
  process.exitCode = 1;
} finally {
  for (const child of children.reverse()) {
    if (child.exitCode !== null) continue;
    child.kill('SIGTERM');
    child.unref();
  }
}
