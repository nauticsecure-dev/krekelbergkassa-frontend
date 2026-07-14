'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  BarChart3,
  CreditCard,
  Download,
  Layers,
  Printer,
  Receipt,
  Ship,
  Users,
  Wallet,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AdminPageHeader } from '@/components/admin/AdminShell';
import {
  AdminContent,
  AdminSectionCard,
  AdminSelect,
  AdminStatusStrip,
  AdminTable,
  AdminTableCell,
  AdminTableHead,
  AdminTableHeaderCell,
  AdminTableRow,
} from '@/components/admin/AdminUi';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { LoadingState, ErrorState } from '@/components/admin/DataState';
import { kassaService, invoicesService, workOrdersService } from '@/lib/services';
import { useMutation, useQuery } from '@/lib/hooks/useAsync';
import { formatCurrency } from '@/lib/format';
import { useIntl } from '@/i18n/IntlProvider';
import { useToast } from '@/components/ui/ToastProvider';
import { getApiErrorMessage } from '@/lib/api-error';

const PRESETS = [
  'today',
  'yesterday',
  'last_7_days',
  'last_30_days',
  'this_month',
  'previous_month',
  'this_quarter',
  'previous_quarter',
  'this_year',
  'previous_year',
];

const PIE_COLORS = ['#1f93b8', '#0ea5e9', '#bd8528', '#7c3aed', '#059669', '#e11d48', '#475569'];
const AGING_COLORS = ['#059669', '#d97706', '#ea580c', '#e11d48'];
const METHOD_LABELS: Record<string, string> = {
  bank_transfer: 'Overboeking',
  banktransfer: 'Overboeking',
  cash: 'Contant',
  ideal: 'iDEAL',
  creditcard: 'Creditcard',
  paypal: 'PayPal',
  klarna: 'Klarna',
  applepay: 'Apple Pay',
  googlepay: 'Google Pay',
  sofort: 'SOFORT',
  bancontact: 'Bancontact',
  directdebit: 'Incasso',
  invoice: 'Op factuur',
  manual: 'Handmatig',
};
const methodLabel = (key: string) => METHOD_LABELS[key.toLowerCase()] ?? key;

type Rec = Record<string, unknown>;
const obj = (v: unknown): Rec => (v && typeof v === 'object' ? (v as Rec) : {});
const arr = (v: unknown): Rec[] => (Array.isArray(v) ? (v as Rec[]) : []);
const n = (v: unknown): number => (typeof v === 'number' ? v : Number(v) || 0);
const str = (v: unknown): string => (v == null ? '' : String(v));

