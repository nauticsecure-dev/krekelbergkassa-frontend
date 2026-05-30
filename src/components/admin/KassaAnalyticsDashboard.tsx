'use client';

import * as React from 'react';
import {
  BarChart3,
  CreditCard,
  Receipt,
  RotateCcw,
  TrendingUp,
} from 'lucide-react';
import {
  AdminMetric,
  AdminMetricGrid,
  AdminFilterPill,
  AdminSectionCard,
} from '@/components/admin/AdminUi';
import { LoadingState } from '@/components/admin/DataState';
import { useIntl } from '@/i18n/IntlProvider';
import { centsToEuro, formatCurrency } from '@/lib/format';
import type { KassaAnalyticsView } from '@/lib/kassa-analytics';
import { cn } from '@/lib/cn';

const PERIODS = ['today', '7d', '30d', 'month'] as const;

export function KassaAnalyticsDashboard({
  analytics,
  loading,
  period,
  onPeriodChange,
}: {
  analytics: KassaAnalyticsView | null;
  loading?: boolean;
  period: string;
  onPeriodChange: (period: string) => void;
}) {
  const { locale, t } = useIntl();
  const dateLocale = locale === 'en' ? 'en-GB' : locale === 'de' ? 'de-DE' : 'nl-NL';
  const totals = analytics?.totals;
  const series = analytics?.series ?? [];
  const methods = analytics?.byPaymentMethod ?? [];
  const maxSeries = Math.max(...series.map((p) => p.value_cents), 1);
  const maxMethod = Math.max(...methods.map((m) => m.amount_cents), 1);

  return (
    <AdminSectionCard
      title={t('adminNew.kassa.analytics.title')}
      description={t('adminNew.kassa.analytics.subtitle')}
      icon={BarChart3}
    >
      {loading && !analytics ? (
        <LoadingState label={t('adminNew.common.loading')} variant="cards" />
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap gap-2">
            {PERIODS.map((p) => (
              <AdminFilterPill
                key={p}
                active={period === p}
                onClick={() => onPeriodChange(p)}
              >
                {t(`adminNew.kassa.analytics.periods.${p}`)}
              </AdminFilterPill>
            ))}
          </div>

          <AdminMetricGrid>
            <AdminMetric
              label={t('adminNew.kassa.analytics.turnover')}
              value={formatCurrency(centsToEuro(totals?.turnover_cents ?? 0), dateLocale)}
              icon={TrendingUp}
              tone="gold"
              loading={loading}
            />
            <AdminMetric
              label={t('adminNew.kassa.analytics.transactions')}
              value={totals?.transaction_count ?? 0}
              icon={Receipt}
              tone="marine"
              loading={loading}
            />
            <AdminMetric
              label={t('adminNew.kassa.analytics.avgTicket')}
              value={formatCurrency(centsToEuro(totals?.avg_ticket_cents ?? 0), dateLocale)}
              icon={CreditCard}
              tone="success"
              loading={loading}
            />
            <AdminMetric
              label={t('adminNew.kassa.analytics.refunds')}
              value={totals?.refund_count ?? 0}
              icon={RotateCcw}
              tone="danger"
              loading={loading}
            />
          </AdminMetricGrid>

          <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
            <div className="rounded-xl border border-navy-100 bg-gradient-to-b from-white to-sand-50/50 p-4">
              <div className="mb-4 flex items-center justify-between">
                <h4 className="text-sm font-semibold text-navy-900">
                  {t('adminNew.kassa.analytics.revenueChart')}
                </h4>
                {analytics?.periodLabel ? (
                  <span className="text-xs text-navy-500">{analytics.periodLabel}</span>
                ) : null}
              </div>
              {series.length === 0 ? (
                <p className="py-10 text-center text-sm text-navy-500">
                  {t('adminNew.kassa.analytics.noChartData')}
                </p>
              ) : (
                <div className="flex h-44 items-end gap-2 border-b border-navy-100 pb-2">
                  {series.map((point) => {
                    const height = Math.max(8, Math.round((point.value_cents / maxSeries) * 100));
                    return (
                      <div key={point.label} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                        <div className="relative flex h-36 w-full items-end justify-center">
                          <div
                            className={cn(
                              'w-full max-w-10 rounded-t-md bg-gradient-to-t from-marine-600 to-marine-400 transition-all',
                              'hover:from-gold-500 hover:to-gold-300'
                            )}
                            style={{ height: `${height}%` }}
                            title={formatCurrency(centsToEuro(point.value_cents), dateLocale)}
                          />
                        </div>
                        <span className="truncate text-[10px] font-medium text-navy-500">{point.label}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-navy-100 bg-white p-4">
              <h4 className="mb-4 text-sm font-semibold text-navy-900">
                {t('adminNew.kassa.analytics.paymentMethods')}
              </h4>
              {methods.length === 0 ? (
                <p className="py-6 text-sm text-navy-500">{t('adminNew.kassa.analytics.noPaymentData')}</p>
              ) : (
                <div className="space-y-3">
                  {methods.map((slice) => {
                    const pct = Math.round((slice.amount_cents / maxMethod) * 100);
                    return (
                      <div key={slice.method}>
                        <div className="mb-1 flex items-center justify-between text-xs">
                          <span className="font-semibold uppercase tracking-wide text-navy-700">
                            {slice.method}
                          </span>
                          <span className="text-navy-500">
                            {formatCurrency(centsToEuro(slice.amount_cents), dateLocale)} · {slice.count}
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-sand-100">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-navy-600 to-marine-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminSectionCard>
  );
}
