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
  if (path) return `/${locale}/${path}`;
  if (customUrl && customUrl.startsWith('/') && !customUrl.startsWith('//')) {
    return `/${locale}${customUrl}`;
  }
  return `/${locale}/admin`;
}

export type AdminEntitySection = 'producten' | 'klanten' | 'boten' | 'stalling' | 'leveranciers';

export function adminRecordHref(
  locale: string,
  section: AdminEntitySection,
  record: { id?: string | null; public_id?: string | null; slug?: string | null },
  suffix = '',
): string {
  const key = record.public_id || record.id || '';
  const slug = record.public_id && record.slug ? `/${encodeURIComponent(record.slug)}` : '';
  return `/${locale}/admin/${section}/${key}${slug}${suffix}`;
}