export default function ReportsPage() {
  const { locale, t } = useIntl();
  const { push } = useToast();
  const dateLocale = locale === 'en' ? 'en-GB' : locale === 'de' ? 'de-DE' : 'nl-NL';
  const [period, setPeriod] = React.useState('this_month');
  const [exporting, setExporting] = React.useState(false);
  const [dateFrom, setDateFrom] = React.useState('');
  const [dateTo, setDateTo] = React.useState('');

  const report = useQuery([period, dateFrom, dateTo], () =>
    kassaService.analytics(dateFrom && dateTo ? { date_from: dateFrom, date_to: dateTo } : { period })
  );
  const money = (cents: unknown) => formatCurrency(n(cents) / 100, dateLocale);

  // Trello #88: work-order stats card with a month selector.
  const [woMonth, setWoMonth] = React.useState('');
  const workOrderStats = useQuery([woMonth], () =>
    workOrdersService.stats(woMonth ? { period: woMonth } : undefined).catch(() => null)
  );
  // Trello #85: overdue invoices for the aging action list.
  const overdueInvoices = useQuery(['overdue-invoices'], () =>
    invoicesService.list({ status: 'overdue', per_page: 20 }).catch(() => ({ data: [] }))
  );
  const sendReminder = useMutation((id: string) => invoicesService.sendReminder(id, { channel: 'email' }));
  const markPaid = useMutation((id: string) => invoicesService.markPaid(id, { method: 'bank_transfer' }));
  const agingAction = async (label: string, fn: () => Promise<unknown>) => {
    try {
      await fn();
      push({ tone: 'success', title: label });
      await overdueInvoices.refetch();
    } catch (err) {
      push({ tone: 'error', title: t('adminNew.common.operationFailed'), message: getApiErrorMessage(err) });
    }
  };

  const onExport = async () => {
    setExporting(true);
    try {
      const blob = await kassaService.exportAnalytics({ period });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rapportage-${period}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      push({ tone: 'error', title: t('adminNew.common.operationFailed'), message: getApiErrorMessage(err) });
    } finally {
      setExporting(false);
    }
  };

  const data = report.data ?? {};
  const periodMeta = obj(data.period);
  const from = str(periodMeta.from);
  const to = str(periodMeta.to);
  const totals = obj(data.totals);
  const vat = arr(data.vat_breakdown);
  const byGroup = arr(data.revenue_by_group);
  const methods = arr(data.payment_methods);
  const margin = obj(data.margin);
  const marginByGroup = arr(margin.by_group);
  const storage = obj(data.storage);
  const occupancy = obj(data.occupancy);
  const customerAnalytics = obj(data.customer_analytics);
  const topCustomers = arr(customerAnalytics.top_customers_by_revenue);
  // Trello #85: top customers by open balance + overdue customers.
  const topByOpen = arr(customerAnalytics.top_customers_by_open_balance);
  const overdueCustomers = arr(customerAnalytics.overdue_customers);
  // Trello #85: storage avg duration + revenue by contract type.
  const avgDuration = n(storage.avg_duration_days);
  const byContractType = arr(storage.by_contract_type);
  // Trello #85: revenue over time (line for daily/weekly, bar for monthly).
  const revenueSeries = obj(data.revenue_time_series);
  const revenuePoints = arr(revenueSeries.points).map((p) => ({
    name: str(p.label ?? p.bucket) || '—',
    value: n(p.turnover_cents) / 100,
    count: n(p.invoice_count),
  }));
  const seriesIsMonthly = str(revenueSeries.granularity) === 'monthly';
  const forecast = obj(data.forecast);
  // Trello #86: per-product revenue breakdown (top / slow products).
  const products = obj(data.products);
  const topProducts = arr(products.top_products).length
    ? arr(products.top_products)
    : arr(products.by_product);
  const slowProducts = arr(products.slow_products);
  // Aging may arrive under a few keys depending on backend version.
  const aging = arr(data.invoice_aging).length ? arr(data.invoice_aging) : arr(data.aging);

  const groupDrillHref = (code: string) => {
    const params = new URLSearchParams();
    if (code) params.set('product_group', code);
    if (from) params.set('date_from', from);
    if (to) params.set('date_to', to);
    return `/${locale}/admin/facturen?${params.toString()}`;
  };

  const methodPie = methods.map((m, i) => ({
    name: methodLabel(str(m.method) || '—'),
    value: n(m.total) / 100,
    fill: PIE_COLORS[i % PIE_COLORS.length],
  }));
  // Trello #80/#86: use the product group's own colour for chart segments + swatches.
  const groupColor = (g: Rec, i: number) =>
    str(g.color ?? g.group_color ?? g.display_color) || PIE_COLORS[i % PIE_COLORS.length];
  const groupBars = byGroup
    .slice()
    .sort((a, b) => n(b.total_incl_vat) - n(a.total_incl_vat))
    .map((g, i) => ({
      name: str(g.group_name ?? g.group_code) || '—',
      value: n(g.total_incl_vat) / 100,
      fill: groupColor(g, i),
    }));
  const agingBars = aging.map((a) => ({
    name: str(a.label ?? a.range ?? a.bucket) || '—',
    value: n(a.amount_cents ?? a.total_cents ?? a.amount) / (a.amount != null ? 1 : 100),
  }));

  return (
    <>
      <AdminPageHeader
        title={t('adminNew.reports.title')}
        subtitle={t('adminNew.reports.subtitle')}
        rightSlot={
          <div className="flex flex-wrap items-center gap-2">
            <AdminSelect value={period} onChange={(v) => { setPeriod(v); setDateFrom(''); setDateTo(''); }}>
              {PRESETS.map((p) => (
                <option key={p} value={p}>
                  {t(`adminNew.reports.presets.${p}`)}
                </option>
              ))}
            </AdminSelect>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="input-base h-9 w-36 text-sm"
              aria-label="Van datum"
            />
            <span className="text-navy-400">–</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="input-base h-9 w-36 text-sm"
              aria-label="Tot datum"
            />
            <Link href={`/${locale}/admin/kassa/dagafsluiting`}>
              <Button variant="outline" size="sm" leftIcon={<Wallet className="h-4 w-4" />}>
                {t('adminNew.reports.cashClose')}
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Printer className="h-4 w-4" />}
              onClick={() => window.print()}
            >
              {t('adminNew.reports.print')}
            </Button>
            <Button
              variant="gold"
              size="sm"
              leftIcon={<Download className="h-4 w-4" />}
              disabled={exporting}
              onClick={() => void onExport()}
            >
              {t('adminNew.reports.export')}
            </Button>
          </div>
        }
        stats={[
          {
            label: t('adminNew.reports.totals.turnover'),
            value: money(totals.turnover_cents),
            icon: BarChart3,
            tone: 'marine',
            loading: report.loading,
          },
          {
            label: t('adminNew.reports.totals.received'),
            value: money(totals.received_cents),
            icon: CreditCard,
            tone: 'success',
            loading: report.loading,
          },
          {
            label: t('adminNew.reports.totals.open'),
            value: money(totals.open_cents),
            icon: Receipt,
            tone: n(totals.open_cents) > 0 ? 'warning' : 'navy',
            loading: report.loading,
          },
          {
            label: t('adminNew.reports.totals.margin'),
            value: margin.available ? money(margin.gross_margin_cents) : '—',
            icon: Wallet,
            tone: 'gold',
            loading: report.loading,
          },
        ]}
      />

      <AdminContent>
        {report.loading ? <LoadingState label={t('adminNew.common.loading')} /> : null}
        {report.error ? <ErrorState message={report.error} onRetry={() => void report.refetch()} /> : null}

        {!report.loading && !report.error ? (
          <>
            {/* Charts */}
            <div className="bento-grid lg:grid-cols-2">
              <AdminSectionCard title={t('adminNew.reports.groupTitle')} icon={Layers}>
                {groupBars.length ? (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={groupBars} layout="vertical" margin={{ left: 8, right: 16 }}>
                      <XAxis type="number" hide />
                      <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(v: number) => formatCurrency(v, dateLocale)} />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                        {groupBars.map((g, i) => (
                          <Cell key={i} fill={g.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-navy-500">{t('adminNew.reports.noData')}</p>
                )}
                {byGroup.length ? (
                  <div className="mt-3 space-y-1">
                    {byGroup.map((g, i) => (
                      <Link
                        key={i}
                        href={groupDrillHref(str(g.group_code ?? g.group_name))}
                        className="flex items-center justify-between rounded-md px-2 py-1 text-sm hover:bg-sand-50"
                      >
                        <span className="flex items-center gap-2 font-medium text-navy-800">
                          <span className="inline-block h-3 w-3 rounded-full" style={{ background: groupColor(g, i) }} />
                          {str(g.group_name ?? g.group_code) || '—'}
                        </span>
                        <span className="font-semibold text-marine-700">{money(g.total_incl_vat)} →</span>
                      </Link>
                    ))}
                  </div>
                ) : null}
              </AdminSectionCard>

              <AdminSectionCard title={t('adminNew.reports.methodsTitle')} icon={CreditCard}>
                {methodPie.length ? (
                  <div className="flex items-center gap-4">
                    <ResponsiveContainer width="55%" height={200}>
                      <PieChart>
                        <Pie data={methodPie} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80}>
                          {methodPie.map((entry, i) => (
                            <Cell key={i} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: number) => formatCurrency(v, dateLocale)} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex-1 space-y-1.5">
                      {methodPie.map((m, i) => (
                        <div key={i} className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2 capitalize text-navy-700">
                            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: m.fill }} />
                            {m.name}
                          </span>
                          <span className="font-semibold text-navy-900">
                            {formatCurrency(m.value, dateLocale)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-navy-500">{t('adminNew.reports.noData')}</p>
                )}
              </AdminSectionCard>
            </div>

            {/* Trello #85: revenue over time */}
            {revenuePoints.length ? (
              <AdminSectionCard title={t('adminNew.reports.revenueOverTimeTitle')} icon={BarChart3} className="mt-5">
                <ResponsiveContainer width="100%" height={260}>
                  {seriesIsMonthly ? (
                    <BarChart data={revenuePoints} margin={{ left: 8, right: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f6" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} width={70} tickFormatter={(v: number) => formatCurrency(v, dateLocale)} />
                      <Tooltip formatter={(v: number) => formatCurrency(v, dateLocale)} />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]} fill="#1f93b8" />
                    </BarChart>
                  ) : (
                    <LineChart data={revenuePoints} margin={{ left: 8, right: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f6" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} width={70} tickFormatter={(v: number) => formatCurrency(v, dateLocale)} />
                      <Tooltip formatter={(v: number) => formatCurrency(v, dateLocale)} />
                      <Line type="monotone" dataKey="value" stroke="#1f93b8" strokeWidth={2} dot={false} />
                    </LineChart>
                  )}
                </ResponsiveContainer>
              </AdminSectionCard>
            ) : null}

            {/* VAT + aging */}
            <div className="bento-grid mt-5 lg:grid-cols-2">
              <AdminSectionCard title={t('adminNew.reports.vatTitle')} icon={Receipt}>
                {vat.length ? (
                  <AdminTable minWidth={520}>
                    <AdminTableHead>
                      <tr>
                        <AdminTableHeaderCell>{t('adminNew.reports.vat.rate')}</AdminTableHeaderCell>
                        <AdminTableHeaderCell>Excl. BTW</AdminTableHeaderCell>
                        <AdminTableHeaderCell>BTW bedrag</AdminTableHeaderCell>
                        <AdminTableHeaderCell>{t('adminNew.reports.vat.total')}</AdminTableHeaderCell>
                        <AdminTableHeaderCell>{t('adminNew.reports.vat.outstanding')}</AdminTableHeaderCell>
                      </tr>
                    </AdminTableHead>
                    <tbody>
                      {vat.map((v, i) => {
                        const rate = n(v.vat_rate);
                        const inclCents = n(v.total_incl_vat);
                        const exclCents = n(v.total_excl_vat ?? (inclCents / (1 + rate / 100)));
                        const vatCents = n(v.vat_amount ?? (inclCents - exclCents));
                        return (
                          <AdminTableRow key={i}>
                            <AdminTableCell className="font-semibold">{rate}%</AdminTableCell>
                            <AdminTableCell className="tabular-nums">{money(exclCents)}</AdminTableCell>
                            <AdminTableCell className="tabular-nums text-navy-600">{money(vatCents)}</AdminTableCell>
                            <AdminTableCell className="tabular-nums">{money(inclCents)}</AdminTableCell>
                            <AdminTableCell className="tabular-nums text-amber-700">{money(v.outstanding_incl_vat)}</AdminTableCell>
                          </AdminTableRow>
                        );
                      })}
                    </tbody>
                  </AdminTable>
                ) : (
                  <p className="text-sm text-navy-500">{t('adminNew.reports.noData')}</p>
                )}
              </AdminSectionCard>

              <AdminSectionCard title={t('adminNew.reports.agingTitle')} icon={Receipt}>
                {agingBars.length ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={agingBars} margin={{ left: 8, right: 8 }}>
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis hide />
                      <Tooltip formatter={(v: number) => formatCurrency(v, dateLocale)} />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {agingBars.map((_, i) => (
                          <Cell key={i} fill={AGING_COLORS[Math.min(i, AGING_COLORS.length - 1)]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-navy-500">{t('adminNew.reports.noAging')}</p>
                )}
                {/* Trello #85: per-invoice aging actions (reminder / mark paid / open). */}
                {(overdueInvoices.data?.data ?? []).length ? (
                  <div className="mt-4 space-y-1.5 border-t border-navy-50 pt-3">
                    <p className="text-xs font-semibold uppercase tracking-widest text-navy-400">
                      {t('adminNew.reports.agingOverdueTitle')}
                    </p>
                    {(overdueInvoices.data?.data ?? []).slice(0, 10).map((inv) => (
                      <div key={inv.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-sand-50">
                        <span className="font-medium text-navy-800">{inv.invoice_number}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-amber-700">{money(inv.outstanding_cents ?? inv.total_amount_cents)}</span>
                          <Button size="sm" variant="ghost" disabled={sendReminder.loading} onClick={() => void agingAction(t('adminNew.reports.agingReminderSent'), () => sendReminder.mutate(inv.id))}>
                            {t('adminNew.reports.agingReminder')}
                          </Button>
                          <Button size="sm" variant="ghost" disabled={markPaid.loading} onClick={() => void agingAction(t('adminNew.reports.agingMarkedPaid'), () => markPaid.mutate(inv.id))}>
                            {t('adminNew.reports.agingMarkPaid')}
                          </Button>
                          <Link href={`/${locale}/admin/facturen/${inv.id}`} className="text-marine-700 hover:text-marine-900">
                            {t('adminNew.common.open')} →
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </AdminSectionCard>
            </div>

            {/* Storage + occupancy */}
            <div className="bento-grid mt-5 lg:grid-cols-2">
              <AdminSectionCard title={t('adminNew.reports.storageTitle')} icon={Ship}>
                <div className="grid grid-cols-2 gap-3">
                  <AdminStatusStrip
                    label={t('adminNew.reports.storage.activeContracts')}
                    value={String(n(storage.active_contracts))}
                    tone="marine"
                  />
                  <AdminStatusStrip
                    label={t('adminNew.reports.storage.boatsInStorage')}
                    value={String(n(storage.boats_in_storage))}
                    tone="navy"
                  />
                  <AdminStatusStrip
                    label={t('adminNew.reports.storage.expiring30')}
                    value={String(n(storage.expiring_30_days ?? storage.expiring_in_30_days))}
                    tone="gold"
                  />
                  <AdminStatusStrip
                    label={t('adminNew.reports.storage.expiring60', { defaultValue: 'Vervalt 60 dgn' })}
                    value={String(n(storage.expiring_60_days ?? storage.expiring_in_60_days))}
                    tone="warning"
                  />
                  <AdminStatusStrip
                    label={t('adminNew.reports.storage.expiring90', { defaultValue: 'Vervalt 90 dgn' })}
                    value={String(n(storage.expiring_90_days ?? storage.expiring_in_90_days))}
                    tone="danger"
                  />
                  <AdminStatusStrip
                    label={t('adminNew.reports.storage.openBalance')}
                    value={money(storage.open_balance_cents ?? storage.open_balance)}
                    tone="warning"
                  />
                  {avgDuration > 0 ? (
                    <AdminStatusStrip
                      label={t('adminNew.reports.storage.avgDuration')}
                      value={t('adminNew.reports.storage.days', { count: avgDuration })}
                      tone="marine"
                    />
                  ) : null}
                </div>
                {/* Trello #85: revenue by contract type */}
                {byContractType.length ? (
                  <div className="mt-3 space-y-1 border-t border-navy-50 pt-3">
                    <p className="text-xs font-semibold uppercase tracking-widest text-navy-400">
                      {t('adminNew.reports.storage.byContractType')}
                    </p>
                    {byContractType.map((ct, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span className="capitalize text-navy-700">{str(ct.type ?? ct.contract_type) || '—'} ({n(ct.count)})</span>
                        <span className="font-semibold text-navy-900">{money(ct.value_cents ?? ct.revenue_cents)}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </AdminSectionCard>

              <AdminSectionCard title={t('adminNew.reports.occupancyTitle')} icon={Ship}>
                {arr(occupancy.locations).length ? (
                  <div className="space-y-2">
                    {arr(occupancy.locations).map((loc, i) => {
                      const cap = n(loc.capacity);
                      const occ = n(loc.occupied_boats);
                      const pct = cap > 0 ? Math.round((occ / cap) * 100) : null;
                      return (
                        <div key={i}>
                          <div className="mb-1 flex items-center justify-between text-sm">
                            <span className="font-medium text-navy-800">{str(loc.location_code) || '—'}</span>
                            <span className="text-navy-600">
                              {occ}
                              {cap ? ` / ${cap}` : ''} {pct != null ? `· ${pct}%` : ''}
                            </span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-navy-100">
                            <div
                              className={`h-full rounded-full ${pct != null && pct > 95 ? 'bg-rose-500' : pct != null && pct > 80 ? 'bg-amber-400' : 'bg-marine-500'}`}
                              style={{ width: `${pct ?? Math.min(100, occ)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                    {occupancy.capacity_configured === false ? (
                      <p className="pt-1 text-xs text-navy-400">{t('adminNew.reports.occupancyNoCapacity')}</p>
                    ) : null}
                  </div>
                ) : (
                  <p className="text-sm text-navy-500">{t('adminNew.reports.noData')}</p>
                )}
              </AdminSectionCard>
            </div>

            {/* Customers + forecast */}
            <div className="bento-grid mt-5 lg:grid-cols-2">
              <AdminSectionCard title={t('adminNew.reports.customersTitle')} icon={Users}>
                {topCustomers.length ? (
                  <div className="space-y-1.5">
                    {topCustomers.slice(0, 10).map((c, i) => {
                      const custId = str(c.customer_id ?? c.id);
                      const custName = str(c.name ?? c.customer_name) || '—';
                      return (
                        <div key={i} className="flex items-center justify-between rounded-md px-2 py-1 text-sm">
                          {custId ? (
                            <Link href={`/${locale}/admin/klanten/${custId}`} className="text-navy-800 hover:text-marine-700 hover:underline">
                              {custName}
                            </Link>
                          ) : (
                            <span className="text-navy-800">{custName}</span>
                          )}
                          <span className="font-semibold text-navy-900">
                            {money(c.revenue_cents ?? c.total_incl_vat ?? c.revenue)}
                          </span>
                        </div>
                      );
                    })}
                    {customerAnalytics.concentration_pct != null ? (
                      <p className="pt-1 text-xs text-navy-400">
                        {t('adminNew.reports.concentration', {
                          pct: n(customerAnalytics.concentration_pct),
                        })}
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <p className="text-sm text-navy-500">{t('adminNew.reports.noData')}</p>
                )}
                {/* Trello #85: top customers by open balance + overdue customers */}
                {topByOpen.length ? (
                  <div className="mt-3 space-y-1 border-t border-navy-50 pt-3">
                    <p className="text-xs font-semibold uppercase tracking-widest text-navy-400">{t('adminNew.reports.customersByOpen')}</p>
                    {topByOpen.slice(0, 5).map((c, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span className="text-navy-800">{str(c.name ?? c.customer_name) || '—'}</span>
                        <span className="font-semibold text-amber-700">{money(c.open_balance_cents ?? c.open_cents ?? c.open_balance)}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
                {overdueCustomers.length ? (
                  <div className="mt-3 space-y-1 border-t border-navy-50 pt-3">
                    <p className="text-xs font-semibold uppercase tracking-widest text-navy-400">{t('adminNew.reports.customersOverdue')}</p>
                    {overdueCustomers.slice(0, 5).map((c, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span className="text-navy-800">{str(c.name ?? c.customer_name) || '—'}</span>
                        <span className="font-semibold text-rose-700">{money(c.overdue_cents ?? c.open_balance_cents ?? c.amount_cents)}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </AdminSectionCard>

              <AdminSectionCard title={t('adminNew.reports.forecastTitle')} icon={BarChart3}>
                <div className="space-y-3">
                  <AdminStatusStrip
                    label={t('adminNew.reports.forecastTotal', { days: n(forecast.horizon_days) || 90 })}
                    value={money(forecast.total_cents)}
                    tone="gold"
                  />
                  {[
                    { label: 'Open facturen pipeline', cents: forecast.open_invoice_pipeline_cents },
                    { label: 'Stalling verlengingen (90 dgn)', cents: forecast.expected_storage_renewals_90_days_cents },
                    { label: 'Geplande auto-facturen (30 dgn)', cents: forecast.scheduled_auto_invoice_30_days_cents },
                    { label: 'Actieve stallingcontracten', cents: forecast.active_storage_contract_value_cents },
                  ].filter((s) => n(s.cents) > 0).map((s, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="text-navy-600">{s.label}</span>
                      <span className="font-semibold text-navy-900">{money(s.cents)}</span>
                    </div>
                  ))}
                </div>
              </AdminSectionCard>

              {topProducts.length ? (
                <AdminSectionCard title={t('adminNew.reports.topProductsTitle')} icon={BarChart3}>
                  <div className="space-y-1.5">
                    {topProducts.slice(0, 10).map((p, i) => (
                      <div key={i} className="flex items-center justify-between rounded-md px-2 py-1 text-sm">
                        <span className="truncate text-navy-800">{str(p.product_name ?? p.name) || '—'}</span>
                        <span className="ml-3 shrink-0 font-semibold text-navy-900">
                          {money(p.revenue_incl_vat ?? p.revenue_cents)}
                        </span>
                      </div>
                    ))}
                  </div>
                </AdminSectionCard>
              ) : null}

              {slowProducts.length ? (
                <AdminSectionCard title={t('adminNew.reports.slowProductsTitle')} icon={BarChart3}>
                  <div className="space-y-1.5">
                    {slowProducts.slice(0, 10).map((p, i) => (
                      <div key={i} className="flex items-center justify-between rounded-md px-2 py-1 text-sm">
                        <span className="truncate text-navy-800">{str(p.product_name ?? p.name) || '—'}</span>
                        <span className="ml-3 shrink-0 font-semibold text-navy-900">
                          {money(p.revenue_incl_vat ?? p.revenue_cents)}
                        </span>
                      </div>
                    ))}
                  </div>
                </AdminSectionCard>
              ) : null}
            </div>

            {margin.available === false ? (
              <p className="mt-3 text-xs text-navy-400">
                {t('adminNew.reports.marginMissing', { count: n(margin.missing_cost_line_count) })}
              </p>
            ) : (
              <div className="mt-3 space-y-3">
                <Badge tone="success">
                  {t('adminNew.reports.marginValue', {
                    pct: n(margin.gross_margin_percent ?? margin.gross_margin_pct),
                  })}
                </Badge>
                {marginByGroup.length ? (
                  <AdminSectionCard title={t('adminNew.reports.marginByGroupTitle')} icon={Layers}>
                    <div className="space-y-1.5">
                      {marginByGroup.map((g, i) => (
                        <div key={i} className="flex flex-wrap items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm">
                          <span className="font-medium text-navy-800">{str(g.group_name ?? g.group_code) || '—'}</span>
                          <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm">
                            <span className="text-navy-500">
                              {t('adminNew.reports.marginRevenue')}: {money(n(g.revenue_cents ?? g.total_incl_vat))}
                            </span>
                            <span className="text-navy-500">
                              {t('adminNew.reports.marginCost')}: {money(n(g.cost_cents ?? g.purchase_cost_cents))}
                            </span>
                            <span className="font-semibold text-emerald-700">
                              {n(g.gross_margin_percent ?? g.gross_margin_pct).toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </AdminSectionCard>
                ) : null}
              </div>
            )}

            {/* Trello #88: work order statistics with a month selector */}
            <AdminSectionCard
              title={t('adminNew.reports.workOrders.title')}
              icon={BarChart3}
              className="mt-5"
              action={
                <input
                  type="month"
                  value={woMonth}
                  onChange={(e) => setWoMonth(e.target.value)}
                  className="input-base h-9 w-40 text-sm"
                  aria-label={t('adminNew.reports.workOrders.period')}
                />
              }
            >
              {(() => {
                const wo = obj(workOrderStats.data);
                return (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                    <AdminStatusStrip label={t('adminNew.reports.workOrders.open')} value={String(n(wo.open))} tone="marine" />
                    <AdminStatusStrip label={t('adminNew.reports.workOrders.overdue')} value={String(n(wo.overdue))} tone={n(wo.overdue) > 0 ? 'danger' : 'navy'} />
                    <AdminStatusStrip label={t('adminNew.reports.workOrders.completed')} value={String(n(wo.completed_this_period ?? wo.completed))} tone="success" />
                    <AdminStatusStrip label={t('adminNew.reports.workOrders.laborHours')} value={String(n(wo.labor_hours))} tone="gold" />
                    <AdminStatusStrip label={t('adminNew.reports.workOrders.materials')} value={money(wo.materials_revenue_cents)} tone="marine" />
                  </div>
                );
              })()}
            </AdminSectionCard>
          </>
        ) : null}
      </AdminContent>
    </>
  );
}
