// Keep the isolated Next server in a single known child process for reliable
// cleanup on Windows; the regular CLI forks an additional server process.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const dir = process.argv[3] || process.cwd();
const port = Number(process.argv[2]);

if (process.env.E2E_LOW_MEMORY === '1' && fs.existsSync(path.join(dir, '.next/BUILD_ID'))) {
  const builtAt = fs.statSync(path.join(dir, '.next/BUILD_ID')).mtimeMs;
  const assertFresh = (source) => {
    if (!fs.existsSync(source)) return;
    if (fs.statSync(source).isDirectory()) {
      for (const name of fs.readdirSync(source)) assertFresh(path.join(source, name));
    } else if (fs.statSync(source).mtimeMs > builtAt) {
      throw new Error('Rebuild before production browser tests: source changed at ' + source);
    }
  };
  for (const source of ['src', 'public', 'next.config.mjs', 'package.json', 'package-lock.json', 'tsconfig.json']) {
    assertFresh(path.join(dir, source));
  }
  // Reuse the verified build, while routing application HTTP to this runner's
  // isolated Laravel instance. API responses remain real and are never mocked.
  process.env.NODE_ENV = 'production';
  process.env.NEXT_DIST_DIR = '.next';
  const app = require('next')({ dev: false, dir, hostname: '127.0.0.1', port });
  const handle = app.getRequestHandler();
  app.prepare().then(() => {
    http.createServer((request, response) => {
      if (!request.url.startsWith('/api/')) return handle(request, response);
      const target = new URL(request.url, process.env.API_PROXY_TARGET);
      if (target.protocol !== 'http:' || !['127.0.0.1', 'localhost'].includes(target.hostname)) {
        response.writeHead(502).end();
        return;
      }
      const upstream = http.request(target, {
        method: request.method, headers: { ...request.headers, host: target.host },
      }, (incoming) => {
        response.writeHead(incoming.statusCode, incoming.headers);
        incoming.pipe(response);
      });
      upstream.on('error', () => { if (!response.headersSent) response.writeHead(502); response.end(); });
      request.pipe(upstream);
    }).listen(port, '127.0.0.1', () => console.log('Isolated production test server ready on ' + port));
  }).catch((error) => { console.error(error); process.exitCode = 1; });
} else {
  process.env.NODE_ENV = 'development';
  require('next/dist/server/lib/start-server').startServer({
    dir, port, hostname: '127.0.0.1', isDev: true, allowRetry: false,
  }).catch((error) => { console.error(error); process.exitCode = 1; });
}
