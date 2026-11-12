"use client";

import * as React from "react";
import Link from "next/link";
import { Receipt } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminShell";
import { AdminContent } from "@/components/admin/AdminUi";
import { LoadingState } from "@/components/admin/DataState";
import { KassaAnalyticsDashboard } from "@/components/admin/KassaAnalyticsDashboard";
import { TranslatedText } from "@/components/cms/TranslatedText";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/ToastProvider";
import { useIntl } from "@/i18n/IntlProvider";
import { tEnum } from "@/i18n/admin-enums";
import { getApiErrorMessage } from "@/lib/api-error";
import { formatCurrency, intlLocale } from "@/lib/format";
import { useMutation, useQuery } from "@/lib/hooks/useAsync";
import { normalizeKassaAnalytics } from "@/lib/kassa-analytics";
import { usePermission } from "@/lib/permissions";
import { kassaService } from "@/lib/services";

export default function KassaAnalyticsPage() {
  const { t, locale } = useIntl();
  const localeTag = intlLocale(locale);
  const { can } = usePermission();
  const canRefund = can("kassa.refund");
  const { push } = useToast();
  const [analyticsPeriod, setAnalyticsPeriod] = React.useState("today");
  const recentSales = useQuery(["kassa-recent"], () =>
    kassaService.recentSales({}).catch(() => ({ data: [] as import('@/lib/api-types').Sale[], emptyMessage: '' })),
  );
  const todayQuery = useQuery(["kassa-today", analyticsPeriod], async () => {
    const [analyticsRaw, salesResult] = await Promise.all([
      kassaService.analytics({ period: analyticsPeriod }).catch(() => null),
      kassaService.recentSales({ period: analyticsPeriod === "today" ? "today" : undefined }).catch(() => ({ data: [] as import('@/lib/api-types').Sale[], emptyMessage: '' })),
    ]);
    const view = normalizeKassaAnalytics(
      analyticsRaw as Record<string, unknown> | null,
      salesResult.data,
      localeTag,
    );
    return view;
  });
  const refundSaleMutation = useMutation(
    ({ id, reason, method }: { id: string; reason: string; method: 'original' | 'pin' | 'cash' | 'manual' }) =>
      kassaService.refund(id, { reason, refund_method: method })
  );

  const [refundSaleId, setRefundSaleId] = React.useState<string | null>(null);
  const [refundReason, setRefundReason] = React.useState('');
  const [refundMethod, setRefundMethod] = React.useState<'original' | 'pin' | 'cash' | 'manual'>('original');

  return (
    <>
      <AdminPageHeader title={t("adminNew.kassa.analytics.title")} />
      <AdminContent className="space-y-4">
        <Link href={'/' + locale + '/admin/kassa'} className="font-semibold text-marine-700">
          <TranslatedText textKey={"adminNew.kassa.title"} />
        </Link>
          <KassaAnalyticsDashboard
            analytics={todayQuery.data ?? null}
            loading={todayQuery.loading}
            period={analyticsPeriod}
            onPeriodChange={setAnalyticsPeriod}
          />
          {/* Recent sales list */}
          <div className="rounded-2xl border border-navy-100/70 bg-white p-4 shadow-card">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-navy-900">
                <Receipt className="h-4 w-4 text-marine-600" />
                {<TranslatedText textKey={"adminNew.kassa.recentSales"} />}
              </h3>
              <Link
                href={`/${locale}/admin/verkopen`}
                className="text-xs font-semibold text-marine-700 hover:text-marine-900"
              >
                {<TranslatedText textKey={"adminNew.kassa.viewAllSales"} />}
              </Link>
            </div>
            {recentSales.loading ? (
              <LoadingState label={t("adminNew.common.loading")} variant="list" />
            ) : !recentSales.data?.data?.length ? (
              <p className="text-sm text-navy-500">
                {recentSales.data?.emptyMessage || t("adminNew.kassa.noRecentSales")}
              </p>
            ) : (
              <ul className="divide-y divide-navy-50">
                {(recentSales.data.data).slice(0, 5).map((sale, i) => {
                  const euros =
                    Number(
                      sale.total_euros ??
                        sale.total_amount_euros ??
                        Number(sale.total_amount_cents ?? 0) / 100,
                    ) || 0;
                  const href =
                    sale.invoice_url ??
                    sale.admin_url ??
                    (sale.invoice_id
                      ? `/${locale}/admin/facturen/${sale.invoice_id}`
                      : undefined);
                  const saleKey = sale.id ?? sale.invoice_id ?? String((sale as { sale_id?: string }).sale_id ?? i);
                  return (
                    <li key={saleKey} className="space-y-0.5">
                      <div className="flex items-center justify-between py-1 text-sm">
                        {href ? (
                          <Link
                            href={href}
                            className="font-medium text-navy-800 hover:text-marine-700"
                          >
                            {sale.invoice_number ?? sale.customer_name ?? "—"}
                          </Link>
                        ) : (
                          <span className="font-medium text-navy-800">
                            {sale.invoice_number ?? "—"}
                          </span>
                        )}
                        <div className="flex items-center gap-2">
                          <span className="font-semibold tabular-nums text-navy-900">
                            {formatCurrency(euros, localeTag)}
                          </span>
                          {sale.id ? (
                            <button disabled={!canRefund}
                              type="button"
                              onClick={() => {
                                setRefundSaleId(sale.id);
                                setRefundReason('');
                                setRefundMethod('original');
                              }}
                              className="rounded px-1.5 py-0.5 text-xs font-medium text-red-600 hover:bg-red-50"
                            >
                              {<TranslatedText textKey={"adminNew.kassa.refund"} />}
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
      </AdminContent>
      <Modal open={canRefund && !!refundSaleId} onClose={() => setRefundSaleId(null)} size="sm">
        <form
          className="p-6"
          onSubmit={(e) => {
            e.preventDefault();
            if (!canRefund || !refundSaleId) return;
            void (async () => {
              try {
                await refundSaleMutation.mutate({ id: refundSaleId, reason: refundReason, method: refundMethod });
                push({ tone: 'success', title: t('adminNew.kassa.refundSuccess') });
                setRefundSaleId(null);
                void recentSales.refetch();
              } catch (err) {
                push({ tone: 'error', title: getApiErrorMessage(err) ?? t('adminNew.common.operationFailed') });
              }
            })();
          }}
        >
          <h2 className="text-lg font-semibold text-navy-900">{<TranslatedText textKey={'adminNew.kassa.refundTitle'} />}</h2>
          <p className="mt-1 text-sm text-navy-500">{<TranslatedText textKey={'adminNew.kassa.refundSubtitle'} />}</p>
          <div className="mt-4 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-navy-800">
                {<TranslatedText textKey={'adminNew.kassa.refundMethod'} />}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['original', 'pin', 'cash', 'manual'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setRefundMethod(m)}
                    className={
                      'rounded-lg border px-3 py-2 text-sm font-medium transition ' +
                      (refundMethod === m
                        ? 'border-marine-500 bg-marine-50 text-marine-800'
                        : 'border-navy-200 bg-white text-navy-700 hover:bg-sand-50')
                    }
                  >
                    {m === 'original' ? t('adminNew.kassa.pos.originalPayment') : tEnum(t, 'adminNew.invoiceDetail.paymentMethods', m)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-navy-800">
                {<TranslatedText textKey={'adminNew.kassa.refundReason'} />}
              </label>
              <textarea
                className="input-base min-h-24"
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder={t('adminNew.kassa.refundReasonPlaceholder')}
                required
              />
            </div>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button disabled={!canRefund} type="button" variant="ghost" onClick={() => setRefundSaleId(null)}>
              {<TranslatedText textKey={'adminNew.common.cancel'} />}
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={refundSaleMutation.loading || !refundReason.trim()}
            >
              {<TranslatedText textKey={'adminNew.kassa.refundConfirm'} />}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
