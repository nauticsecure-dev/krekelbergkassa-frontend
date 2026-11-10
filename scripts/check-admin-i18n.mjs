import fs from 'node:fs';
import path from 'node:path';
import { checkCalls, translationCalls, hardcodedCopy, flattenStrings, classifyCopy } from './lib/admin-i18n-audit.mjs';

const locales = ['nl', 'en', 'de', 'fr'];
const roots = ['src/app/[locale]/admin', 'src/components/admin', 'src/components/shell'];
const dictionaries = Object.fromEntries(locales.map((locale) => [locale,
  JSON.parse(fs.readFileSync(path.join('src/i18n/messages', `${locale}.json`), 'utf8'))]));

function sourceFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? sourceFiles(file) : /\.(ts|tsx)$/.test(entry.name) ? [file] : [];
  });
}

const missing = [];
const unresolved = [];
const copyCandidates = [];
const referencedKeys = new Set();
let callCount = 0;
for (const file of roots.flatMap(sourceFiles).sort()) {
  const calls = translationCalls(fs.readFileSync(file, 'utf8'), file);
  for (const call of calls) for (const key of call.patterns) if (!key.includes('\u0000')) referencedKeys.add(key);
  callCount += calls.length;
  const result = checkCalls(calls, dictionaries);
  missing.push(...result.missing.map((item) => ({ file, ...item })));
  unresolved.push(...result.unresolved.map((item) => ({ file, ...item })));
  copyCandidates.push(...hardcodedCopy(fs.readFileSync(file, 'utf8'), file).map((item) => ({ file, ...item })));
}
const strict = process.argv.includes('--strict-dynamic');
const english = flattenStrings(dictionaries.en);
const identicalEnglishCopy = locales.filter(locale=>locale!=='en').flatMap(locale=>{
  const strings=flattenStrings(dictionaries[locale]);
  return [...referencedKeys].filter(key=>strings[key]===english[key] && typeof strings[key]==='string' && /\p{L}{2}/u.test(strings[key])).map(key=>({locale,key,text:strings[key]}));
});
const decisions = JSON.parse(fs.readFileSync(new URL('./admin-copy-decisions.json', import.meta.url), 'utf8'));
const copyReview = classifyCopy([...copyCandidates, ...identicalEnglishCopy], decisions);
const reviewSummary = Object.fromEntries(['intentional', 'translate', 'unreviewed'].map(status => [status, copyReview.filter(item => item.review.decision === status).length]));
if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ locales, callCount, missing, unresolved, copyCandidates, identicalEnglishCopy, copyReview, reviewSummary, strict }, null, 2));
} else {
  for (const item of missing) console.error(`${item.file}:${item.line}: ${item.key} missing/empty in ${item.locales.join(', ')}`);
  for (const item of unresolved) console.warn(`${item.file}:${item.line}: runtime key requires review: ${item.expression}`);
  console.log(`${callCount} translation calls; ${missing.length} missing/empty entries; ${unresolved.length} unresolved runtime patterns. NL/EN/DE/FR checked; fallback text does not waive missing translations.`);
  console.log(`${copyCandidates.length} hardcoded JSX copy candidates require review (including legitimate units/names); use --json for file/line evidence.`);
  console.log(`${identicalEnglishCopy.length} referenced locale entries match English and require copy review; shared names/technical terms may be intentional.`);
  console.log(`Recorded copy decisions: ${JSON.stringify(reviewSummary)}. --strict-copy requires every current candidate to be intentional or fixed.`);
}
process.exitCode = missing.length || (strict && unresolved.length) || (process.argv.includes('--strict-copy') && (reviewSummary.translate || reviewSummary.unreviewed)) ? 1 : 0;
