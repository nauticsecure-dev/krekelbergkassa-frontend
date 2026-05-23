'use client';

import * as React from 'react';
import Link from 'next/link';
import { FilePlus2, Search } from 'lucide-react';
import { AdminPageHeader } from '@/components/admin/AdminShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { LoadingState, EmptyState, ErrorState } from '@/components/admin/DataState';
import { Pagination } from '@/components/admin/Pagination';
import { useMutation, useQuery } from '@/lib/hooks/useAsync';
import { stallingService } from '@/lib/services';
import { formatCurrency, formatDate } from '@/lib/format';
import { useIntl } from '@/i18n/IntlProvider';
import { useToast } from '@/components/ui/ToastProvider';

export default function StallingPage() {
  const { locale, t } = useIntl();
  const { push } = useToast();

  const [search, setSearch] = React.useState('');
  const [status, setStatus] = React.useState('');
  const [type, setType] = React.useState('');
  const [page, setPage] = React.useState(1);

  const contracts = useQuery([search, status, type, page], () =>
    stallingService.list({
      search: search || undefined,
      status: status || undefined,
      type: type || undefined,
      page,
      per_page: 25,
    })
  );

  const createInvoice = useMutation((id: string) => stallingService.generateInvoice(id));
  const cancelContract = useMutation((id: string) => stallingService.cancel(id, 'Cancelled by staff'));

  const execute = async (label: string, fn: () => Promise<unknown>) => {
    try {
      await fn();
      push({ tone: 'success', title: label });
      await contracts.refetch();
    } catch (err) {
      push({
        tone: 'error',
        title: t('adminNew.common.operationFailed'),
        message: err instanceof Error ? err.message : undefined,
      });
    }
  };

  return (
    <>
      <AdminPageHeader
        title={t('adminNew.stalling.title')}
        subtitle={t('adminNew.stalling.subtitle')}
      />

      <div className="space-y-4 px-4 py-6 sm:px-6">
        <Card className="p-4">
          <div className="grid gap-3 lg:grid-cols-[1fr_180px_180px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-400" />
              <input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder={t('adminNew.stalling.searchPlaceholder')}
                className="input-base pl-9"
              />
            </div>
            <select className="input-base" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
              <option value="">{t('adminNew.stalling.allStatuses')}</option>
              <option value="paid">{t('adminNew.status.paid')}</option>
              <option value="expiring">{t('adminNew.status.expiring')}</option>
              <option value="overdue">{t('adminNew.status.overdue')}</option>
              <option value="open">{t('adminNew.status.open')}</option>
              <option value="cancelled">{t('adminNew.status.cancelled')}</option>
            </select>
            <select className="input-base" value={type} onChange={(e) => { setType(e.target.value); setPage(1); }}>
              <option value="">{t('adminNew.stalling.allTypes')}</option>
              <option value="winter">{t('adminNew.stalling.type.winter')}</option>
              <option value="summer">{t('adminNew.stalling.type.summer')}</option>
              <option value="year">{t('adminNew.stalling.type.year')}</option>
              <option value="week">{t('adminNew.stalling.type.week')}</option>
            </select>
          </div>
        </Card>

        <Card className="overflow-hidden">
          {contracts.loading ? <LoadingState label={t('adminNew.stalling.loading')} variant="table" /> : null}
          {!contracts.loading && contracts.error ? <ErrorState message={contracts.error} onRetry={() => void contracts.refetch()} /> : null}
          {!contracts.loading && !contracts.error && contracts.data?.data.length === 0 ? (
            <EmptyState title={t('adminNew.stalling.emptyTitle')} message={t('adminNew.stalling.emptyMessage')} />
          ) : null}

          {!contracts.loading && !contracts.error && (contracts.data?.data.length ?? 0) > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1100px] text-sm">
                  <thead className="bg-sand-50 text-left text-xs uppercase tracking-wide text-navy-500">
                    <tr>
                      <th className="px-4 py-3">{t('adminNew.stalling.columns.boat')}</th>
                      <th className="px-4 py-3">{t('adminNew.stalling.columns.customer')}</th>
                      <th className="px-4 py-3">{t('adminNew.stalling.columns.period')}</th>
                      <th className="px-4 py-3">{t('adminNew.stalling.columns.type')}</th>
                      <th className="px-4 py-3">{t('adminNew.stalling.columns.paidUntil')}</th>
                      <th className="px-4 py-3">{t('adminNew.stalling.columns.openBalance')}</th>
                      <th className="px-4 py-3">{t('adminNew.stalling.columns.status')}</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-navy-100">
                    {contracts.data?.data.map((contract) => (
                      <tr key={contract.id} className="hover:bg-sand-50">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-navy-900">{contract.boat?.name ?? '-'}</div>
                          <div className="text-xs text-navy-500">{contract.boat?.length_cm ? `${contract.boat.length_cm} cm` : '-'}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-navy-900">{contract.customer?.name ?? '-'}</div>
                          {contract.customer?.id ? (
                            <Link href={`/${locale}/admin/klanten/${contract.customer.id}`} className="text-xs text-marine-700 hover:underline">
                              {t('adminNew.stalling.openCustomer')}
                            </Link>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {formatDate(contract.start_date)} - {formatDate(contract.end_date)}
                        </td>
                        <td className="px-4 py-3 capitalize">{contract.type}</td>
                        <td className="px-4 py-3">{formatDate(contract.paid_until)}</td>
                        <td className="px-4 py-3 font-semibold text-navy-900">
                          {formatCurrency(contract.open_balance_cents / 100, locale === 'en' ? 'en-GB' : 'nl-NL')}
                        </td>
                        <td className="px-4 py-3">
                          <Status status={contract.payment_status} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              leftIcon={<FilePlus2 className="h-3.5 w-3.5" />}
                              onClick={() => void execute(t('adminNew.stalling.invoiceCreated'), () => createInvoice.mutate(contract.id))}
                            >
                              {t('adminNew.stalling.invoice')}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => void execute(t('adminNew.stalling.cancelled'), () => cancelContract.mutate(contract.id))}
                            >
                              {t('adminNew.stalling.cancel')}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between border-t border-navy-100 bg-sand-50/50 px-4 py-3 text-xs text-navy-500">
                <span>{t('adminNew.stalling.contracts', { count: contracts.data?.meta?.total ?? contracts.data?.data.length ?? 0 })}</span>
                <Pagination meta={contracts.data?.meta} onChange={setPage} />
              </div>
            </>
          ) : null}
        </Card>
      </div>
    </>
  );
}

function Status({ status }: { status: string }) {
  const { t } = useIntl();
  const normalized = status.toLowerCase();
  if (normalized.includes('paid')) return <Badge tone="success" dot>{t('adminNew.status.paid')}</Badge>;
  if (normalized.includes('expir')) return <Badge tone="warning" dot>{t('adminNew.status.expiring')}</Badge>;
  if (normalized.includes('overdue')) return <Badge tone="danger" dot>{t('adminNew.status.overdue')}</Badge>;
  if (normalized.includes('cancel')) return <Badge tone="sand" dot>{t('adminNew.status.cancelled')}</Badge>;
  return <Badge tone="navy" dot>{t('adminNew.status.open')}</Badge>;
}
