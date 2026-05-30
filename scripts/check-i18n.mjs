import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

function flatten(obj, prefix = '') {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) Object.assign(out, flatten(v, key));
    else out[key] = v;
  }
  return out;
}

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'node_modules') walk(full, files);
    else if (/\.(tsx|ts)$/.test(entry.name)) files.push(full);
  }
  return files;
}

const keyRe = /\bt\(\s*['"`]([^'"`${}]+)['"`]/g;

const used = new Set();
for (const file of walk('src')) {
  const content = fs.readFileSync(file, 'utf8');
  let m;
  while ((m = keyRe.exec(content)) !== null) used.add(m[1]);
}

const locales = ['nl', 'en', 'de'];
const messages = Object.fromEntries(
  locales.map((loc) => [
    loc,
    flatten(JSON.parse(fs.readFileSync(`src/i18n/messages/${loc}.json`, 'utf8'))),
  ])
);

const missing = {};
for (const key of [...used].sort()) {
  for (const loc of locales) {
    if (!(key in messages[loc])) {
      if (!missing[key]) missing[key] = [];
      missing[key].push(loc);
    }
  }
}

console.log(`Used keys: ${used.size}`);
console.log(`Missing keys: ${Object.keys(missing).length}\n`);
for (const [k, locs] of Object.entries(missing).sort()) {
  const ref = messages.nl[k] ?? messages.en[k] ?? '(no reference)';
  console.log(`${k}`);
  console.log(`  missing: ${locs.join(', ')}`);
  if (messages.nl[k]) console.log(`  nl: ${JSON.stringify(messages.nl[k])}`);
}
