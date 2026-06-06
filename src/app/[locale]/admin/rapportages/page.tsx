'use client';

import * as React from 'react';
import Link from 'next/link';
import { BarChart3, CreditCard, Download, Layers, Receipt, Wallet } from 'lucide-react';
import { AdminPageHeader } from '@/components/admin/AdminShell';
import {
  AdminContent,
  AdminSectionCard,
  AdminSelect,
  AdminTable,
  AdminTableCell,
  AdminTableHead,
  AdminTableHeaderCell,
  AdminTableRow,
} from '@/components/admin/AdminUi';
import { Button } from '@/components/ui/Button';
import { LoadingState, ErrorState } from '@/components/admin/DataState';
import { kassaService } from '@/lib/services';
import { useQuery } from '@/lib/hooks/useAsync';
import { formatCurrency } from '@/lib/format';
import { useIntl } from '@/i18n/IntlProvider';
import { useToast } from '@/components/ui/ToastProvider';
import { getApiErrorMessage } from '@/lib/api-error';

const PRESETS = ['today', 'yesterday', 'last_7_days', 'last_30_days', 'this_month', 'previous_month', 'this_year'];

type Rec = Record<string, unknown>;
const obj = (v: unknown): Rec => (v && typeof v === 'object' ? (v as Rec) : {});
const arr = (v: unknown): Rec[] => (Array.isArray(v) ? (v as Rec[]) : []);
const n = (v: unknown): number => (typeof v === 'number' ? v : Number(v) || 0);

export default function ReportsPage() {
  const { locale, t } = useIntl();
  const { push } = useToast();
  const dateLocale = locale === 'en' ? 'en-GB' : locale === 'de' ? 'de-DE' : 'nl-NL';
  const [period, setPeriod] = React.useState('this_month');
  const [exporting, setExporting] = React.useState(false);

  const report = useQuery([period], () => kassaService.analytics({ period }));
  const money = (cents: unknown) => formatCurrency(n(cents) / 100, dateLocale);

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
  const totals = obj(data.totals);
  const vat = arr(data.vat_breakdown);
  const byGroup = arr(data.revenue_by_group);
  const methods = arr(data.payment_methods);
  const margin = obj(data.margin);

  return (
    <>
      <AdminPageHeader
        title={t('adminNew.reports.title')}
        subtitle={t('adminNew.reports.subtitle')}
        rightSlot={
          <div className="flex flex-wrap items-center gap-2">
            <AdminSelect value={period} onChange={setPeriod}>
              {PRESETS.map((p) => (
                <option key={p} value={p}>
                  {t(`adminNew.reports.presets.${p}`)}
                </option>
              ))}
            </AdminSelect>
            <Link href={`/${locale}/admin/kassa/dagafsluiting`}>
              <Button variant="outline" size="sm" leftIcon={<Wallet className="h-4 w-4" />}>
                {t('adminNew.reports.cashClose')}
              </Button>
            </Link>
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
            <div className="bento-grid lg:grid-cols-2">
              <AdminSectionCard title={t('adminNew.reports.vatTitle')} icon={Receipt}>
                {vat.length ? (
                  <AdminTable minWidth={420}>
                    <AdminTableHead>
                      <tr>
                        <AdminTableHeaderCell>{t('adminNew.reports.vat.rate')}</AdminTableHeaderCell>
                        <AdminTableHeaderCell>{t('adminNew.reports.vat.total')}</AdminTableHeaderCell>
                        <AdminTableHeaderCell>{t('adminNew.reports.vat.paid')}</AdminTableHeaderCell>
                        <AdminTableHeaderCell>{t('adminNew.reports.vat.outstanding')}</AdminTableHeaderCell>
                      </tr>
                    </AdminTableHead>
                    <tbody>
                      {vat.map((v, i) => (
                        <AdminTableRow key={i}>
                          <AdminTableCell className="font-semibold">{n(v.vat_rate)}%</AdminTableCell>
                          <AdminTableCell>{money(v.total_incl_vat)}</AdminTableCell>
                          <AdminTableCell className="text-emerald-700">{money(v.paid_incl_vat)}</AdminTableCell>
                          <AdminTableCell className="text-amber-700">{money(v.outstanding_incl_vat)}</AdminTableCell>
                        </AdminTableRow>
                      ))}
                    </tbody>
                  </AdminTable>
                ) : (
                  <p className="text-sm text-navy-500">{t('adminNew.reports.noData')}</p>
                )}
              </AdminSectionCard>

              <AdminSectionCard title={t('adminNew.reports.methodsTitle')} icon={CreditCard}>
                {methods.length ? (
                  <div className="space-y-2">
                    {methods.map((m, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between rounded-lg border border-navy-100 px-3 py-2 text-sm"
                      >
                        <span className="font-medium capitalize text-navy-800">{String(m.method ?? '—')}</span>
                        <span className="flex items-center gap-3">
                          <span className="text-xs text-navy-400">{n(m.count)}×</span>
                          <span className="font-semibold text-navy-900">{money(m.total)}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-navy-500">{t('adminNew.reports.noData')}</p>
                )}
              </AdminSectionCard>
            </div>

            <AdminSectionCard title={t('adminNew.reports.groupTitle')} icon={Layers} className="mt-5">
              {byGroup.length ? (
                <div className="space-y-2">
                  {byGroup
                    .slice()
                    .sort((a, b) => n(b.total_incl_vat) - n(a.total_incl_vat))
                    .map((g, i) => {
                      const max = Math.max(...byGroup.map((x) => n(x.total_incl_vat)), 1);
                      const pct = Math.round((n(g.total_incl_vat) / max) * 100);
                      return (
                        <div key={i}>
                          <div className="mb-1 flex items-center justify-between text-sm">
                            <span className="font-medium text-navy-800">
                              {String(g.group_name ?? g.group_code ?? '—')}
                            </span>
                            <span className="font-semibold text-navy-900">{money(g.total_incl_vat)}</span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-navy-100">
                            <div className="h-full rounded-full bg-marine-500" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <p className="text-sm text-navy-500">{t('adminNew.reports.noData')}</p>
              )}
            </AdminSectionCard>

            {margin.available === false ? (
              <p className="mt-3 text-xs text-navy-400">
                {t('adminNew.reports.marginMissing', {
                  count: n(margin.missing_cost_line_count),
                })}
              </p>
            ) : null}
          </>
        ) : null}
      </AdminContent>
    </>
  );
}
