'use client';

import { PortalPageHeader } from '@/components/portal/PortalShell';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useQuery } from '@/lib/hooks/useAsync';
import { portalService } from '@/lib/services';
import { LoadingState, ErrorState } from '@/components/admin/DataState';
import { useIntl } from '@/i18n/IntlProvider';

export default function PortalSettingsPage() {
  const { t } = useIntl();
  const me = useQuery([], () => portalService.me());

  return (
    <>
      <PortalPageHeader title={t('adminNew.portal.settings.title')} subtitle={t('adminNew.portal.settings.subtitle')} />
      <div className="space-y-4 px-4 py-6 sm:px-6">
        {me.loading ? <LoadingState label={t('adminNew.portal.settings.loading')} variant="detail" /> : null}
        {!me.loading && me.error ? <ErrorState message={me.error} onRetry={() => void me.refetch()} /> : null}

        {me.data ? (
          <>
            <Card className="p-5">
              <div className="text-sm font-semibold text-navy-900">{t('adminNew.portal.settings.myDetails')}</div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Info label="Naam" value={me.data.customer.name} />
                <Info label="E-mail" value={me.data.customer.email} />
                <Info label="Telefoon" value={me.data.customer.phone || '-'} />
                <Info label="Voorkeurstaal" value={me.data.customer.preferred_locale} />
              </div>
            </Card>

            <Card className="p-5">
              <div className="mb-3 text-sm font-semibold text-navy-900">{t('adminNew.portal.settings.summary')}</div>
              <div className="grid gap-3 sm:grid-cols-4">
                <Metric label={t('adminNew.portal.settings.openBalance')} value={`${Number(me.data.summary.open_balance_cents) / 100} EUR`} />
                <Metric label={t('adminNew.portal.settings.openInvoices')} value={String(me.data.summary.open_invoices_count)} />
                <Metric label={t('adminNew.portal.settings.boats')} value={String(me.data.summary.boats_count)} />
                <Metric label={t('adminNew.portal.settings.activeContracts')} value={String(me.data.summary.active_contracts_count)} />
              </div>
              <div className="mt-4 flex items-center gap-2">
                <Badge tone="success" dot>
                  {t('adminNew.portal.settings.magicActive')}
                </Badge>
                <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                  {t('adminNew.portal.settings.refreshSession')}
                </Button>
              </div>
            </Card>
          </>
        ) : null}
      </div>
    </>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-navy-100 px-3 py-2">
      <div className="text-xs text-navy-500">{label}</div>
      <div className="text-sm font-medium text-navy-900">{value}</div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-navy-100 px-3 py-2">
      <div className="text-xs text-navy-500">{label}</div>
      <div className="text-lg font-semibold text-navy-900">{value}</div>
    </div>
  );
}
