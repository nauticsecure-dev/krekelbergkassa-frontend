import net from 'node:net';

export function createPortalInbox(receive) {
  const sockets = new Set();
  const server = net.createServer(socket => {
    sockets.add(socket);
    socket.on('close', () => sockets.delete(socket));
    socket.on('error', () => socket.destroy());
    socket.setTimeout(15_000, () => socket.destroy());
    socket.setEncoding('utf8');
    socket.write('220 localhost ESMTP\r\n');
    let pending = '';
    let message = null;
    let recipients = [];
    socket.on('data', chunk => {
      pending += chunk;
      for (let end; (end = pending.indexOf('\r\n')) >= 0;) {
        const line = pending.slice(0, end);
        pending = pending.slice(end + 2);
        if (message !== null) {
          if (line === '.') {
            try {
              receive(recipients, message);
              socket.write('250 Queued locally\r\n');
            } catch {
              socket.write('451 Unable to write local inbox\r\n');
            }
            message = null;
          } else {
            message += (line.startsWith('..') ? line.slice(1) : line) + '\r\n';
          }
        } else if (/^(EHLO|HELO) /i.test(line)) {
          socket.write('250 localhost\r\n');
        } else if (/^MAIL FROM:/i.test(line) || line === 'RSET') {
          recipients = [];
          socket.write('250 OK\r\n');
        } else if (/^RCPT TO:/i.test(line)) {
          recipients.push(line.match(/<([^>]+)>/)?.[1].toLowerCase());
          socket.write('250 OK\r\n');
        } else if (line === 'DATA' && recipients.length) {
          message = '';
          socket.write('354 End with <CRLF>.<CRLF>\r\n');
        } else if (line === 'QUIT') {
          socket.end('221 Bye\r\n');
        } else {
          socket.write('502 Command unavailable\r\n');
        }
      }
    });
  });

  return {
    async listen(port) {
      await new Promise((resolve, reject) => server.once('error', reject).listen(port, '127.0.0.1', resolve));
      return server.address().port;
    },
    close() {
      for (const socket of sockets) socket.destroy();
      server.close();
    },
  };
}
