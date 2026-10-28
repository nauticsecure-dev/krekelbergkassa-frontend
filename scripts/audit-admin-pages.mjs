import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { checkCalls, translationCalls, hardcodedCopy } from './lib/admin-i18n-audit.mjs';

const normalize = (file) => file.replaceAll('\\', '/');
const root = 'src/app/[locale]/admin';
function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = normalize(path.join(directory, entry.name));
    return entry.isDirectory() ? walk(file) : [file];
  });
}
const cache = new Map();
function source(file) {
  if (!cache.has(file)) cache.set(file, fs.readFileSync(file, 'utf8'));
  return cache.get(file);
}
// Shared primitives must not lend their notification states/permissions to every page.
const boundaries = /\/components\/(?:ui|shell|auth|site|sync)\/|\/components\/admin\/(?:AdminShell|AdminSidebar|AdminGlobalSearch|AdminUi|DataState|AdminConfirmModal|Pagination)\.tsx$/;
function components(file, found = new Set()) {
  if (found.has(file)) return found;
  found.add(file);
  const ast = ts.createSourceFile(file, source(file), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  for (const node of ast.statements) {
    if (!(ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) || !node.moduleSpecifier || node.importClause?.isTypeOnly) continue;
    const specifier = node.moduleSpecifier.text;
    if (!specifier.startsWith('.') && !specifier.startsWith('@/')) continue;
    const base = specifier.startsWith('@/') ? `src/${specifier.slice(2)}` : normalize(path.join(path.dirname(file), specifier));
    const target = [base, `${base}.tsx`, `${base}.ts`, `${base}/index.tsx`, `${base}/index.ts`].find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
    if (!target || boundaries.test(target) || !/\.(tsx|ts)$/.test(target)) continue;
    if (target.endsWith('.tsx') || target.startsWith('src/components/')) components(target, found);
  }
  return found;
}
const locales = ['nl', 'en', 'de', 'fr'];
const dictionaries = Object.fromEntries(locales.map((locale) => [locale, JSON.parse(fs.readFileSync(`src/i18n/messages/${locale}.json`, 'utf8'))]));
const evidence = (files, regex) => files.flatMap((file) => source(file).split('\n').flatMap((line, index) =>
  !line.trim().startsWith('import ') && regex.test(line) ? [{ file, line: index + 1, text: line.trim() }] : []));
const pages = walk(root).filter((file) => file.endsWith('/page.tsx')).sort().map((file) => {
  const files = [...components(file)].sort();
  const translations = files.flatMap((file) => {
    const result = checkCalls(translationCalls(source(file), file), dictionaries);
    return [...result.missing.map((item) => ({ file, kind: 'missing', ...item })), ...result.unresolved.map((item) => ({ file, kind: 'dynamic', ...item }))];
  });
  return {
    route: file.replace('src/app/[locale]', '').replace('/page.tsx', ''), file, components: files,
    redirect: /\bredirect\(/.test(source(file)), translations,
    hardcodedCopy: files.flatMap((file) => hardcodedCopy(source(file), file).map((item) => ({ file, ...item }))),
    grids: evidence(files, /grid-cols-\[/),
    states: Object.fromEntries(['LoadingState', 'ErrorState', 'EmptyState'].map((state) => [state, evidence(files, new RegExp(`<${state}\\b`))])),
    permissions: evidence(files, /\b(?:can|userCan|usePermission|canPerformCreate)\(/),
    modals: evidence(files, /<(?:Modal|AdminConfirmModal|\w+Modal)\b/),
    actions: evidence(files, /\b(?:onClick|onSubmit)=/),
  };
});
const result = {
  generatedAt: new Date().toISOString(), count: pages.length,
  method: 'Conservative local component import/export closure, including modal components. Shared primitives and shell excluded from page signals; see sharedFiles. A module may contain unused exports. Source presence never proves runtime coverage or authorization.',
  sharedFiles: ['src/app/[locale]/admin/layout.tsx', 'src/components/admin/AdminShell.tsx', 'src/components/admin/AdminSidebar.tsx', 'src/components/admin/AdminUi.tsx', 'src/components/admin/DataState.tsx', 'src/components/shell/PageHeaderStats.tsx'], pages,
};
fs.mkdirSync('artifacts/admin-audit', { recursive: true });
fs.writeFileSync('artifacts/admin-audit/source-matrix.json', JSON.stringify(result, null, 2) + '\n');
const rows = pages.map((page) => `| \`${page.route}\` | ${page.redirect ? 'redirect' : page.components.length} | ${page.translations.length} | ${page.hardcodedCopy.length} | ${page.grids.length} | ${Object.entries(page.states).filter(([, hits]) => hits.length).map(([state]) => state.replace('State', '')).join(', ') || '—'} | ${page.permissions.length} | ${page.modals.length} |`);
fs.writeFileSync('ADMIN_AUDIT.md', `# Admin UI/UX source audit\n\nGenerated ${result.generatedAt.slice(0, 10)} by \`node scripts/audit-admin-pages.mjs\`. ${pages.length} routes.\n\n${result.method}\n\nAll routes inherit the auth and admin shell from the admin layout. Counts below are source signals, **not browser passes**. Translation issues include unresolved dynamic keys; hardcoded copy is a review queue, including legitimate units and names. State columns record actual JSX use, not an import. Full file/line evidence and component paths: [source matrix](artifacts/admin-audit/source-matrix.json).\n\nSee [layout policy](ADMIN_LAYOUT_PATTERNS.md) and [verification ledger](ADMIN_VERIFICATION.md). Regenerate after extracting or moving components.\n\n| Route | Source modules | i18n issues | Copy candidates | Custom grids | State JSX | Permission calls | Modals |\n| --- | --- | --- | --- | --- | --- | --- | --- |\n${rows.join('\n')}\n`);
console.log(`${pages.length} routes; ${new Set(pages.flatMap((page) => page.components)).size} page/component modules. Source evidence written to artifacts/admin-audit/source-matrix.json.`);
