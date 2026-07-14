'use client';

import * as React from 'react';
import { BarChart3, TrendingDown, TrendingUp } from 'lucide-react';
import { AdminPageHeader } from '@/components/admin/AdminShell';
import {
  AdminContent,
  AdminSectionCard,
  AdminSelect,
  AdminTable,
  AdminTableCard,
  AdminTableCell,
  AdminTableHead,
  AdminTableHeaderCell,
  AdminTableRow,
} from '@/components/admin/AdminUi';
import { Badge } from '@/components/ui/Badge';
import { EmptyState, ErrorState, LoadingState } from '@/components/admin/DataState';
import { useQuery } from '@/lib/hooks/useAsync';
import { productsService, productGroupsService } from '@/lib/services';
import { formatCurrency, formatDate } from '@/lib/format';
import { useIntl } from '@/i18n/IntlProvider';
import Link from 'next/link';

const SORT_OPTIONS = [
  { value: 'revenue', label: 'Omzet' },
  { value: 'sold', label: 'Verkopen' },
  { value: 'today', label: 'Vandaag' },
  { value: 'week', label: 'Deze week' },
  { value: 'month', label: 'Deze maand' },
  { value: 'last_sale', label: 'Laatste verkoop' },
];

export default function ProductStatsPage() {
  const { locale, t } = useIntl();
  const dateLocale = locale === 'en' ? 'en-GB' : locale === 'de' ? 'de-DE' : 'nl-NL';
  const [sort, setSort] = React.useState('revenue');
  const [groupFilter, setGroupFilter] = React.useState('');

  const stats = useQuery([sort, groupFilter], () =>
    productsService.statsBulk()
  );
  const groups = useQuery(['product-groups-stats'], () => productGroupsService.list({ per_page: 100 }));

  const groupRows = (groups.data as { data?: Array<Record<string, unknown>> })?.data
    ?? (Array.isArray(groups.data) ? (groups.data as Array<Record<string, unknown>>) : []);

  const allRows = React.useMemo(() => stats.data ?? [], [stats.data]);

  const filteredRows = React.useMemo(() => {
    let rows = [...allRows];
    if (groupFilter) {
      rows = rows.filter((r) => String(r.product_group_id ?? '') === groupFilter);
    }
    // Sort client-side since statsBulk doesn't accept sort parameter
    rows.sort((a, b) => {
      switch (sort) {
        case 'sold': return Number(b.times_sold ?? 0) - Number(a.times_sold ?? 0);
        case 'today': return Number(b.times_sold_today ?? 0) - Number(a.times_sold_today ?? 0);
        case 'week': return Number(b.times_sold_week ?? 0) - Number(a.times_sold_week ?? 0);
        case 'month': return Number(b.times_sold_month ?? 0) - Number(a.times_sold_month ?? 0);
        case 'last_sale': return (String(b.last_sale_at ?? '') > String(a.last_sale_at ?? '') ? 1 : -1);
        default: return Number(b.revenue ?? b.revenue_incl_vat ?? 0) - Number(a.revenue ?? a.revenue_incl_vat ?? 0);
      }
    });
    return rows;
  }, [allRows, sort, groupFilter]);

  const topRows = filteredRows.slice(0, 50);
  const slowRows = [...filteredRows].filter((r) => Number(r.times_sold ?? 0) === 0 || Number(r.last_sale_days_ago ?? 999) > 90);

  return (
    <>
      <AdminPageHeader
        title={t('adminNew.productStats.title', { defaultValue: 'Product Statistieken' })}
        subtitle={t('adminNew.productStats.subtitle', { defaultValue: 'Omzet, verkopaantallen en marges per product' })}
        stats={[
          { label: 'Producten', value: allRows.length, icon: BarChart3, tone: 'marine' },
          { label: 'Top verkopers', value: allRows.filter((r) => Number(r.times_sold_today ?? 0) >= 3).length, icon: TrendingUp, tone: 'success' },
          { label: 'Traag lopend', value: slowRows.length, icon: TrendingDown, tone: 'warning' },
        ]}
      />

      <AdminContent>
        <div className="mb-4 flex flex-wrap gap-3">
          <AdminSelect value={sort} onChange={setSort}>
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </AdminSelect>
          <div className="w-52">
            <AdminSelect value={groupFilter} onChange={setGroupFilter}>
              <option value="">Alle groepen</option>
              {groupRows.map((g) => (
                <option key={String(g.id)} value={String(g.id)}>{String(g.name)}</option>
              ))}
            </AdminSelect>
          </div>
        </div>

        {stats.loading ? <LoadingState label={t('adminNew.common.loading')} variant="table" /> : null}
        {!stats.loading && stats.error ? <ErrorState message={stats.error} onRetry={() => void stats.refetch()} /> : null}

        {!stats.loading && !stats.error ? (
          topRows.length === 0 ? (
            <EmptyState
              title={t('adminNew.productStats.emptyTitle', { defaultValue: 'Geen statistieken' })}
              message={t('adminNew.productStats.emptyMessage', { defaultValue: 'Nog geen verkoopdata beschikbaar.' })}
            />
          ) : (
            <>
              <AdminSectionCard
                title={t('adminNew.productStats.topProducts', { defaultValue: `Top producten (${topRows.length})` })}
                icon={TrendingUp}
              >
                <AdminTableCard>
                  <AdminTable minWidth={840}>
                    <AdminTableHead>
                      <tr>
                        <AdminTableHeaderCell>#</AdminTableHeaderCell>
                        <AdminTableHeaderCell>{t('adminNew.products.columns.name')}</AdminTableHeaderCell>
                        <AdminTableHeaderCell>Groep</AdminTableHeaderCell>
                        <AdminTableHeaderCell>Verkopen</AdminTableHeaderCell>
                        <AdminTableHeaderCell>Vandaag</AdminTableHeaderCell>
                        <AdminTableHeaderCell>Omzet</AdminTableHeaderCell>
                        <AdminTableHeaderCell>Laatste verkoop</AdminTableHeaderCell>
                        <AdminTableHeaderCell>Status</AdminTableHeaderCell>
                      </tr>
                    </AdminTableHead>
                    <tbody>
                      {topRows.map((row, i) => {
                        const revenue = Number(row.revenue ?? row.revenue_incl_vat ?? 0);
                        const soldToday = Number(row.times_sold_today ?? 0);
                        const isHot = soldToday >= 3;
                        const color = String(row.color ?? row.group_color ?? '');
                        return (
                          <AdminTableRow
                            key={String(row.product_id ?? row.id ?? i)}
                            style={color ? { borderLeft: `3px solid ${color}` } : undefined}
                          >
                            <AdminTableCell className="text-xs font-bold text-navy-400">{i + 1}</AdminTableCell>
                            <AdminTableCell>
                              <Link
                                href={`/${locale}/admin/producten/${String(row.product_id ?? row.id ?? '')}`}
                                className="font-semibold text-marine-700 hover:text-marine-900"
                              >
                                {String(row.name ?? row.product_name ?? '—')}
                              </Link>
                              {row.code ? <div className="font-mono text-xs text-navy-400">{String(row.code)}</div> : null}
                            </AdminTableCell>
                            <AdminTableCell className="text-xs text-navy-600">
                              {String(row.group_name ?? row.product_group_name ?? '—')}
                            </AdminTableCell>
                            <AdminTableCell className="tabular-nums text-sm">{String(row.times_sold ?? 0)}</AdminTableCell>
                            <AdminTableCell className="tabular-nums text-sm">
                              {soldToday > 0 ? (
                                <span className={`font-bold ${isHot ? 'text-gold-600' : 'text-navy-700'}`}>{soldToday}</span>
                              ) : <span className="text-navy-300">0</span>}
                            </AdminTableCell>
                            <AdminTableCell className="tabular-nums text-sm font-semibold text-marine-700">
                              {formatCurrency(revenue / 100, dateLocale)}
                            </AdminTableCell>
                            <AdminTableCell className="whitespace-nowrap text-xs text-navy-500">
                              {row.last_sale_at ? formatDate(String(row.last_sale_at), dateLocale) : '—'}
                            </AdminTableCell>
                            <AdminTableCell>
                              {isHot ? (
                                <Badge tone="gold">🔥 Hot</Badge>
                              ) : Number(row.times_sold ?? 0) === 0 ? (
                                <Badge tone="neutral">Nooit verkocht</Badge>
                              ) : null}
                            </AdminTableCell>
                          </AdminTableRow>
                        );
                      })}
                    </tbody>
                  </AdminTable>
                </AdminTableCard>
              </AdminSectionCard>

              {slowRows.length > 0 ? (
                <AdminSectionCard
                  title={t('adminNew.productStats.slowProducts', { defaultValue: `Traag lopend (${slowRows.length})` })}
                  icon={TrendingDown}
                >
                  <AdminTableCard>
                    <AdminTable minWidth={640}>
                      <AdminTableHead>
                        <tr>
                          <AdminTableHeaderCell>{t('adminNew.products.columns.name')}</AdminTableHeaderCell>
                          <AdminTableHeaderCell>Groep</AdminTableHeaderCell>
                          <AdminTableHeaderCell>Verkopen (totaal)</AdminTableHeaderCell>
                          <AdminTableHeaderCell>Laatste verkoop</AdminTableHeaderCell>
                        </tr>
                      </AdminTableHead>
                      <tbody>
                        {slowRows.slice(0, 30).map((row, i) => (
                          <AdminTableRow key={String(row.product_id ?? row.id ?? i)}>
                            <AdminTableCell>
                              <Link
                                href={`/${locale}/admin/producten/${String(row.product_id ?? row.id ?? '')}`}
                                className="font-semibold text-marine-700 hover:text-marine-900"
                              >
                                {String(row.name ?? row.product_name ?? '—')}
                              </Link>
                            </AdminTableCell>
                            <AdminTableCell className="text-xs text-navy-600">
                              {String(row.group_name ?? row.product_group_name ?? '—')}
                            </AdminTableCell>
                            <AdminTableCell className="tabular-nums text-sm">{String(row.times_sold ?? 0)}</AdminTableCell>
                            <AdminTableCell className="whitespace-nowrap text-xs text-navy-500">
                              {row.last_sale_at ? formatDate(String(row.last_sale_at), dateLocale) : 'Nooit'}
                            </AdminTableCell>
                          </AdminTableRow>
                        ))}
                      </tbody>
                    </AdminTable>
                  </AdminTableCard>
                </AdminSectionCard>
              ) : null}
            </>
          )
        ) : null}
      </AdminContent>
    </>
  );
}
