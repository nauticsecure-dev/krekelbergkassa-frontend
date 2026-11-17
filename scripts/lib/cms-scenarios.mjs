const cmsToggle = '[data-cms-toggle]';
const loginForm = 'main form input[type=email]:visible';
const catalogPath = '/api/v1/service-catalog/services';
const serviceLoading = '#meer-diensten [data-cms-key="i18n.adminNew.common.loading"]';

export function serviceFaqStates(keys) {
  return keys.filter(key => /^diensten\.faq\.faq[2-9]\d*\.a$/.test(key)).map(key => 'accordion:' + key.split('.')[2]);
}

function loginRedirect(url, locale, admin) {
  const target = new URL(url.replaceAll('[locale]', locale), 'https://fixture.invalid');
  const query = new URLSearchParams({ returnTo: target.pathname + target.search });
  if (admin) query.set('role', 'manager');
  return `/${locale}/login?${query}`;
}

/** Deployment fixtures can override any row. Built-ins assert known page or auth behavior. */
export function scenarioFor(row, config) {
  const url = row.fixture_url ?? config.routeFixtures?.[row.route] ?? row.route;
  const scenario = config.scenarios?.[row.id] ?? config.scenarios?.[`${row.file}:${row.role}:${row.state}`];
  if (scenario) return { url, ...scenario };
  const authorization = row.role === 'super_admin' ? { enabled: cmsToggle } : { hidden: cmsToggle };
  const admin = row.route.startsWith('/[locale]/admin');
  const portal = /\/(?:\(portal\)|\(protected\))\//.test(row.file);
  if (row.state === 'default' && ((admin && ['guest', 'customer'].includes(row.role)) || (portal && row.role === 'guest'))) {
    return { url, expectedURL: loginRedirect(url, row.locale, admin), readOnly: true,
      assertions: [{ visible: loginForm }, { hidden: cmsToggle }] };
  }
  if (row.file.startsWith('src/app/[locale]/(auth)/') && row.state === 'default') {
    if (row.role === 'guest') return { url, expectedURL: url, assertions: [{ visible: loginForm }, authorization] };
    return { url, expectedURL: row.role === 'customer' ? '/[locale]/feed' : '/[locale]/admin', readOnly: true,
      assertions: [{ visible: 'main' }, authorization] };
  }
  if (row.state === 'default' && row.role === 'customer' && row.route === '/[locale]/feed') {
    return { url, expectedURL: url, assertions: [{ visible: 'main h1' }, authorization] };
  }
  if (row.state === 'default' && admin && (row.role === 'super_admin' || row.route === '/[locale]/admin')) {
    const heading = 'main h1:visible';
    // Only use this default on pages with an independently known visible heading.
    if (['/[locale]/admin', '/[locale]/admin/kalender'].includes(row.route)) {
      return { url, expectedURL: url, assertions: [{ visible: heading }, authorization] };
    }
  }
  if (!row.file.startsWith('src/app/[locale]/(site)/')) return null;

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
        authorization,
        ...ready,
        ...(row.fixture_record_id ? [{ visible: `main [data-cms-key="catalog.product.${row.fixture_record_id}.title"]` }] : []),
      ],
    };
  }
  if (row.route === '/[locale]/diensten') {
    const faq = /^accordion:(faq\d+)$/.exec(row.state)?.[1];
    if (faq) {
      return { url, expectedURL: url, actions: [
        { hidden: serviceLoading },
        { click: `button:has([data-cms-key="i18n.werf.faq.${faq}.q"])` },
      ],
        assertions: [{ visible: `[data-cms-key="diensten.faq.${faq}.a"]` }, authorization] };
    }
    const state = {
      loading: { hold: true, selector: serviceLoading },
      empty: { status: 200, body: { services: [] }, selector: '#meer-diensten [data-cms-key="i18n.globalUx.servicesEmpty"]' },
      error: { status: 503, body: { message: 'Catalog temporarily unavailable' }, selector: '#meer-diensten [data-cms-key="diensten.service.crane.image"]' },
    }[row.state];
    if (state) {
      const { selector, ...response } = state;
      return { url, expectedURL: url, intercept: { path: catalogPath, ...response },
        readOnly: row.state === 'loading', assertions: [{ visible: selector }, authorization] };
    }
  }
  if (row.route === '/[locale]/contact' && ['loading', 'empty', 'error'].includes(row.state)) {
    const loading = row.state === 'loading';
    const key = loading ? 'adminNew.common.loading' : 'contactPage.hoursUnavailable';
    const response = loading ? { hold: true } : row.state === 'empty'
      ? { status: 200, body: { hours: [] } } : { status: 503, body: { message: 'Opening hours temporarily unavailable' } };
    return { url, expectedURL: url, intercept: { path: '/api/v1/opening-hours', ...response }, readOnly: loading,
      assertions: [{ visible: `[data-cms-key="opening_hours.regular"] [data-cms-key="i18n.${key}"]` }, authorization] };
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
