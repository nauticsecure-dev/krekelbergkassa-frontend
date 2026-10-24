import fs from 'node:fs';
import path from 'node:path';

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const filePath = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(filePath, out);
    else if (entry.name === 'page.tsx') out.push(filePath);
  }
  return out;
}

const pages = walk('src/app/[locale]/admin').sort();
for (const file of pages) {
  const src = fs.readFileSync(file, 'utf8');
  const route = file.replaceAll('\\', '/').replace('src/app/[locale]', '').replace('/page.tsx', '');
  const shell = /AdminPageHeader|AdminContent|AdminModuleHub|redirect\(/.test(src) ? 'yes' : 'no';
  const dynamic = /t\(\s*`[^`]*\$\{/.test(src) ? 'dynamic' : 'static';
  const grid = src.includes('grid-cols-[') ? 'custom' : 'shared';
  const states = /EmptyState|ErrorState|LoadingState/.test(src) ? 'yes' : 'no';
  const rbac = /usePermission|userCan\(/.test(src) ? 'can' : /user\?\.role|user\.role|roles:/.test(src) ? 'role' : 'none';
  console.log([route, shell, dynamic, grid, states, rbac].join('\t'));
}
console.log(`COUNT ${pages.length}`);
