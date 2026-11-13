import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createPortalInbox } from './lib/portal-smtp.mjs';

const frontend = fileURLToPath(new URL('../', import.meta.url));
const backend = path.resolve(frontend, '../krekelbergkassa-backend');
const runtime = fs.mkdtempSync(path.join(backend, 'storage', 'portal-live-'));
const storage = path.join(runtime, 'storage');
for (const folder of ['framework/views', 'framework/cache/data', 'framework/sessions', 'logs', 'app', 'uploads']) {
  fs.mkdirSync(path.join(storage, folder), { recursive: true });
}
const database = path.join(runtime, 'fixtures.sqlite');
fs.writeFileSync(database, '');
const email = 'portal-journey@example.test';
const mailbox = path.join(runtime, 'mailbox.eml');
const nextDirectory = 'tmp/portal-live/' + path.basename(runtime);
fs.mkdirSync(path.join(frontend, nextDirectory), { recursive: true });
const nextConfig = nextDirectory + '.tsconfig.json';
fs.writeFileSync(path.join(frontend, nextConfig), JSON.stringify({
  extends: '../../tsconfig.json',
  include: ['../../next-env.d.ts', '../../src/**/*.ts', '../../src/**/*.tsx', nextDirectory + '/types/**/*.ts'],
}));
const children = [];
const smtp = createPortalInbox((recipients, message) => {
  if (recipients.includes(email) && /\/portal\/verify\?/.test(message.replace(/=\r\n/g, ''))) {
    fs.writeFileSync(mailbox, message);
  }
});

async function listen(server) {
  await new Promise((resolve, reject) => server.once('error', reject).listen(0, '127.0.0.1', resolve));
  return server.address().port;
}

async function freePort() {
  const server = net.createServer();
  const port = await listen(server);
  await new Promise(resolve => server.close(resolve));
  return port;
}

const apiPort = await freePort();
const frontendPort = await freePort();
const smtpPort = await smtp.listen(0);
const env = {
  ...process.env,
  APP_ENV: 'testing', APP_DEBUG: 'false', APP_KEY: 'base64:' + randomBytes(32).toString('base64'),
  LOG_CHANNEL: 'single',
  LARAVEL_STORAGE_PATH: storage, APP_CONFIG_CACHE: path.join(runtime, 'config.php'),
  APP_ROUTES_CACHE: path.join(runtime, 'routes.php'), VIEW_COMPILED_PATH: path.join(storage, 'framework/views'),
  APP_URL: 'http://127.0.0.1:' + apiPort, FRONTEND_URL: 'http://127.0.0.1:' + frontendPort,
  DB_CONNECTION: 'sqlite', DB_DATABASE: database, DB_URL: '',
  SESSION_DRIVER: 'array', CACHE_STORE: 'array', QUEUE_CONNECTION: 'database',
  FILESYSTEM_DISK: 'local', FILESYSTEM_LOCAL_ROOT: path.join(storage, 'app/private'),
  FILESYSTEM_PUBLIC_ROOT: path.join(storage, 'app/public'), FILESYSTEM_CMS_DISK: 'public',
  MAIL_MAILER: 'log', AUTH_MAIL_MAILER: 'portal_local', AUTH_MAIL_LOCAL_PORT: String(smtpPort),
  MAIL_FROM_ADDRESS: 'no-reply@example.test',
  AUTH_MAIL_RESEND_ENABLED: 'false', CRANE_NOTIFICATION_RECIPIENTS: 'crane@example.test',
  BROADCAST_CONNECTION: 'null', MOLLIE_KEY: '', MOLLIE_TEST_KEY: '', MOLLIE_LIVE_KEY: '',
  SENTRY_DSN: '', SENTRY_LARAVEL_DSN: '', NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: '',
  NEXT_TELEMETRY_DISABLED: '1',
  NEXT_PUBLIC_API_URL: '/api', NEXT_DIST_DIR: nextDirectory, PORTAL_LIVE_TSCONFIG: nextConfig,
  NEXT_FONT_GOOGLE_MOCKED_RESPONSES: path.join(frontend, 'tests/fixtures/journey-fonts.cjs'),
  PORTAL_LIVE_MAILBOX: mailbox, PORTAL_LIVE_EMAIL: email, PORTAL_LIVE_RUNTIME: runtime,
};
env.API_PROXY_TARGET = env.APP_URL;

