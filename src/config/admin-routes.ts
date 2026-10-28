/**
 * Named admin paths. Create menus and dashboard shortcuts store the key,
 * never a literal URL. Every path is under /admin/.
 */
export const adminRouteCatalog = [
  { key: 'admin.customers.create', path: 'admin/klanten?new=1' },
  { key: 'admin.customers.index', path: 'admin/klanten' },
  { key: 'admin.boats.create', path: 'admin/boten?new=1' },
  { key: 'admin.boats.index', path: 'admin/boten' },
  { key: 'admin.planning.create', path: 'admin/afspraken?create=1' },
  { key: 'admin.planning.index', path: 'admin/planning' },
  { key: 'admin.stalling.create', path: 'admin/stalling?new=1' },
  { key: 'admin.stalling.index', path: 'admin/stalling' },
  { key: 'admin.invoices.create', path: 'admin/facturen?create=1' },
  { key: 'admin.invoices.index', path: 'admin/facturen' },
  { key: 'admin.brokerage.index', path: 'admin/verkopen' },
  { key: 'admin.suppliers.create', path: 'admin/leveranciers?new=1' },
  { key: 'admin.products.create', path: 'admin/producten/nieuw' },
  { key: 'admin.kassa.index', path: 'admin/kassa' },
  { key: 'admin.calculator.index', path: 'admin/calculator' },
  { key: 'admin.payments.index', path: 'admin/betalingen' },
  { key: 'admin.finance.index', path: 'admin/financieel' },
  { key: 'admin.shortcuts.index', path: 'admin/beheer/dashboard-shortcuts' },
] as const;

export type AdminRouteKey = (typeof adminRouteCatalog)[number]['key'];

const byKey = new Map(adminRouteCatalog.map((entry) => [entry.key, entry.path]));

export function adminHref(locale: string, routeKey: string, customUrl?: string | null): string {
  const path = byKey.get(routeKey as AdminRouteKey);
  if (path) {
    const base = '/' + path.split('?')[0];
    if (customUrl && customUrl.split(/[?#]/)[0] === base && !/[\\\x00-\x20]/.test(customUrl)) return '/' + locale + customUrl;
    return '/' + locale + '/' + path;
  }
  return `/${locale}/admin`;
}

export type AdminEntitySection = 'producten' | 'klanten' | 'boten' | 'stalling' | 'leveranciers';

export function adminRecordHref(
  locale: string,
  section: AdminEntitySection,
  record: { id?: unknown; public_id?: unknown; slug?: unknown },
  suffix = '',
): string {
  const key = typeof record.public_id === 'string' && record.public_id ? record.public_id : typeof record.id === 'string' ? record.id : '';
  // These names belong to existing child pages (for example a customer's timeline).
  const reserved = new Set(['timeline', 'nieuw', 'edit', 'editor', 'import']);
  const slug = record.public_id && typeof record.slug === 'string' && record.slug && !reserved.has(record.slug.toLowerCase()) ? `/${encodeURIComponent(record.slug)}` : '';
  return `/${locale}/admin/${section}/${encodeURIComponent(key)}${slug}${suffix}`;
}
