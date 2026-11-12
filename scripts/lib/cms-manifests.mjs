import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export function readRows(document, name, manifestName, root) {
  if (Array.isArray(document[name])) return document[name];
  const manifest = document[manifestName];
  if (!manifest) return [];
  if (path.basename(manifest.file) !== manifest.file) throw new Error('Manifest must be in the private report directory.');
  const contents = fs.readFileSync(path.join(root, manifest.file));
  if (crypto.createHash('sha256').update(contents).digest('hex') !== manifest.sha256) throw new Error('Manifest digest mismatch.');
  const rows = contents.toString('utf8').split('\n').filter(Boolean).map(line => JSON.parse(line));
  if (rows.length !== manifest.count) throw new Error('Manifest row count mismatch.');
  return rows;
}

export function writeRows(root, name, rows) {
  const file = path.join(root, name);
  const sorted = [...rows].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  const contents = sorted.map(row => JSON.stringify(row)).join('\n') + '\n';
  fs.writeFileSync(file + '.tmp', contents); fs.renameSync(file + '.tmp', file);
  return { file: name, count: rows.length, sha256: crypto.createHash('sha256').update(contents).digest('hex') };
}
