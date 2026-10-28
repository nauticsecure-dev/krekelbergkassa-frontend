import fs from 'node:fs';
import path from 'node:path';
const directory = 'artifacts/admin-audit';
const matrix = JSON.parse(fs.readFileSync(`${directory}/source-matrix.json`, 'utf8'));
const reports = fs.readdirSync(directory).filter(name => /-results\.json$/.test(name)).map(name => ({file:`${directory}/${name}`, report:JSON.parse(fs.readFileSync(`${directory}/${name}`,'utf8'))})).sort((a,b)=>new Date(a.report.stats.startTime)-new Date(b.report.stats.startTime));
const tests = new Map();
// An interrupted runner may never flush its JSON reporter. Preserve its completed
// line results as weaker evidence, without inventing observations/screenshots.
const initialLog = `${directory}/browser-run.txt`;
if (fs.existsSync(initialLog)) {
 const text = fs.readFileSync(initialLog,'utf8');
 for(const match of text.matchAll(/\b(ok|x)\s+\d+[^\r\n]*route failure boundary: (\/admin[^\s]*)/g)) {
  const title = `route failure boundary: ${match[2]}`;
  tests.set(title,{title,status:match[1]==='ok'?'passed':'failed',errors:[],attachments:[],file:initialLog,logOnly:true});
 }
}
function visit(suite, file) {
 for (const spec of suite.specs ?? []) for (const test of spec.tests ?? []) {
  const result = test.results.at(-1);
  if (result) {
   const previous=tests.get(spec.title);
   tests.set(spec.title, {title:spec.title, status:result.status, errors:result.errors ?? [], attachments:result.attachments ?? [], file, history:previous?[...(previous.history??[]),{status:previous.status,report:previous.file,logOnly:!!previous.logOnly}]:[]});
  }
 }
 for (const child of suite.suites ?? []) visit(child,file);
}
for (const {file,report} of reports) for (const suite of report.suites) visit(suite,file);
const pending = 'pending';
const pages = matrix.pages.map(source => ({route:source.route, redirect:source.redirect, components:source.components,
 crud:{create:pending,read:pending,update:pending,delete:pending},validation:pending,loading:pending,error:pending,empty:pending,permissions:{ui:pending,backend:pending},modals:pending,detail:pending,
 locales:Object.fromEntries(['nl','en','de','fr'].map(locale=>[locale,pending])),responsive:pending,smoke:pending,evidence:[],gaps:[]}));
