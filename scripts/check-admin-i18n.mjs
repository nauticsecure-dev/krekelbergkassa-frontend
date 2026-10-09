import fs from 'node:fs';
import path from 'node:path';

const locales = ['nl', 'en', 'de'];
const roots = ['src/app/[locale]/admin', 'src/components/admin'];
const dictionaries = Object.fromEntries(
  locales.map((locale) => [
    locale,
    JSON.parse(fs.readFileSync(path.join('src/i18n/messages', `${locale}.json`), 'utf8')),
  ])
);

function sourceFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filePath = path.join(directory, entry.name);
    return entry.isDirectory()
      ? sourceFiles(filePath)
      : /\.(ts|tsx)$/.test(entry.name)
        ? [filePath]
        : [];
  });
}

function translationAt(dictionary, key) {
  return key.split('.').reduce(
    (value, segment) =>
      value && typeof value === 'object' && segment in value ? value[segment] : undefined,
    dictionary
  );
}

const missing = [];
for (const root of roots) {
  for (const filePath of sourceFiles(root)) {
    const source = fs.readFileSync(filePath, 'utf8');
    for (const match of source.matchAll(/\bt\(\s*(['"])([^'"]+)\1\s*(?:,\s*\{([^)]*)\))?/g)) {
      const [, , key, options = ''] = match;
      const absent = locales.filter((locale) => typeof translationAt(dictionaries[locale], key) !== 'string');
      if (absent.length && !/\bdefaultValue\s*:/.test(options)) {
        missing.push(`${filePath}: ${key} missing in ${absent.join(', ')}`);
      }
    }
  }
}

if (missing.length) {
  console.error(`Admin translations missing (${missing.length}):\n${missing.join('\n')}`);
  process.exitCode = 1;
} else {
  console.log('All static admin translation keys exist in NL, EN and DE.');
}
