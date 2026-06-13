'use client';

import * as React from 'react';
import Link from 'next/link';
import { Banknote, BookOpen, Building2, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { AdminPageHeader } from '@/components/admin/AdminShell';
import {
  AdminContent,
  AdminSectionCard,
  AdminTable,
  AdminTableCard,
  AdminTableCell,
  AdminTableHead,
  AdminTableHeaderCell,
  AdminTableRow,
} from '@/components/admin/AdminUi';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState, ErrorState, LoadingState } from '@/components/admin/DataState';
import { useMutation, useQuery } from '@/lib/hooks/useAsync';
import { accountingService, supplierPayablesService } from '@/lib/services';
import { useToast } from '@/components/ui/ToastProvider';
import { getApiErrorMessage } from '@/lib/api-error';
import { useIntl } from '@/i18n/IntlProvider';
import { formatCurrency, formatDate } from '@/lib/format';

type Rec = Record<string, unknown>;
const str = (r: Rec, ...keys: string[]): string => {
  for (const k of keys) {
    const v = r[k];
    if (typeof v === 'string' && v.trim()) return v;
    if (typeof v === 'number') return String(v);
  }
  return '';
};
const num = (r: Rec, ...keys: string[]): number => {
  for (const k of keys) {
    const v = r[k];
    if (typeof v === 'number') return v;
    if (typeof v === 'string' && v.trim() && !Number.isNaN(Number(v))) return Number(v);
  }
  return 0;
};

