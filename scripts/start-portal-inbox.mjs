import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createPortalInbox } from './lib/portal-smtp.mjs';

const directory = fileURLToPath(new URL('../../krekelbergkassa-backend/storage/app/private/portal-inbox/', import.meta.url));
fs.mkdirSync(directory, { recursive: true });
const inbox = createPortalInbox((_, message) => {
  const filename = path.join(directory, Date.now() + '-' + randomUUID() + '.eml');
  fs.writeFileSync(filename, message);
  console.log('Received ' + filename);
});
const port = await inbox.listen(Number(process.env.AUTH_MAIL_LOCAL_PORT ?? 1025));
console.log('Local portal inbox listening on 127.0.0.1:' + port);
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => inbox.close());
