'use client';

import { PortalPageHeader } from '@/components/portal/PortalShell';
import { Card } from '@/components/ui/Card';
import { EmptyState, ErrorState, LoadingState } from '@/components/admin/DataState';
import { Badge } from '@/components/ui/Badge';
import { portalService } from '@/lib/services';
import { useQuery } from '@/lib/hooks/useAsync';
import { formatCurrency, formatDate } from '@/lib/format';
import { useIntl } from '@/i18n/IntlProvider';

export default function PortalStallingPage() {
  const { t } = useIntl();
  const contracts = useQuery([], () => portalService.contracts());

  return (
    <>
      <PortalPageHeader title={t('adminNew.portal.stalling.title')} subtitle={t('adminNew.portal.stalling.subtitle')} />
      <div className="space-y-4 px-4 py-6 sm:px-6">
        <Card className="overflow-hidden">
          {contracts.loading ? <LoadingState label={t('adminNew.portal.stalling.loading')} variant="list" /> : null}
          {!contracts.loading && contracts.error ? <ErrorState message={contracts.error} onRetry={() => void contracts.refetch()} /> : null}
          {!contracts.loading && !contracts.error && (contracts.data?.length ?? 0) === 0 ? <EmptyState title={t('adminNew.portal.stalling.empty')} /> : null}

          {!contracts.loading && !contracts.error && (contracts.data?.length ?? 0) > 0 ? (
            <div className="divide-y divide-navy-100">
              {contracts.data?.map((contract) => (
                <div key={contract.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <div>
                    <div className="font-semibold text-navy-900">{contract.contract_number}</div>
                    <div className="text-xs text-navy-500">{formatDate(contract.start_date)} - {formatDate(contract.end_date)}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-semibold text-navy-900">{formatCurrency(contract.open_balance_cents / 100)}</div>
                    <Badge tone={contract.status === 'active' ? 'success' : 'warning'}>{contract.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </Card>
      </div>
    </>
  );
}
