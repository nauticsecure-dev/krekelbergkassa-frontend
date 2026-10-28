// Freeze source for this run: concurrent workspace edits must not hot-reload a
// page halfway through sidebar/modal verification. Dependencies resolve from
// the ancestor frontend node_modules; no dependency tree is copied or changed.
const fs = require('node:fs');
const path = require('node:path');
const snapshot = path.resolve('artifacts/admin-audit/snapshot');
fs.mkdirSync(snapshot, { recursive:true });
for (const directory of ['src','public']) fs.cpSync(directory,path.join(snapshot,directory),{recursive:true});
for (const file of ['package.json','next.config.mjs','tsconfig.json','next-env.d.ts','tailwind.config.ts','tailwind.config.js','postcss.config.mjs','postcss.config.js']) {
  if(fs.existsSync(file)) fs.copyFileSync(file,path.join(snapshot,file));
}
process.argv[2]='3047';
process.argv[3]=snapshot;
process.chdir(snapshot);
require('./isolated-next-server.cjs');
