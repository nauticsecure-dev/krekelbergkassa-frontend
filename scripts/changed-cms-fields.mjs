import fs from 'node:fs';
import path from 'node:path';
import { audit } from './audit-cms-coverage.mjs';
import { readRows } from './lib/cms-manifests.mjs';

const position = process.argv.indexOf('--baseline');
const previousFile = position >= 0 ? process.argv[position + 1] : null;
const previousReport = previousFile && fs.existsSync(previousFile) ? JSON.parse(fs.readFileSync(previousFile, 'utf8')) : null;
const previous = previousReport?.inventory ?? previousReport;
if (previous) previous.required_fields = readRows(previous, 'required_fields', 'field_manifest', path.dirname(previousFile));
const current = audit();
const prior = new Set(previous?.required_fields?.map(field => field.id) ?? []);
const changed = current.required_fields.filter(field => !prior.has(field.id));
const removed = (previous?.required_fields ?? []).filter(field => !current.required_fields.some(next => next.id === field.id));
console.log(JSON.stringify({ source_hash: current.source_hash, baseline: previous?.source_hash ?? null,
  changed_fields: changed, removed_fields: removed,
  // Shared components and runtime data can affect every route. Until a complete
  // dependency graph proves a narrower set, rerun the full discovered matrix.
  affected_route_states: previous?.source_hash === current.source_hash ? [] : current.route_matrix.map(row => row.id),
  evidence_reuse: false }, null, 2));