export default function AccountingPage() {
  const { locale, t } = useIntl();
  const { push } = useToast();
  const dateLocale = locale === 'en' ? 'en-GB' : locale === 'de' ? 'de-DE' : 'nl-NL';
  const [payStatus, setPayStatus] = React.useState('');

  const dash = useQuery(['accounting-dash'], () => accountingService.dashboard());
  const payables = useQuery(['payables', payStatus], () =>
    supplierPayablesService.list({ status: payStatus || undefined, per_page: 50 })
  );
  const markPaid = useMutation((id: string) => supplierPayablesService.markPaid(id));

  const d = (dash.data ?? {}) as Rec;
  const summary = ((d.summary ?? d) as Rec);
  const payRows = (payables.data?.data ?? []) as Rec[];

  const money = (cents: number) => formatCurrency(cents / 100, dateLocale);

  const onMarkPaid = async (id: string) => {
    try {
      await markPaid.mutate(id);
      push({ tone: 'success', title: t('adminNew.accounting.toasts.markedPaid') });
      await payables.refetch();
    } catch (err) {
      push({ tone: 'error', title: t('adminNew.common.operationFailed'), message: getApiErrorMessage(err) });
    }
  };

  return (
    <>
      <AdminPageHeader
        title={t('adminNew.accounting.title')}
        subtitle={t('adminNew.accounting.subtitle')}
        rightSlot={
          <Link href={`/${locale}/admin/leveranciers`}>
            <Button variant="outline" size="sm" leftIcon={<Building2 className="h-4 w-4" />}>
              {t('adminNew.suppliers.title')}
            </Button>
          </Link>
        }
        stats={[
          {
            label: t('adminNew.accounting.stats.revenue'),
            value: money(num(summary, 'revenue_cents', 'total_revenue_cents', 'revenue')),
            icon: TrendingUp,
            tone: 'success',
            loading: dash.loading,
          },
          {
            label: t('adminNew.accounting.stats.expenses'),
            value: money(num(summary, 'expenses_cents', 'total_expenses_cents', 'expenses')),
            icon: TrendingDown,
            tone: 'danger',
            loading: dash.loading,
          },
          {
            label: t('adminNew.accounting.stats.outstandingPayables'),
            value: money(num(summary, 'outstanding_payables_cents', 'payables_cents', 'outstanding_cents')),
            icon: Wallet,
            tone: 'warning',
            loading: dash.loading,
          },
          {
            label: t('adminNew.accounting.stats.vat'),
            value: money(num(summary, 'vat_cents', 'vat_payable_cents', 'btw_cents')),
            icon: Banknote,
            tone: 'navy',
            loading: dash.loading,
          },
        ]}
      />
      <AdminContent>
        {dash.error ? <ErrorState message={dash.error} onRetry={() => void dash.refetch()} /> : null}

        <AdminSectionCard title={t('adminNew.accounting.payablesTitle')} description={t('adminNew.accounting.payablesSubtitle')} icon={Building2}>
          <div className="mb-4 flex gap-2">
            {['', 'open', 'paid', 'overdue'].map((s) => (
              <button
                key={s || 'all'}
                type="button"
                onClick={() => setPayStatus(s)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${payStatus === s ? 'bg-navy-900 text-white' : 'bg-navy-50 text-navy-600 hover:bg-navy-100'}`}
              >
                {s ? t(`adminNew.status.${s}`) : t('adminNew.common.all')}
              </button>
            ))}
          </div>
          <AdminTableCard>
            {payables.loading ? (
              <LoadingState label={t('adminNew.common.loading')} variant="table" />
            ) : payables.error ? (
              <ErrorState message={payables.error} onRetry={() => void payables.refetch()} />
            ) : payRows.length === 0 ? (
              <EmptyState title={t('adminNew.accounting.payablesEmptyTitle')} message={t('adminNew.accounting.payablesEmptyMessage')} />
            ) : (
              <AdminTable minWidth={860}>
                <AdminTableHead>
                  <tr>
                    <AdminTableHeaderCell>{t('adminNew.accounting.payColumns.supplier')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{t('adminNew.accounting.payColumns.reference')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{t('adminNew.accounting.payColumns.due')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{t('adminNew.accounting.payColumns.amount')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{t('adminNew.accounting.payColumns.status')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell className="text-right">&nbsp;</AdminTableHeaderCell>
                  </tr>
                </AdminTableHead>
                <tbody>
                  {payRows.map((row, i) => {
                    const id = str(row, 'id');
                    const st = str(row, 'status') || 'open';
                    const paid = /paid/i.test(st);
                    return (
                      <AdminTableRow key={id || i}>
                        <AdminTableCell className="font-medium text-navy-900">
                          {str(row, 'supplier_name') || str((row.supplier as Rec) ?? {}, 'name') || '—'}
                        </AdminTableCell>
                        <AdminTableCell className="text-sm text-navy-600">{str(row, 'reference', 'invoice_number', 'document_number') || '—'}</AdminTableCell>
                        <AdminTableCell className="whitespace-nowrap text-sm">{str(row, 'due_date') ? formatDate(str(row, 'due_date'), dateLocale) : '—'}</AdminTableCell>
                        <AdminTableCell className="font-semibold text-navy-900">{money(num(row, 'amount_cents', 'total_cents', 'amount'))}</AdminTableCell>
                        <AdminTableCell>
                          <Badge tone={paid ? 'success' : /overdue/i.test(st) ? 'danger' : 'gold'}>{st}</Badge>
                        </AdminTableCell>
                        <AdminTableCell>
                          <div className="flex justify-end">
                            {!paid ? (
                              <Button variant="outline" size="sm" disabled={markPaid.loading} onClick={() => void onMarkPaid(id)}>
                                {t('adminNew.accounting.markPaid')}
                              </Button>
                            ) : null}
                          </div>
                        </AdminTableCell>
                      </AdminTableRow>
                    );
                  })}
                </tbody>
              </AdminTable>
            )}
          </AdminTableCard>
        </AdminSectionCard>

        <AdminSectionCard title={t('adminNew.accounting.ledgerTitle')} description={t('adminNew.accounting.ledgerSubtitle')} icon={BookOpen} className="mt-5">
          {dash.loading ? (
            <LoadingState label={t('adminNew.common.loading')} variant="table" />
          ) : (
            <LedgerBreakdown data={d} money={money} t={t} />
          )}
        </AdminSectionCard>
      </AdminContent>
    </>
  );
}

function LedgerBreakdown({
  data,
  money,
  t,
}: {
  data: Rec;
  money: (c: number) => string;
  t: (k: string) => string;
}) {
  const rows = ((data.ledger_accounts ?? data.accounts ?? data.breakdown ?? []) as Rec[]) ?? [];
  if (!Array.isArray(rows) || rows.length === 0) {
    return <p className="text-sm text-navy-500">{t('adminNew.accounting.ledgerEmpty')}</p>;
  }
  const num = (r: Rec, ...keys: string[]) => {
    for (const k of keys) {
      const v = r[k];
      if (typeof v === 'number') return v;
      if (typeof v === 'string' && v.trim() && !Number.isNaN(Number(v))) return Number(v);
    }
    return 0;
  };
  return (
    <ul className="divide-y divide-navy-100 rounded-xl border border-navy-100/70">
      {rows.map((r, i) => (
        <li key={i} className="flex items-center justify-between px-4 py-2.5 text-sm">
          <span className="text-navy-800">
            {String(r.code ?? r.account_code ?? '')} {String(r.name ?? r.account_name ?? r.label ?? '')}
          </span>
          <span className="font-semibold text-navy-900">{money(num(r, 'total_cents', 'amount_cents', 'balance_cents', 'amount'))}</span>
        </li>
      ))}
    </ul>
  );
}
