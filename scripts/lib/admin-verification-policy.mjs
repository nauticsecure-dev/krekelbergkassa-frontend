// Applicability is a reviewed product decision, never inferred from a missing
// component, an empty fixture, or a passing smoke test. Unlisted checks stay open.
const navigationOnly = {
  '/admin/beheer': 'Management navigation hub; mutations belong to destination pages.',
  '/admin/diensten': 'Service navigation hub; mutations belong to destination pages.',
  '/admin/diensten-prijzen': 'Service/pricing navigation hub.',
  '/admin/financieel': 'Finance navigation hub with read-only summary statistics.',
  '/admin/makelaardij': 'Brokerage navigation hub.',
  '/admin/facturen/nieuw': 'Invoice creation method chooser; saves happen on destination pages.',
};
const readOnly = {
  '/admin/audit': 'Immutable audit log; detail inspection and filtering are applicable.',
  '/admin/product-stats': 'Read-only product statistics and filters.',
  '/admin/scan-logs': 'Read-only scan history and filters.',
  '/admin/rapportages': 'Read-only reports; export/print still require action verification.',
  '/admin/klanten/[id]/timeline': 'Read-only customer activity timeline.',
};

export function applicability(source) {
  const checks = {};
  const exclude = (keys, reason) => keys.forEach(key => { checks[key] = reason; });
  const redirect = source.redirect || source.route === '/admin/calculator/history';
  if (redirect) {
    exclude(['crud.create','crud.read','crud.update','crud.delete','validation','loading','error','empty','modals','detail','responsive'],
      'Redirect-only route; assert destination, authorization and locale preservation separately.');
  } else if (navigationOnly[source.route]) {
    exclude(['crud.create','crud.update','crud.delete','validation','modals','detail'], navigationOnly[source.route]);
  } else if (readOnly[source.route]) {
    exclude(['crud.create','crud.update','crud.delete','validation'], readOnly[source.route]);
  }
  return { kind: redirect ? 'redirect' : navigationOnly[source.route] ? 'hub' : readOnly[source.route] ? 'read-only' : 'workflow', exclusions: checks };
}

export function applyApplicability(row, policy) {
  row.applicability = policy;
  for (const [key, reason] of Object.entries(policy.exclusions)) {
    const parts = key.split('.');
    const target = parts.length === 2 ? row[parts[0]] : row;
    target[parts.at(-1)] = `n/a: ${reason}`;
  }
}

export function verificationLabel(value) {
  if (value.startsWith('n/a:')) return 'n/a';
  if (value.startsWith('pending')) return 'pending';
  if (value.startsWith('failed')) return 'FAIL';
  if (value.startsWith('pass:')) return 'pass';
  return 'partial';
}

// Inventory entries are source candidates, not verified actions. Each keeps
// three independent obligations so UI coverage cannot imply API enforcement.
export function actionInventory(pages) {
  const actions = new Map();
  for (const page of pages) for (const signal of page.actions ?? []) {
    const id = `${signal.file.replaceAll('\\', '/')}:${signal.line}:${signal.text}`;
    const item = actions.get(id) ?? { id, source: signal, routes: [], classification: 'needs review', uiVisibility: 'pending', directApiDenial: 'pending', authorizedExecution: 'pending' };
    item.routes.push(page.route);
    actions.set(id, item);
  }
  return [...actions.values()];
}
