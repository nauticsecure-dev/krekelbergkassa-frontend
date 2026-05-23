'use client';

import { PortalPageHeader } from '@/components/portal/PortalShell';
import { Card } from '@/components/ui/Card';
import { LoadingState, ErrorState, EmptyState } from '@/components/admin/DataState';
import { useQuery } from '@/lib/hooks/useAsync';
import { portalService } from '@/lib/services';
import { useIntl } from '@/i18n/IntlProvider';

export default function PortalAppointmentsPage() {
  const { t } = useIntl();
  const timeline = useQuery([], () => portalService.timeline());

  return (
    <>
      <PortalPageHeader title={t('adminNew.portal.updates.title')} subtitle={t('adminNew.portal.updates.subtitle')} />
      <div className="space-y-4 px-4 py-6 sm:px-6">
        <Card className="overflow-hidden">
          {timeline.loading ? <LoadingState label={t('adminNew.portal.updates.loading')} variant="list" /> : null}
          {!timeline.loading && timeline.error ? <ErrorState message={timeline.error} onRetry={() => void timeline.refetch()} /> : null}
          {!timeline.loading && !timeline.error && timeline.data?.data.length === 0 ? <EmptyState title={t('adminNew.portal.updates.empty')} /> : null}

          {!timeline.loading && !timeline.error && (timeline.data?.data.length ?? 0) > 0 ? (
            <div className="divide-y divide-navy-100">
              {timeline.data?.data.map((item, idx) => (
                <div key={String(item.id ?? idx)} className="px-4 py-3">
                  <div className="text-sm font-medium text-navy-900">{String(item.title ?? item.type ?? t('adminNew.portal.updates.item'))}</div>
                  <div className="mt-1 text-xs text-navy-500">{String(item.body ?? item.message ?? '')}</div>
                  <div className="mt-1 text-xs text-navy-400">{String(item.created_at ?? '')}</div>
                </div>
              ))}
            </div>
          ) : null}
        </Card>
      </div>
    </>
  );
}
