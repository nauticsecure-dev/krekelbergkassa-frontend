import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

const frontend = fileURLToPath(new URL('../', import.meta.url));
const backend = path.resolve(frontend, '../krekelbergkassa-backend');
const runtime = fs.mkdtempSync(path.join(backend, 'storage', 'pos-browser-'));
const fixture = path.join(backend, 'scripts/pos-browser-fixture.php');
const storage = path.join(runtime, 'storage');
const children = [];
const mysqlBin = process.env.POS_MYSQL_BIN;
const raceOnly = process.argv.includes('--race-only');
const database = path.join(runtime, 'pos.sqlite');
const providerState = path.join(runtime, 'provider-state.txt');
const creates = [];
const payments = new Map();

function reply(response, status, body) {
  response.writeHead(status, { 'Content-Type': 'application/json' });
  response.end(JSON.stringify(body));
}

const provider = http.createServer(async (request, response) => {
  try {
    if (request.method === 'POST' && request.url === '/v2/payments') {
      let body = '';
      for await (const part of request) body += part;
      const payload = JSON.parse(body);
      const key = request.headers['idempotency-key'];
      assert.equal(typeof key, 'string');
      const payment = payments.get(key) ?? {
        id: 'tr_pos_browser_' + (payments.size + 1), resource: 'payment', mode: 'test', status: 'open',
        amount: payload.amount, metadata: payload.metadata, method: payload.method,
        _links: { checkout: { href: 'https://example.test/pos-provider-checkout' } },
      };
      payments.set(key, payment);
      creates.push({ key, payload, id: payment.id });
      fs.writeFileSync(path.join(runtime, 'provider.json'), JSON.stringify(creates, null, 2));
      if (creates.length === 1) {
        request.socket.destroy();
        return;
      }
      return reply(response, 201, payment);
    }
    const state = fs.readFileSync(providerState, 'utf8');
    const [pathname] = (request.url ?? '').split('?');
    const providerId = pathname.split('/')[3];
    const payment = [...payments.values()].find(candidate => candidate.id === providerId);
    if (payment && request.method === 'GET') {
      if (pathname === '/v2/payments/' + payment.id) {
        return reply(response, 200, { ...payment, status: state === 'open' ? 'open' : 'paid' });
      }
      if (pathname === '/v2/payments/' + payment.id + '/refunds') {
        const refunds = state === 'refunded' ? [{ id: 're_pos_browser', resource: 'refund', status: 'refunded', amount: payment.amount }] : [];
        return reply(response, 200, { count: refunds.length, _embedded: { refunds }, _links: {} });
      }
    }
    reply(response, 404, { detail: 'Unexpected simulator endpoint' });
  } catch (error) {
    reply(response, 500, { detail: error.message });
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

const env = { ...process.env };

function run(executable, args, cwd, logName) {
  const result = spawnSync(executable, args, { cwd, env, encoding: 'utf8', windowsHide: true });
  fs.writeFileSync(path.join(runtime, logName), (result.stdout ?? '') + (result.stderr ?? ''));
  if (result.error || result.status !== 0) throw new Error(`${logName} failed in ${runtime}`, { cause: result.error });
  return result.stdout.trim();
}

function start(executable, args, cwd, logName) {
  const output = fs.openSync(path.join(runtime, logName), 'a');
  const child = spawn(executable, args, { cwd, env, windowsHide: true, stdio: ['ignore', output, output] });
  fs.closeSync(output);
  children.push(child);
  return child;
}

async function ready(child, probe, description) {
  const deadline = Date.now() + 180_000;
  while (child.exitCode === null && Date.now() < deadline) {
    try {
      if (await probe()) return;
    } catch {}
    await delay(300);
  }
  throw new Error(`${description} did not start`);
}

function health(url, headers) {
  return async () => {
    const response = await fetch(url, { headers, signal: AbortSignal.timeout(45_000), redirect: 'manual' });
    await response.arrayBuffer();
    return response.ok;
  };
}

const nextDir = 'tmp/' + path.basename(runtime);
let mysqlConnection;
let mysqlAdmin;
try {
  if (raceOnly && !mysqlBin) throw new Error('--race-only requires POS_MYSQL_BIN');
  console.log('POS browser evidence: ' + runtime);
  const apiPort = await freePort();
  const racePort = mysqlBin ? await freePort() : null;
  const mysqlPort = mysqlBin ? await freePort() : '';
  const webPort = raceOnly ? apiPort : await freePort();
  const providerPort = await listen(provider);
  fs.writeFileSync(providerState, 'open');
  if (!mysqlBin) fs.writeFileSync(database, '');
  for (const folder of ['framework/views', 'framework/cache/data', 'framework/sessions', 'logs', 'app/private', 'app/public']) {
    fs.mkdirSync(path.join(storage, folder), { recursive: true });
  }
  const tsconfig = nextDir + '/tsconfig.json';
  if (!raceOnly) {
    fs.mkdirSync(path.join(frontend, nextDir), { recursive: true });
    fs.writeFileSync(path.join(frontend, tsconfig), JSON.stringify({
      extends: '../../tsconfig.json',
      include: ['../../next-env.d.ts', '../../src/**/*.ts', '../../src/**/*.tsx'],
    }));
  }
  Object.assign(env, {
    APP_ENV: 'testing', APP_DEBUG: 'false', APP_KEY: 'base64:' + randomBytes(32).toString('base64'),
    APP_URL: 'http://127.0.0.1:' + apiPort, FRONTEND_URL: 'http://127.0.0.1:' + webPort,
    APP_CONFIG_CACHE: path.join(runtime, 'config.php'), APP_ROUTES_CACHE: path.join(runtime, 'routes.php'),
    LARAVEL_STORAGE_PATH: storage, VIEW_COMPILED_PATH: path.join(storage, 'framework/views'),
    DB_URL: '', DB_CONNECTION: mysqlBin ? 'mysql' : 'sqlite', DB_DATABASE: mysqlBin ? 'pos_browser' : database,
    DB_HOST: '127.0.0.1', DB_PORT: String(mysqlPort), DB_USERNAME: 'root', DB_PASSWORD: '', DB_SOCKET: '',
    DB_BUSY_TIMEOUT: '30000', DB_JOURNAL_MODE: 'WAL',
    QUEUE_CONNECTION: 'sync', CACHE_STORE: 'array', SESSION_DRIVER: 'array', BROADCAST_CONNECTION: 'null',
    LOG_CHANNEL: 'single', MAIL_MAILER: 'log', MAIL_LOG_CHANNEL: 'single', MAIL_FROM_ADDRESS: 'pos@example.test',
    AUTH_MAIL_RESEND_ENABLED: 'false', SIGNHOST_ENABLED: 'false', QA_STAGING_ENABLED: 'false',
    FILESYSTEM_DISK: 'local', FILESYSTEM_LOCAL_ROOT: path.join(storage, 'app/private'),
    FILESYSTEM_PUBLIC_ROOT: path.join(storage, 'app/public'),
    MOLLIE_KEY: '', MOLLIE_API_KEY: '', MOLLIE_LIVE_KEY: '', MOLLIE_TEST_KEY: 'test_' + 'fixture'.repeat(5),
    MOLLIE_WEBHOOK_URL: '', MOLLIE_TEST_MODE: 'true', SENTRY_DSN: '', SENTRY_LARAVEL_DSN: '',
    POS_BROWSER_RUNTIME: runtime, POS_BROWSER_PROVIDER: 'http://127.0.0.1:' + providerPort,
    POS_BROWSER_PASSWORD: randomBytes(24).toString('base64url'), POS_BROWSER_MYSQL_PORT: String(mysqlPort),
    POS_BROWSER_RACE_URL: racePort ? 'http://127.0.0.1:' + racePort : '',
    API_PROXY_TARGET: 'http://127.0.0.1:' + apiPort, NEXT_PUBLIC_API_URL: '/api',
    NEXT_DIST_DIR: nextDir + '/next', PORTAL_LIVE_TSCONFIG: tsconfig, NEXT_TELEMETRY_DISABLED: '1',
    NEXT_FONT_GOOGLE_MOCKED_RESPONSES: path.join(frontend, 'tests/fixtures/journey-fonts.cjs'),
  });

  if (mysqlBin) {
    const executable = name => path.join(mysqlBin, name + (process.platform === 'win32' ? '.exe' : ''));
    const data = '--datadir=' + path.join(runtime, 'mysql');
    run(executable('mysqld'), ['--no-defaults', data, '--initialize-insecure', '--console'], backend, 'mysql-init.log');
    const mysql = start(executable('mysqld'), ['--no-defaults', data, '--bind-address=127.0.0.1',
      '--port=' + mysqlPort, '--mysqlx=OFF', '--innodb-redo-log-capacity=67108864', '--console'], backend, 'mysql.log');
    const connect = ['--no-defaults', '-h', '127.0.0.1', '-P', String(mysqlPort), '-u', 'root'];
    mysqlAdmin = executable('mysqladmin');
    await ready(mysql, () => spawnSync(mysqlAdmin, [...connect, 'ping'], { windowsHide: true }).status === 0, 'MySQL');
    mysqlConnection = connect;
    run(executable('mysql'), [...connect, '-e', 'CREATE DATABASE pos_browser'], backend, 'mysql-create.log');
  }
  console.log('Migrating isolated ' + env.DB_CONNECTION + ' database.');
  run('php', ['artisan', 'migrate', '--force', '--no-interaction'], backend, 'migrate.log');
  env.POS_BROWSER_FIXTURES = run('php', [fixture, 'seed'], backend, 'seed.log');
  for (const [port, name] of [[apiPort, 'laravel'], ...(racePort ? [[racePort, 'laravel-race']] : [])]) {
    const php = start('php', ['-d', 'display_errors=0', '-d', 'zend_extension=opcache', '-d', 'opcache.enable_cli=1',
      '-S', '127.0.0.1:' + port, fixture], backend, name + '.log');
    await ready(php, health('http://127.0.0.1:' + port + '/api/health'), name);
  }
  const args = ['node_modules/@playwright/test/cli.js', 'test', '--config', 'playwright.pos-browser.config.ts'];
  if (raceOnly) {
    args.push('--grep', 'concurrent MySQL');
  } else {
    console.log('Starting the POS frontend.');
    const next = start(process.execPath, ['scripts/isolated-next-server.cjs', String(webPort)], frontend, 'next.log');
    await ready(next, health(env.FRONTEND_URL + '/en/admin/kassa', { Cookie: 'krek_session=warmup' }), 'Next.js');
  }
  console.log('Running Playwright.');
  const playwright = start(process.execPath, args, frontend, 'playwright.log');
  const exit = await new Promise((resolve, reject) => {
    playwright.once('error', reject);
    playwright.once('exit', resolve);
  });
  console.log(fs.readFileSync(path.join(runtime, 'playwright.log'), 'utf8'));
  assert.equal(exit, 0, 'POS browser suite failed');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  if (mysqlConnection) spawnSync(mysqlAdmin, [...mysqlConnection, 'shutdown'], { windowsHide: true, timeout: 10_000 });
  for (const child of children.reverse()) child.kill();
  provider.closeAllConnections();
  provider.close();
}
