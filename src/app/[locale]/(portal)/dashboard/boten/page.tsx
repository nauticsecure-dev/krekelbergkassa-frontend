'use client';

import { PortalPageHeader } from '@/components/portal/PortalShell';
import { Card } from '@/components/ui/Card';
import { EmptyState, ErrorState, LoadingState } from '@/components/admin/DataState';
import { portalService } from '@/lib/services';
import { useQuery } from '@/lib/hooks/useAsync';
import { useIntl } from '@/i18n/IntlProvider';

export default function PortalBoatsPage() {
  const { t } = useIntl();
  const boats = useQuery([], () => portalService.boats());

  return (
    <>
      <PortalPageHeader title={t('adminNew.portal.boats.title')} subtitle={t('adminNew.portal.boats.subtitle')} />
      <div className="space-y-4 px-4 py-6 sm:px-6">
        <Card className="overflow-hidden">
          {boats.loading ? <LoadingState label={t('adminNew.portal.boats.loading')} variant="cards" /> : null}
          {!boats.loading && boats.error ? <ErrorState message={boats.error} onRetry={() => void boats.refetch()} /> : null}
          {!boats.loading && !boats.error && (boats.data?.length ?? 0) === 0 ? <EmptyState title={t('adminNew.portal.boats.empty')} /> : null}

          {!boats.loading && !boats.error && (boats.data?.length ?? 0) > 0 ? (
            <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
              {boats.data?.map((boat) => (
                <div key={boat.id} className="rounded-xl border border-navy-100 p-4">
                  <div className="font-semibold text-navy-900">{boat.name}</div>
                  <div className="text-xs text-navy-500">{boat.type} · {boat.registration_number || '-'}</div>
                  <div className="mt-2 text-sm text-navy-700">
                    {t('adminNew.portal.boats.length')}: {boat.length_cm || '-'} cm
                  </div>
                  <div className="text-sm text-navy-700">{t('adminNew.portal.boats.location')}: {boat.location_code || '-'}</div>
                </div>
              ))}
            </div>
          ) : null}
        </Card>
      </div>
    </>
  );
}
