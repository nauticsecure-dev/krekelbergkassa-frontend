import fs from 'node:fs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = new URL('../../krekelbergkassa-backend/', import.meta.url);
const config = Object.fromEntries(fs.readFileSync(new URL('.env', root), 'utf8').split(/\r?\n/).filter((line) => /^[A-Z_]+=/.test(line)).map((line) => {
  const at = line.indexOf('='); return [line.slice(0, at), line.slice(at + 1).replace(/^['"]|['"]$/g, '')];
}));
const child = spawn('C:/wamp64/bin/php/php8.4.15/php.exe', ['-S', '127.0.0.1:8095', '-t', '.', fileURLToPath(new URL('vendor/laravel/framework/src/Illuminate/Foundation/resources/server.php', root))], {
  cwd: new URL('public/', root), stdio: 'inherit', windowsHide: true,
  env: { ...process.env, ...config, XDEBUG_MODE: 'off', APP_ENV: 'local', APP_CONFIG_CACHE: fileURLToPath(new URL('storage/app/hiswa-verification-config.php', root)) },
});
child.on('exit', (code) => { process.exitCode = code; });
