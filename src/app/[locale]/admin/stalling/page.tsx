'use client';

import * as React from 'react';
import Link from 'next/link';
import { FilePlus2, Ship, Warehouse } from 'lucide-react';
import { AdminPageHeader } from '@/components/admin/AdminShell';
import {
  AdminContent,
  AdminSearchInput,
  AdminSelect,
  AdminTable,
  AdminTableCard,
  AdminTableCell,
  AdminTableFooter,
  AdminTableHead,
  AdminTableHeaderCell,
  AdminTableRow,
  AdminToolbar,
} from '@/components/admin/AdminUi';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { LoadingState, EmptyState, ErrorState } from '@/components/admin/DataState';
import { useMutation, useQuery } from '@/lib/hooks/useAsync';
import { stallingService } from '@/lib/services';
import { formatCurrency, formatDate } from '@/lib/format';
import { useIntl } from '@/i18n/IntlProvider';
import { useToast } from '@/components/ui/ToastProvider';

export default function StallingPage() {
  const { locale, t } = useIntl();
  const { push } = useToast();
  const dateLocale = locale === 'en' ? 'en-GB' : locale === 'de' ? 'de-DE' : 'nl-NL';

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

  const rows = contracts.data?.data ?? [];
  const overdue = rows.filter((c) => c.payment_status === 'overdue').length;
  const openBalance = rows.reduce((sum, c) => sum + (c.open_balance_cents ?? 0) / 100, 0);

  return (
    <>
      <AdminPageHeader
        title={t('adminNew.stalling.title')}
        subtitle={t('adminNew.stalling.subtitle')}
        stats={[
          {
            label: t('adminNew.stalling.contracts', { count: contracts.data?.meta?.total ?? rows.length }),
            value: contracts.data?.meta?.total ?? rows.length,
            icon: Warehouse,
            tone: 'marine',
            loading: contracts.loading,
          },
          {
            label: t('adminNew.status.overdue'),
            value: overdue,
            icon: Ship,
            tone: overdue > 0 ? 'danger' : 'success',
            loading: contracts.loading,
          },
          {
            label: t('adminNew.stalling.columns.openBalance'),
            value: formatCurrency(openBalance, dateLocale),
            tone: 'gold',
            loading: contracts.loading,
          },
          {
            label: t('adminNew.stalling.columns.type'),
            value: type ? t(`adminNew.stalling.type.${type}`) : t('adminNew.stalling.allTypes'),
            tone: 'navy',
          },
        ]}
      />

      <AdminContent>
        <AdminToolbar>
          <AdminSearchInput
            value={search}
            onChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
            placeholder={t('adminNew.stalling.searchPlaceholder')}
          />
          <AdminSelect
            value={status}
            onChange={(value) => {
              setStatus(value);
              setPage(1);
            }}
          >
            <option value="">{t('adminNew.stalling.allStatuses')}</option>
            <option value="paid">{t('adminNew.status.paid')}</option>
            <option value="expiring">{t('adminNew.status.expiring')}</option>
            <option value="overdue">{t('adminNew.status.overdue')}</option>
            <option value="open">{t('adminNew.status.open')}</option>
            <option value="cancelled">{t('adminNew.status.cancelled')}</option>
          </AdminSelect>
          <AdminSelect
            value={type}
            onChange={(value) => {
              setType(value);
              setPage(1);
            }}
          >
            <option value="">{t('adminNew.stalling.allTypes')}</option>
            <option value="winter">{t('adminNew.stalling.type.winter')}</option>
            <option value="summer">{t('adminNew.stalling.type.summer')}</option>
            <option value="year">{t('adminNew.stalling.type.year')}</option>
            <option value="week">{t('adminNew.stalling.type.week')}</option>
          </AdminSelect>
        </AdminToolbar>

        <AdminTableCard
          footer={
            rows.length > 0 ? (
              <AdminTableFooter
                summary={t('adminNew.stalling.contracts', {
                  count: contracts.data?.meta?.total ?? rows.length,
                })}
                meta={contracts.data?.meta}
                onPageChange={setPage}
              />
            ) : undefined
          }
        >
          {contracts.loading ? (
            <LoadingState label={t('adminNew.stalling.loading')} variant="table" />
          ) : null}
          {!contracts.loading && contracts.error ? (
            <ErrorState message={contracts.error} onRetry={() => void contracts.refetch()} />
          ) : null}
          {!contracts.loading && !contracts.error && rows.length === 0 ? (
            <EmptyState
              title={t('adminNew.stalling.emptyTitle')}
              message={t('adminNew.stalling.emptyMessage')}
            />
          ) : null}

          {!contracts.loading && !contracts.error && rows.length > 0 ? (
            <AdminTable minWidth={1100}>
              <AdminTableHead>
                <tr>
                  <AdminTableHeaderCell>{t('adminNew.stalling.columns.boat')}</AdminTableHeaderCell>
                  <AdminTableHeaderCell>{t('adminNew.stalling.columns.customer')}</AdminTableHeaderCell>
                  <AdminTableHeaderCell>{t('adminNew.stalling.columns.period')}</AdminTableHeaderCell>
                  <AdminTableHeaderCell>{t('adminNew.stalling.columns.type')}</AdminTableHeaderCell>
                  <AdminTableHeaderCell>{t('adminNew.stalling.columns.paidUntil')}</AdminTableHeaderCell>
                  <AdminTableHeaderCell>{t('adminNew.stalling.columns.openBalance')}</AdminTableHeaderCell>
                  <AdminTableHeaderCell>{t('adminNew.stalling.columns.status')}</AdminTableHeaderCell>
                  <AdminTableHeaderCell className="text-right">&nbsp;</AdminTableHeaderCell>
                </tr>
              </AdminTableHead>
              <tbody>
                {rows.map((contract) => (
                  <AdminTableRow key={contract.id}>
                    <AdminTableCell>
                      <div className="font-semibold text-navy-900">{contract.boat?.name ?? '—'}</div>
                      <div className="text-xs text-navy-500">
                        {contract.boat?.length_cm ? `${contract.boat.length_cm} cm` : '—'}
                      </div>
                    </AdminTableCell>
                    <AdminTableCell>
                      <div className="font-medium text-navy-900">{contract.customer?.name ?? '—'}</div>
                      {contract.customer?.id ? (
                        <Link
                          href={`/${locale}/admin/klanten/${contract.customer.id}`}
                          className="text-xs font-semibold text-marine-700 hover:text-marine-900"
                        >
                          {t('adminNew.stalling.openCustomer')}
                        </Link>
                      ) : null}
                    </AdminTableCell>
                    <AdminTableCell className="whitespace-nowrap">
                      {formatDate(contract.start_date, dateLocale)} – {formatDate(contract.end_date, dateLocale)}
                    </AdminTableCell>
                    <AdminTableCell className="capitalize">{contract.type}</AdminTableCell>
                    <AdminTableCell>{formatDate(contract.paid_until, dateLocale)}</AdminTableCell>
                    <AdminTableCell className="font-semibold text-navy-900">
                      {formatCurrency(contract.open_balance_cents / 100, dateLocale)}
                    </AdminTableCell>
                    <AdminTableCell>
                      <PaymentStatus status={contract.payment_status} />
                    </AdminTableCell>
                    <AdminTableCell>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          leftIcon={<FilePlus2 className="h-3.5 w-3.5" />}
                          disabled={createInvoice.loading || cancelContract.loading}
                          onClick={() =>
                            void execute(t('adminNew.stalling.invoiceCreated'), () =>
                              createInvoice.mutate(contract.id)
                            )
                          }
                        >
                          {t('adminNew.stalling.invoice')}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={createInvoice.loading || cancelContract.loading}
                          onClick={() => {
                            if (!window.confirm(t('adminNew.stalling.confirmCancel'))) return;
                            void execute(t('adminNew.stalling.cancelled'), () =>
                              cancelContract.mutate(contract.id)
                            );
                          }}
                        >
                          {t('adminNew.stalling.cancel')}
                        </Button>
                      </div>
                    </AdminTableCell>
                  </AdminTableRow>
                ))}
              </tbody>
            </AdminTable>
          ) : null}
        </AdminTableCard>
      </AdminContent>
    </>
  );
}

function PaymentStatus({ status }: { status: string }) {
  const { t } = useIntl();
  const normalized = status.toLowerCase();
  if (normalized.includes('paid')) return <Badge tone="success" dot>{t('adminNew.status.paid')}</Badge>;
  if (normalized.includes('expir')) return <Badge tone="warning" dot>{t('adminNew.status.expiring')}</Badge>;
  if (normalized.includes('overdue')) return <Badge tone="danger" dot>{t('adminNew.status.overdue')}</Badge>;
  if (normalized.includes('cancel')) return <Badge tone="sand" dot>{t('adminNew.status.cancelled')}</Badge>;
  return <Badge tone="navy" dot>{t('adminNew.status.open')}</Badge>;
}
