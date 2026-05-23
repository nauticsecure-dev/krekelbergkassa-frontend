'use client';

import { PortalPageHeader } from '@/components/portal/PortalShell';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/admin/DataState';
import { useIntl } from '@/i18n/IntlProvider';

export default function PortalDocumentsPage() {
  const { t } = useIntl();
  return (
    <>
      <PortalPageHeader title={t('adminNew.portal.documents.title')} subtitle={t('adminNew.portal.documents.subtitle')} />
      <div className="px-4 py-6 sm:px-6">
        <Card className="p-6">
          <EmptyState title={t('adminNew.portal.documents.empty')} message={t('adminNew.portal.documents.emptyMessage')} />
        </Card>
      </div>
    </>
  );
}
