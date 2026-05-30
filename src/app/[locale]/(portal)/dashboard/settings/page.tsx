'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  FileText,
  Link2,
  Mail,
  Phone,
  RefreshCw,
  Shield,
  Ship,
  User,
  Warehouse,
} from 'lucide-react';
import { PortalPageHeader } from '@/components/portal/PortalShell';
import {
  PortalContent,
  PortalDetailGrid,
  PortalSectionCard,
} from '@/components/portal/PortalUi';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { useQuery } from '@/lib/hooks/useAsync';
import { portalService } from '@/lib/services';
import { LoadingState, ErrorState } from '@/components/admin/DataState';
import { useIntl } from '@/i18n/IntlProvider';
import { formatCurrency } from '@/lib/format';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/ToastProvider';
import { getApiErrorMessage } from '@/lib/api-error';

export default function PortalSettingsPage() {
  const { t, locale } = useIntl();
  const { user } = useAuth();
  const { push } = useToast();
  const dateLocale = locale === 'en' ? 'en-GB' : locale === 'de' ? 'de-DE' : 'nl-NL';
  const me = useQuery([], () => portalService.me());

  const displayName = me.data?.customer.name ?? user?.name ?? '—';
  const displayEmail = me.data?.customer.email ?? user?.email ?? '—';

  return (
    <>
      <PortalPageHeader
        title={t('adminNew.portal.settings.title')}
        subtitle={t('adminNew.portal.settings.subtitle')}
        stats={[
          {
            label: t('adminNew.portal.settings.openBalance'),
            value: me.data
              ? formatCurrency(Number(me.data.summary.open_balance_cents) / 100, dateLocale)
              : '—',
            icon: FileText,
            tone: 'gold',
            loading: me.loading,
          },
          {
            label: t('adminNew.portal.settings.openInvoices'),
            value: me.data?.summary.open_invoices_count ?? '—',
            icon: FileText,
            tone: 'marine',
            loading: me.loading,
          },
          {
            label: t('adminNew.portal.settings.boats'),
            value: me.data?.summary.boats_count ?? '—',
            icon: Ship,
            tone: 'navy',
            loading: me.loading,
          },
          {
            label: t('adminNew.portal.settings.activeContracts'),
            value: me.data?.summary.active_contracts_count ?? '—',
            icon: Warehouse,
            tone: 'success',
            loading: me.loading,
          },
        ]}
      />

      <PortalContent>
        {me.loading ? <LoadingState label={t('adminNew.portal.settings.loading')} variant="detail" /> : null}
        {!me.loading && me.error ? (
          <ErrorState message={me.error} onRetry={() => void me.refetch()} />
        ) : null}

        {me.data ? (
          <div className="space-y-5">
            <section className="surface-float overflow-hidden rounded-2xl border border-navy-100/60 bg-white">
              <div className="relative isolate bg-navy-950 px-6 py-8 text-white sm:px-8">
                <div
                  aria-hidden
                  className="absolute inset-0 bg-gradient-to-tr from-navy-950 via-navy-900 to-marine-900"
                />
                <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    <Avatar name={displayName} size="lg" />
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-widest text-sand-100/60">
                        {t('adminNew.portal.settings.account')}
                      </div>
                      <h2 className="heading-display mt-1 text-2xl text-white">{displayName}</h2>
                      <div className="mt-1 text-sm text-sand-100/75">{displayEmail}</div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Badge tone="success" dot>
                          {t('adminNew.portal.settings.magicActive')}
                        </Badge>
                        <Badge tone="gold">{me.data.customer.customer_number}</Badge>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-white/20 bg-white/10 text-white hover:bg-white/20"
                    leftIcon={<RefreshCw className="h-4 w-4" />}
                    disabled={me.loading}
                    onClick={() =>
                      void (async () => {
                        try {
                          await me.refetch();
                          push({ tone: 'success', title: t('adminNew.portal.settings.sessionRefreshed') });
                        } catch (err) {
                          push({
                            tone: 'error',
                            title: t('adminNew.common.operationFailed'),
                            message: getApiErrorMessage(err),
                          });
                        }
                      })()
                    }
                  >
                    {t('adminNew.portal.settings.refreshSession')}
                  </Button>
                </div>
              </div>
            </section>

            <div className="grid gap-5 lg:grid-cols-2">
              <PortalSectionCard
                title={t('adminNew.portal.settings.myDetails')}
                description={t('adminNew.portal.settings.listOverview')}
                icon={User}
              >
                <PortalDetailGrid
                  items={[
                    { label: t('adminNew.common.name'), value: me.data.customer.name },
                    { label: t('adminNew.common.email'), value: me.data.customer.email },
                    { label: t('adminNew.common.phone'), value: me.data.customer.phone || '—' },
                    {
                      label: t('adminNew.customerDetail.preferredLocale'),
                      value: me.data.customer.preferred_locale,
                    },
                  ]}
                />
              </PortalSectionCard>

              <PortalSectionCard
                title={t('adminNew.portal.settings.securityTitle')}
                description={t('adminNew.portal.settings.securityText')}
                icon={Shield}
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-2 rounded-xl border border-navy-100 bg-sand-50/60 px-3 py-2.5 text-sm text-navy-700">
                    <Mail className="h-4 w-4 text-navy-400" />
                    {t('adminNew.portal.settings.securityEmail')}
                  </div>
                  <div className="flex items-center gap-2 rounded-xl border border-navy-100 bg-sand-50/60 px-3 py-2.5 text-sm text-navy-700">
                    <Phone className="h-4 w-4 text-navy-400" />
                    {t('adminNew.portal.settings.securitySupport')}
                  </div>
                </div>
              </PortalSectionCard>
            </div>

            <PortalSectionCard
              title={t('adminNew.portal.settings.quickLinks')}
              description={t('adminNew.portal.settings.quickLinksHint')}
              icon={Link2}
            >
              <div className="flex flex-wrap gap-2">
                <Link href={`/${locale}/dashboard/facturen`}>
                  <Button variant="outline" size="sm">{t('login.invoices')}</Button>
                </Link>
                <Link href={`/${locale}/dashboard/boten`}>
                  <Button variant="outline" size="sm">{t('login.yourBoats')}</Button>
                </Link>
                <Link href={`/${locale}/faq`}>
                  <Button variant="gold" size="sm">{t('admin.sidebar.help')}</Button>
                </Link>
              </div>
            </PortalSectionCard>
          </div>
        ) : null}
      </PortalContent>
    </>
  );
}