const page = route => pages.find(row=>row.route===route);
const passed = title => tests.get(title)?.status === 'passed';
function mark(route,title,apply) {
 const test = tests.get(title); if (!test) return;
 const row = page(route); row.evidence.push({title,status:test.status,report:test.file,attachments:test.attachments});
 if (test.status === 'passed') apply(row); else row.gaps.push(`${title}: ${test.status}`);
}
for (const row of pages) {
 const title = `route failure boundary: ${row.route}`;
 mark(row.route,title,row=>{row.smoke=tests.get(title).logOnly?'partial: initial NL smoke passed in interrupted run; settled-state rerun pending':'pass: NL, injected 503, no JS errors, loading settled';row.locales.nl='smoke only';
  const attachment = tests.get(title).attachments.find(item=>item.name==='route-observation');
  let observation;
  if (attachment?.path && fs.existsSync(attachment.path)) observation=JSON.parse(fs.readFileSync(attachment.path,'utf8'));
  else if (attachment?.body) observation=JSON.parse(Buffer.from(attachment.body,'base64').toString());
  if (observation) {row.observation=observation;if(observation.injectedErrorVisible) row.error=row.redirect?'partial: redirect destination displayed injected 503':'pass: injected 503 visible';else row.gaps.push('Injected service error was not visible verbatim; generic/fallback handling needs review.');}
 });
 if (row.smoke===pending && tests.has(title)) row.smoke=`failed: ${tests.get(title).status}`;
}
for (const locale of ['nl','en','de','fr']) {
 mark('/admin',`${locale}: dashboard sidebar and KPI responsive evidence`, row=>{row.locales[locale]='pass: shell/dashboard fixture';row.responsive='partial: dashboard 390,1280,1536; sidebar expanded/collapsed and mobile drawer';});
 mark('/admin/facturen/nieuw/handmatig',`${locale}: manual invoice fields remain inside the viewport at mobile and desktop widths`,row=>{row.locales[locale]='partial: locale renders, fields/viewport verified; wording quality not established';row.responsive='partial: manual form 390/1280';});
}
for (const route of ['kassa','kalender','audit']) mark(`/admin/${route}`,`${route}: empty page renders without overflow or JavaScript errors`,row=>{row.responsive='partial: empty fixture 390/1440';row.empty='pass: empty fixture renders';});
mark('/admin/facturen/nieuw/handmatig','manual invoice retains entered data when save fails, and submits cents once',row=>{row.crud.create='partial: correct cents payload once, failed-save retention; success pending';row.error='pass: failed save visible and form retained';});
mark('/admin/facturen/nieuw/handmatig','an invoice viewer cannot open the create form through a deep link',row=>row.permissions.ui='partial: invoice.view cannot open create form');
mark('/admin/audit','an admin cannot open the super-admin audit page directly',row=>row.permissions.ui='partial: admin denied super-admin page');
mark('/admin/kalender','calendar empty state and provider error with retry render in the browser',row=>{row.empty='pass: empty regular hours';row.error='pass: 503/retry/recovery';});
mark('/admin/calculator/pricing','employee reaches filtered rules, saves cents, and reloads the updated tariff',row=>{row.crud.read='pass: fixture filtered tariff';row.crud.update='pass: fixture cents save/reload';row.modals='partial: deep-link edit modal/save/close';});
mark('/admin/calculator/pricing','read-only employee sees tariffs without mutation controls or a deep-link modal',row=>row.permissions.ui='partial: pricing.view hides mutations and deep-link modal');
for(const allowed of [true,false])mark('/admin/calculator/pricing',`public Winterstalling pricing link respects pricing.update (${allowed})`,row=>row.permissions.ui+=`; public tariff edit link checked with pricing.update=${allowed}`);
for(const write of [false,true]) mark('/admin/klanten',`customer list write controls and create deep link (${write})`,row=>row.permissions.ui='partial: customer read-only/write controls and create intent');
mark('/admin/klanten','customer loading empty validation and create modal retain data then save',row=>{
 row.loading='pass: held request shows skeleton';row.empty='pass: empty customer list';row.validation='partial: required name blocks POST, 422 surfaced, form retained';row.error='pass: 422 and retry';row.crud.create='pass: stateful HTTP fixture create/list readback; database persistence pending';row.crud.read='pass: created fixture visible after refetch';row.modals='partial: create, validation failure, save and close';row.responsive='partial: populated validation modal 390/1280';row.locales.nl='partial: customer create/validation';
});
const backend = [
 {file:'../_audit/admin-layout-backend.xml',route:'/admin/calculator/pricing',scope:'pricing CRUD, validation, read-only denial, durable SQLite readback and audit'},
 {file:'../_audit/admin-customer-permissions.xml',route:'/admin/klanten',scope:'customer reader list/detail allowed; create/update/block/unblock/login-link/impersonation/recompute/delete denied'},
];
const gateFile=`${directory}/final-gates.json`;
const gateCodes=fs.existsSync(gateFile)?JSON.parse(fs.readFileSync(gateFile,'utf8').replace(/^\uFEFF/,'')):{};
for(const item of backend) if(fs.existsSync(item.file)) {
 const xml=fs.readFileSync(item.file,'utf8');const failures=/<failure\b|<error\b/.test(xml); const cases=(xml.match(/<testcase\b/g)??[]).length;
 item.status=cases&&!failures?'passed':'failed';item.cases=cases;
 const code=gateCodes[item.route==='/admin/klanten'?'customerPermissions':'pricingPermissions'];
 if(code!==undefined&&code!==0)item.status='failed';
 if(item.status==='passed')page(item.route).permissions.backend=`partial: ${item.scope}`;
 else page(item.route).gaps.push(`Backend ${item.file}: ${item.status}`);
}
for(const row of pages) {
 if(row.redirect)row.gaps.push('Redirect destination requires its own verification; no CRUD or state coverage inherited.');
 if(row.route.includes('[id]')) row.gaps.push('Populated detail, missing record, ownership and every detail action remain unverified unless explicitly listed.');
 if(Object.values(row.crud).includes(pending))row.gaps.push('Pending CRUD operations require isolated backend fixtures and durable readback.');
 if(row.validation===pending)row.gaps.push('Field/server validation not exercised for this route.');
 if(row.loading===pending)row.gaps.push('Delayed loading state not exercised; waiting for settled content is not loading-state verification.');
 if(row.permissions.ui===pending||row.permissions.backend===pending)row.gaps.push('Full button/action/entity permission matrix remains open.');
}
const environmentProblems=[];
if(fs.existsSync(initialLog) && /memory allocation|out of memory|paging file/i.test(fs.readFileSync(initialLog,'utf8'))) environmentProblems.push('Initial broad browser run exhausted host memory. Later frozen-source runs supplied completed reports; earlier partial logs remain in attempt history.');
for(const file of fs.readdirSync(directory).filter(file=>/^batch-\d+\.txt$/.test(file))) if(!fs.existsSync(`${directory}/${file.replace('.txt','-results.json')}`)) environmentProblems.push(`${file}: no completed JSON report; no scenario coverage credited.`);
const images=[];
function collectImages(folder) {
 for(const entry of fs.readdirSync(folder,{withFileTypes:true})) {
  if(entry.name==='snapshot') continue;
  const file=`${folder}/${entry.name}`;
  if(entry.isDirectory())collectImages(file);else if(file.endsWith('.png'))images.push(file);
 }
}
collectImages(directory);
for(const row of pages) {
 row.screenshots=[];
 for(const evidence of row.evidence.filter(item=>item.status==='passed')) {
  const root=evidence.report.replace(/-results\.json$/,'');
  const locale=evidence.title.split(':')[0];
  row.screenshots.push(...images.filter(file=>file.startsWith(root+'/') && (
   evidence.title.includes('dashboard sidebar') && file.includes('dashboard-sidebar-and-KPI') && path.basename(file).startsWith(locale+'-') ||
   evidence.title.includes('manual invoice fields') && new RegExp(`^${locale}-\\d+\\.png$`).test(path.basename(file)) ||
   evidence.title.includes('empty page renders') && new RegExp(`^${row.route.split('/').at(-1)}-\\d+\\.png$`).test(path.basename(file)) ||
   evidence.title.startsWith('customer loading empty') && path.basename(file).startsWith('customer-validation-')
  )));
  row.screenshots.push(...evidence.attachments.filter(item=>item.contentType==='image/png' && item.path).map(item=>item.path.replaceAll('\\','/')));
 }
 row.screenshots=[...new Set(row.screenshots)];
}
const contractsLog=fs.existsSync(`${directory}/contracts.txt`)?fs.readFileSync(`${directory}/contracts.txt`,'utf8'):'';
const i18nLog=fs.existsSync(`${directory}/i18n-tests.txt`)?fs.readFileSync(`${directory}/i18n-tests.txt`,'utf8'):'';
const contractCases=Number(contractsLog.match(/(\d+) passed/)?.[1]??0);
const verificationGates={
 typecheck:{status:gateCodes.typecheck===0?'passed':'pending/failed',evidence:`${directory}/typecheck-final.txt`},
 contracts:{status:contractCases>0&&!/\b[1-9]\d* failed/.test(contractsLog)?'passed':'pending/failed',cases:contractCases,evidence:`${directory}/contracts.txt`},
 translationAuditor:{status:/\bfail\s+0\b/.test(i18nLog)?'passed':'pending/failed',evidence:`${directory}/i18n-tests.txt`},
};
const result={generatedAt:new Date().toISOString(),boundary:'Browser tests intercept HTTP; backend tests use SQLite in memory. Browser smoke proves neither CRUD persistence nor complete localization. Pending is unverified. Source signal counts are not test passes.',environmentProblems,verificationGates,browserTests:[...tests.values()],backend,pages};
fs.writeFileSync(`${directory}/verification.json`,JSON.stringify(result,null,2)+'\n');
const short=value=>value===pending?'pending':value.startsWith('failed')?'FAIL':value.startsWith('pass:')?'pass':'partial';
const rows=pages.map(row=>`| \`${row.route}\` | ${short(row.smoke)} | ${['create','read','update','delete'].map(key=>`${key[0].toUpperCase()}:${short(row.crud[key])}`).join(' ')} | ${short(row.validation)} | ${short(row.loading)} / ${short(row.error)} / ${short(row.empty)} | ${short(row.permissions.ui)} / ${short(row.permissions.backend)} | ${short(row.modals)} / ${short(row.detail)} | ${Object.entries(row.locales).filter(([,v])=>v!==pending).map(([k])=>k).join(', ')||'pending'} | ${short(row.responsive)} |`);
const executed=[...tests.values()];
fs.writeFileSync('ADMIN_VERIFICATION.md',`# Admin page-by-page verification\n\nGenerated ${result.generatedAt}. ${pages.length} routes.\n\n${result.boundary}\n\nBrowser results: ${executed.filter(t=>t.status==='passed').length} passed, ${executed.filter(t=>t.status!=='passed').length} failed/interrupted latest test observations. This is scenario coverage, not complete page sign-off. Reports, exact test names, screenshots/traces, per-route observations and gaps are in [verification.json](artifacts/admin-audit/verification.json).\n\nReproduce: \`node scripts/audit-admin-pages.mjs\`, \`node scripts/verify-admin-batches.mjs\`, then \`node scripts/report-admin-verification.mjs\`. Each small batch restarts Next to bound memory and retains its own report. Remove only the specific report for a changed scenario before rerunning it; existing passing evidence is reused. Run backend permission suites separately.\n\n## Backend permission evidence\n\n${backend.map(item=>`- ${item.route}: **${item.status??'pending'}**, ${item.cases??0} tests; ${item.scope}. Evidence: \`${item.file}\`.`).join('\n')}\n\n## Route matrix\n\nCRUD letters are create/read/update/delete. L/E/E = loading/error/empty. Permissions = browser UI/backend. Modal/detail and locales show partial scenarios only; full descriptions are in the JSON ledger.\n\n| Route | NL 503 smoke | CRUD | Validation | L/E/E | Permissions UI/API | Modal/detail | Browser locales | Responsive |\n| --- | --- | --- | --- | --- | --- | --- | --- | --- |\n${rows.join('\n')}\n\n## Open release gaps\n\n- All pending cells require verification; redirects and hubs must have applicability reviewed individually.\n- Most CRUD successes/deletes, field validation, delayed loading, populated modals/details and entity-level permission combinations remain pending.\n- NL/EN/DE/FR coverage is limited to the named dashboard/form scenarios. Hardcoded-copy review is in \`artifacts/admin-audit/i18n.json\`; key completeness alone is not full localization.\n- Responsive evidence covers representative shell/empty/form states. Long populated charts, document zones, audit diffs and POS workflows remain pending per [layout policy](ADMIN_LAYOUT_PATTERNS.md).\n- No provider or production database effects are tested. Backend denial evidence does not prove every control is hidden, and hidden controls do not prove backend authorization.\n`);
console.log(`${pages.length} route rows; ${executed.length} browser scenarios; ${backend.filter(item=>item.status==='passed').length} backend suites passed.`);
if(environmentProblems.length) {
 const markdown=fs.readFileSync('ADMIN_VERIFICATION.md','utf8');
 fs.writeFileSync('ADMIN_VERIFICATION.md',markdown.replace('## Backend permission evidence',`## Environment history\n\n${environmentProblems.map(note=>`- ${note}`).join('\n')}\n\n## Backend permission evidence`));
}
const verified=executed.filter(test=>test.status==='passed'&&!test.logOnly).length;
const logOnly=executed.filter(test=>test.status==='passed'&&test.logOnly).length;
const failures=executed.filter(test=>test.status!=='passed').length;
let markdown=fs.readFileSync('ADMIN_VERIFICATION.md','utf8').replace(/Browser results:[^\n]+/,`Browser results: **${verified} completed browser scenarios passed**, ${logOnly} earlier log-only smoke passes, ${failures} latest failures/interrupted observations. Log-only passes remain partial evidence. This is scenario coverage, not complete page sign-off.`);
markdown=markdown.replace('## Backend permission evidence',`## Verification gates\n\n${Object.entries(verificationGates).map(([name,gate])=>`- ${name}: **${gate.status}** ([log](${gate.evidence})).`).join('\n')}\n\n## Backend permission evidence`);
markdown=markdown.replace('## Verification gates','## Changes made\n\n- Follow extracted component imports and preserve file/line source evidence for every route.\n- Gate customer list mutations, handlers and create deep links with `customers.write`, alongside direct API denial tests.\n- Use native `[id]/[slug]` pages instead of the redundant middleware self-proxy; all five aliases are rechecked. Authentication and no-cache handling remain in place.\n- Hide the closed mobile drawer from keyboard navigation, contain focus, support Escape and restore focus; translate sidebar controls.\n- Translate 88 French shell/dashboard strings and assert real French copy in the browser. Check bounded dynamic settings keys and collect hardcoded/English-identical copy for review.\n- Standardize the document split layout and shrinkable chart tracks. Keep five header KPIs at `2xl`, documented in [layout patterns](ADMIN_LAYOUT_PATTERNS.md).\n\n## Verification gates');
markdown+='\n## Browser screenshots\n\nOnly screenshots from passing scenarios are listed; failed-run traces remain in the JSON ledger.\n\n';
for(const row of pages.filter(row=>row.screenshots.length)) markdown+=`- \`${row.route}\`: ${row.screenshots.map((file,index)=>`[${path.basename(file)}](${file.includes(' ') ? '<'+file+'>' : file})`).join(', ')}\n`;
markdown+='\n## Localization limits\n\nThe French shell/dashboard copy was reviewed and corrected after screenshots exposed English text behind valid French keys. Other pages still require wording review. `artifacts/admin-audit/i18n.json` includes hardcoded JSX and locale entries identical to English as review queues; names and technical terms can legitimately match. Locale rendering and key completeness do not establish translation quality.\n';
const recovered=executed.filter(test=>test.status==='passed'&&test.history?.some(attempt=>attempt.status!=='passed'));
if(recovered.length)markdown+='\n## Rechecked failures\n\nEarlier failures are retained in the JSON attempt history and original reports. Latest results are shown in the route matrix.\n\n'+recovered.map(test=>`- ${test.title}: passed on recheck; earlier report(s): ${test.history.filter(item=>item.status!=='passed').map(item=>`[${path.basename(item.report)}](${item.report})`).join(', ')}.`).join('\n')+'\n';
fs.writeFileSync('ADMIN_VERIFICATION.md',markdown);
