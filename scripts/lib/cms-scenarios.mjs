/** Use executable public-page defaults and allow deployment fixtures to override any row. */
export function scenarioFor(row, config) {
  const scenario = config.scenarios?.[row.id] ?? config.scenarios?.[`${row.file}:${row.role}:${row.state}`];
  if (scenario) return scenario;
  if (!row.file.startsWith('src/app/[locale]/(site)/')) return null;

  const url = config.routeFixtures?.[row.route] ?? row.route;
  const cmsToggle = '[data-cms-toggle]';
  if (row.state === 'default') {
    const ready = [];
    if (row.route === '/[locale]/diensten') {
      ready.push({ visible: '[data-cms-key="i18n.servicePage.overviewTitle"]' });
    }
    if (['/[locale]/contact', '/[locale]/faq', '/[locale]/over-ons'].includes(row.route)) {
      ready.push({ attached: 'main [data-cms-key="company.email"][data-cms-version]:not([data-cms-version="unloaded"])' });
    }
    return {
      url, expectedURL: url,
      assertions: [
        { visible: 'main h1:visible' },
        row.role === 'super_admin' ? { enabled: cmsToggle } : { hidden: cmsToggle },
        ...ready,
      ],
    };
  }
  if (row.state === 'modal' && row.role === 'super_admin') {
    return {
      url, expectedURL: url, readOnly: true,
      actions: [{ click: cmsToggle }, { click: '[data-cms-catalog-open]' }],
      assertions: [{ visible: '[role=dialog] [data-cms-catalog-search]' }],
    };
  }
  return null;
}
