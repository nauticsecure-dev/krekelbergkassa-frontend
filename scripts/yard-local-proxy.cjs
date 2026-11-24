// Transport only: every response comes from one of the isolated Laravel servers.
const http = require('node:http');
const port = Number(process.argv[2]);
const targets = process.argv.slice(3).map(value => new URL(value));
if (!Number.isInteger(port) || port < 1 || port > 65535 || targets.length !== 2 || targets.some(url =>
  url.protocol !== 'http:' || !['127.0.0.1', 'localhost'].includes(url.hostname) || url.username || url.password)) {
  throw new Error('The yard test proxy requires a local port and two loopback HTTP targets.');
}
// PHP's development server processes one request at a time. Queue upstream
// requests here rather than leaving speculative/idle connections in its accept queue.
const agents = targets.map(() => new http.Agent({ keepAlive: false, maxSockets: 1 }));
let next = 0;
http.createServer((request, response) => {
  const pinned = request.headers['x-yard-test-backend'];
  if (pinned !== undefined && pinned !== '0' && pinned !== '1') { response.writeHead(400).end(); return; }
  const index = pinned === undefined ? next++ % targets.length : Number(pinned);
  let target;
  try { target = new URL(request.url, targets[index]); } catch { response.writeHead(400).end(); return; }
  if (target.origin !== targets[index].origin) { response.writeHead(400).end(); return; }
  const upstream = http.request(target, { method: request.method, agent: agents[index],
    headers: { ...request.headers, host: target.host, connection: 'close' } }, incoming => {
    response.writeHead(incoming.statusCode, { ...incoming.headers, 'x-yard-test-backend': String(index) });
    incoming.pipe(response);
  });
  request.on('aborted', () => upstream.destroy());
  response.on('close', () => { if (!response.writableEnded) upstream.destroy(); });
  upstream.on('error', () => { if (!response.headersSent) response.writeHead(502); response.end(); });
  request.pipe(upstream);
}).listen(port, '127.0.0.1', () => console.log('Isolated two-instance yard proxy ready.'));
