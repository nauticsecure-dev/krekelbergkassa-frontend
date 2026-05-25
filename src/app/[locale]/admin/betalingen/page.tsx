'use client';

import * as React from 'react';
import { CreditCard, RefreshCw } from 'lucide-react';
import { AdminPageHeader } from '@/components/admin/AdminShell';
import { AdminConfirmModal } from '@/components/admin/AdminConfirmModal';
import {
  AdminContent,
  AdminSearchInput,
  AdminSectionCard,
  AdminTable,
  AdminTableCard,
  AdminTableCell,
  AdminTableFooter,
  AdminTableHead,
  AdminTableHeaderCell,
  AdminTableRow,
} from '@/components/admin/AdminUi';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { paymentsService } from '@/lib/services';
import { useMutation, useQuery } from '@/lib/hooks/useAsync';
import { EmptyState, ErrorState, LoadingState } from '@/components/admin/DataState';
import { useToast } from '@/components/ui/ToastProvider';
import { useIntl } from '@/i18n/IntlProvider';
import { formatCurrency, formatDate } from '@/lib/format';

export default function PaymentsPage() {
  const { t, locale } = useIntl();
  const { push } = useToast();
  const [query, setQuery] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [reconcileTarget, setReconcileTarget] = React.useState<string | null>(null);

  const payments = useQuery([query, page], () =>
    paymentsService.list({ search: query || undefined, page, per_page: 20 })
  );
  const reconcile = useMutation((id: string) => paymentsService.reconcile(id));

  const rows = payments.data?.data ?? [];
  const dateLocale = locale === 'en' ? 'en-GB' : locale === 'de' ? 'de-DE' : 'nl-NL';

  const onReconcile = async (id: string) => {
    try {
      await reconcile.mutate(id);
      await payments.refetch();
      push({ tone: 'success', title: t('adminNew.payments.toasts.reconciled') });
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
        title={t('adminNew.payments.title')}
        subtitle={t('adminNew.payments.subtitle')}
      />
      <AdminContent>
        <AdminSectionCard
          title={t('adminNew.payments.title')}
          description={t('adminNew.payments.subtitle')}
          icon={CreditCard}
        >
        <AdminSearchInput
          placeholder={t('adminNew.payments.searchPlaceholder')}
          value={query}
          onChange={(value) => {
            setQuery(value);
            setPage(1);
          }}
          className="mb-4"
        />

        <AdminTableCard>
          {payments.loading ? (
            <LoadingState label={t('adminNew.payments.loading')} />
          ) : payments.error ? (
            <ErrorState message={payments.error} onRetry={() => void payments.refetch()} />
          ) : rows.length === 0 ? (
            <EmptyState title={t('adminNew.payments.emptyTitle')} message={t('adminNew.payments.emptyMessage')} />
          ) : (
            <>
              <AdminTable>
                <AdminTableHead>
                  <AdminTableRow>
                    <AdminTableHeaderCell>{t('adminNew.payments.columns.date')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{t('adminNew.payments.columns.customer')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{t('adminNew.payments.columns.method')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{t('adminNew.payments.columns.amount')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{t('adminNew.payments.columns.status')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{''}</AdminTableHeaderCell>
                  </AdminTableRow>
                </AdminTableHead>
                <tbody>
                  {rows.map((row) => (
                    <AdminTableRow key={row.id}>
                      <AdminTableCell>
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4 text-marine-600" />
                          {formatDate(row.created_at, dateLocale)}
                        </div>
                      </AdminTableCell>
                      <AdminTableCell>{row.customer?.name ?? '—'}</AdminTableCell>
                      <AdminTableCell>{row.method ?? row.provider}</AdminTableCell>
                      <AdminTableCell>{formatCurrency(row.amount_euros ?? row.amount / 100)}</AdminTableCell>
                      <AdminTableCell>
                        <Badge tone={row.status === 'paid' ? 'success' : row.status === 'failed' ? 'danger' : 'neutral'}>
                          {row.status}
                        </Badge>
                      </AdminTableCell>
                      <AdminTableCell>
                        {!row.reconciled_at ? (
                          <Button
                            size="sm"
                            variant="secondary"
                            leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
                            onClick={() => setReconcileTarget(row.id)}
                          >
                            {t('adminNew.payments.reconcile')}
                          </Button>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs text-navy-400">
                            <RefreshCw className="h-3.5 w-3.5" />
                            {t('adminNew.payments.reconciled')}
                          </span>
                        )}
                      </AdminTableCell>
                    </AdminTableRow>
                  ))}
                </tbody>
              </AdminTable>
              <AdminTableFooter
                summary={t('adminNew.payments.total', {
                  count: payments.data?.meta?.total ?? rows.length,
                })}
                meta={payments.data?.meta}
                onPageChange={setPage}
              />
            </>
          )}
        </AdminTableCard>
        </AdminSectionCard>
      </AdminContent>

      <AdminConfirmModal
        open={!!reconcileTarget}
        onClose={() => setReconcileTarget(null)}
        onConfirm={async () => {
          if (!reconcileTarget) return;
          await onReconcile(reconcileTarget);
          setReconcileTarget(null);
        }}
        title={t('adminNew.payments.reconcile')}
        message={t('adminNew.payments.confirmReconcile')}
        confirmLabel={t('adminNew.payments.reconcile')}
        cancelLabel={t('adminNew.common.cancel')}
        variant="primary"
        icon={RefreshCw}
        loading={reconcile.loading}
      />
    </>
  );
}