function runPhp(args) {
  const result = spawnSync('php', args, { cwd: backend, env, encoding: 'utf8', windowsHide: true });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result.stdout.trim();
}

function start(exe, args, cwd, log) {
  const output = log ? fs.openSync(path.join(runtime, log), 'a') : null;
  const child = spawn(exe, args, { cwd, env, windowsHide: true, stdio: output === null ? 'inherit' : ['ignore', output, output] });
  if (output !== null) fs.closeSync(output);
  children.push(child);
  return child;
}

async function ready(url, child, cookie) {
  const deadline = Date.now() + 180_000;
  while (Date.now() < deadline && child.exitCode === null) {
    try {
      const response = await fetch(url, { headers: cookie ? { cookie } : {}, redirect: 'manual', signal: AbortSignal.timeout(45_000) });
      if (response.ok) {
        await response.arrayBuffer();
        return;
      }
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  throw new Error('Server readiness failed for ' + url);
}

try {
  console.log('Local customer portal evidence: ' + runtime);
  runPhp(['artisan', 'migrate', '--force', '--no-interaction']);
  for (const seeder of ['ProductSeeder', 'OpeningHourSeeder']) {
    runPhp(['artisan', 'db:seed', '--class=' + seeder, '--force', '--no-interaction']);
  }
  const api = start('php', ['-d', 'upload_tmp_dir=' + path.join(storage, 'uploads'), '-d', 'zend_extension=opcache',
    '-d', 'opcache.enable_cli=1', '-S', '127.0.0.1:' + apiPort,
    path.join(backend, 'vendor/laravel/framework/src/Illuminate/Foundation/resources/server.php')], path.join(backend, 'public'), 'backend.log');
  await ready(env.APP_URL + '/up', api);
  const web = start(process.execPath, ['scripts/isolated-next-server.cjs', String(frontendPort)], frontend, 'frontend.log');
  for (const route of ['/nl/kraanafspraak', '/nl/login', '/nl/portal/verify?token=compile-only', '/nl/dashboard/afspraken', '/nl/dashboard/boten', '/nl/feed']) {
    console.log('Warming ' + route);
    await ready(env.FRONTEND_URL + route, web, route.includes('/dashboard/') || route === '/nl/feed' ? 'krek_portal_session=compile-only' : undefined);
  }
  const test = start(process.execPath, ['node_modules/@playwright/test/cli.js', 'test', '--config', 'playwright.portal-live.config.ts'], frontend);
  const code = await new Promise((resolve, reject) => test.once('error', reject).once('exit', resolve));
  assert.equal(code, 0, 'Portal browser test failed');
  const proof = runPhp(['scripts/verify-customer-portal-live.php', path.join(runtime, 'browser.json')]);
  fs.writeFileSync(path.join(runtime, 'result.json'), proof + '\n');
  console.log(proof);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  fs.rmSync(mailbox, { force: true });
  smtp.close();
  for (const child of children.reverse()) {
    if (child.exitCode === null && child.signalCode === null) {
      const stopped = new Promise(resolve => child.once('close', resolve));
      if (child.kill()) await stopped;
    }
  }
  const webLog = path.join(runtime, 'frontend.log');
  if (fs.existsSync(webLog)) {
    const log = fs.readFileSync(webLog, 'utf8').replace(/([?&]token=)[^&\s]+/g, '$1[redacted]');
    fs.writeFileSync(webLog, log);
  }
}
