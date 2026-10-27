import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

// Metadata only: deliberately never read env files, uploads, dumps or credentials.
const workspace = path.resolve('..');
const backend = path.join(workspace, 'krekelbergkassa-backend');
const output = path.join(workspace, '_audit');
function files(root, extensions) {
  if (!fs.existsSync(root)) return [];
  return fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(root, entry.name);
    return entry.isDirectory() ? files(full, extensions) : extensions.some((ext) => full.endsWith(ext)) ? [full] : [];
  }).sort();
}
const relative = (file) => path.relative(workspace, file).replaceAll('\\', '/');
const phpFiles = (directory) => files(path.join(backend, directory), ['.php']);
const pages = files(path.resolve('src/app/[locale]/admin'), ['page.tsx']);
const sources = files(path.resolve('src'), ['.ts', '.tsx']);
const frontendApiCalls = [];
for (const filename of sources) {
  const source = fs.readFileSync(filename, 'utf8');
  const file = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true);
  function visit(node) {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) &&
        ['api', 'apiResult'].includes(node.expression.text) && node.arguments[0]) {
      frontendApiCalls.push({ file: relative(filename), line: file.getLineAndCharacterOfPosition(node.getStart(file)).line + 1,
        endpointExpression: node.arguments[0].getText(file),
        optionsExpression: node.arguments[1]?.getText(file) ?? null });
    }
    ts.forEachChild(node, visit);
  }
  visit(file);
}
const models = phpFiles('app/Models').map((file) => {
  const source = fs.readFileSync(file, 'utf8');
  return { file: relative(file), table: source.match(/protected\s+\$table\s*=\s*'([^']+)'/)?.[1] ?? 'Eloquent convention; verify',
    relations: [...source.matchAll(/\$this->(belongsTo|hasMany|hasOne|belongsToMany|morphMany|morphTo)\(([^;]+)\)/g)]
      .map((match) => ({ kind: match[1], arguments: match[2] })) };
});
const migrations = phpFiles('database/migrations').map((file) => ({ file: relative(file),
  tables: [...fs.readFileSync(file, 'utf8').matchAll(/Schema::(create|table|dropIfExists)\(['"]([^'"]+)/g)]
    .map((match) => ({ operation: match[1], table: match[2] })) }));
const routes = JSON.parse(fs.readFileSync(path.join(output, 'routes-current.json'), 'utf8').replace(/^\uFEFF/, ''));
const pageCoverage = pages.map((file) => ({ file: relative(file),
  route: file.replaceAll('\\', '/').split('/src/app/[locale]')[1].replace('/page.tsx', ''),
  staticReview: 'pending', actionPermissions: 'pending', desktop: 'pending', mobile: 'pending',
  locales: { nl: 'pending', en: 'pending', de: 'pending', fr: 'pending' },
  emptyState: 'pending', errorState: 'pending', businessE2E: 'pending' }));
const result = { generatedAt: new Date().toISOString(),
  limitations: ['Static inventory, not verification. Relation and migration regexes require semantic review.',
    'An endpoint without permission middleware may use policies or other gates; inspect the complete request path.',
    'Component wrappers and dynamic API expressions require tracing. Pending means unverified.'],
  routes, models, migrations, frontendApiCalls,
  services: phpFiles('app/Services').map(relative), jobs: phpFiles('app/Jobs').map(relative),
  events: phpFiles('app/Events').map(relative), listeners: phpFiles('app/Listeners').map(relative),
  policies: phpFiles('app/Policies').map(relative), middleware: phpFiles('app/Http/Middleware').map(relative),
  seeders: phpFiles('database/seeders').map(relative), factories: phpFiles('database/factories').map(relative),
  backendTests: phpFiles('tests').map(relative), pageCoverage,
};
fs.writeFileSync(path.join(output, 'system-inventory.json'), JSON.stringify(result, null, 2) + '\n');
console.log(`${routes.length} routes, ${models.length} models, ${migrations.length} migrations, ${frontendApiCalls.length} frontend API calls, ${pages.length} admin pages inventoried. Coverage remains pending until verified.`);
