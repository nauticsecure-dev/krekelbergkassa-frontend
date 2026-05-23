'use client';

import { PortalPageHeader } from '@/components/portal/PortalShell';
import { Card } from '@/components/ui/Card';
import { LoadingState, ErrorState, EmptyState } from '@/components/admin/DataState';
import { useQuery } from '@/lib/hooks/useAsync';
import { portalService } from '@/lib/services';
import { useIntl } from '@/i18n/IntlProvider';

export default function PortalMessagesPage() {
  const { t } = useIntl();
  const notifications = useQuery([], () => portalService.notifications());

  return (
    <>
      <PortalPageHeader title={t('adminNew.portal.messages.title')} subtitle={t('adminNew.portal.messages.subtitle')} />
      <div className="px-4 py-6 sm:px-6">
        <Card className="overflow-hidden">
          {notifications.loading ? <LoadingState label={t('adminNew.portal.messages.loading')} variant="list" /> : null}
          {!notifications.loading && notifications.error ? <ErrorState message={notifications.error} onRetry={() => void notifications.refetch()} /> : null}
          {!notifications.loading && !notifications.error && notifications.data?.data.length === 0 ? <EmptyState title={t('adminNew.portal.messages.empty')} /> : null}
          {!notifications.loading && !notifications.error && (notifications.data?.data.length ?? 0) > 0 ? (
            <div className="divide-y divide-navy-100">
              {notifications.data?.data.map((item, idx) => (
                <div key={String(item.id ?? idx)} className="px-4 py-3">
                  <div className="text-sm font-semibold text-navy-900">{String(item.title ?? t('adminNew.portal.messages.item'))}</div>
                  <div className="mt-1 text-xs text-navy-500">{String(item.body ?? item.message ?? '')}</div>
                </div>
              ))}
            </div>
          ) : null}
        </Card>
      </div>
    </>
  );
}
