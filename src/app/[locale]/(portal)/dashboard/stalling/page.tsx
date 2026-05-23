'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Calendar,
  Ship,
  Warehouse,
} from 'lucide-react';
import { PortalPageHeader } from '@/components/portal/PortalShell';
import {
  ContractStatusBadge,
  PortalContent,
  PortalDetailGrid,
  PortalInteractiveRow,
  PortalModalBody,
  PortalModalFooter,
  PortalModalHeader,
} from '@/components/portal/PortalUi';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { EmptyState, ErrorState, LoadingState } from '@/components/admin/DataState';
import { portalService } from '@/lib/services';
import { useQuery } from '@/lib/hooks/useAsync';
import { formatCurrency, formatDate } from '@/lib/format';
import type { PortalContract } from '@/lib/api-types';
import { useIntl } from '@/i18n/IntlProvider';

export default function PortalStallingPage() {
  const { t, locale } = useIntl();
  const dateLocale = locale === 'en' ? 'en-GB' : locale === 'de' ? 'de-DE' : 'nl-NL';
  const [selected, setSelected] = React.useState<PortalContract | null>(null);

  const contracts = useQuery([], () => portalService.contracts());
  const items = contracts.data ?? [];
  const active = items.filter((c) => c.status === 'active').length;
  const openBalance = items.reduce((sum, c) => sum + (c.open_balance_cents ?? 0) / 100, 0);

  return (
    <>
      <PortalPageHeader
        title={t('adminNew.portal.stalling.title')}
        subtitle={t('adminNew.portal.stalling.subtitle')}
        rightSlot={
          <Link href={`/${locale}/diensten/winterstalling`}>
            <Button variant="outline" size="sm">
              {t('adminNew.portal.stalling.requestStorage')}
            </Button>
          </Link>
        }
        stats={[
          {
            label: t('adminNew.portal.stalling.metricActive'),
            value: active,
            icon: Warehouse,
            tone: 'success',
            loading: contracts.loading,
          },
          {
            label: t('adminNew.portal.stalling.metricTotal'),
            value: items.length,
            icon: Ship,
            tone: 'marine',
            loading: contracts.loading,
          },
          {
            label: t('adminNew.portal.stalling.metricBalance'),
            value: formatCurrency(openBalance, dateLocale),
            icon: Calendar,
            tone: openBalance > 0 ? 'gold' : 'success',
            loading: contracts.loading,
          },
          {
            label: t('adminNew.portal.stalling.metricNextDue'),
            value: items.find((c) => c.paid_until)
              ? formatDate(items.find((c) => c.paid_until)?.paid_until, dateLocale)
              : '—',
            icon: Calendar,
            tone: 'navy',
            loading: contracts.loading,
          },
        ]}
      />

      <PortalContent>
        {contracts.loading ? (
          <Card className="overflow-hidden">
            <LoadingState label={t('adminNew.portal.stalling.loading')} variant="list" />
          </Card>
        ) : null}

        {!contracts.loading && contracts.error ? (
          <Card>
            <ErrorState message={contracts.error} onRetry={() => void contracts.refetch()} />
          </Card>
        ) : null}

        {!contracts.loading && !contracts.error && items.length === 0 ? (
          <Card>
            <EmptyState
              title={t('adminNew.portal.stalling.empty')}
              message={t('adminNew.portal.stalling.emptyMessage')}
              action={
                <Link href={`/${locale}/contact`}>
                  <Button variant="gold" size="sm">
                    {t('adminNew.portal.stalling.contact')}
                  </Button>
                </Link>
              }
            />
          </Card>
        ) : null}

        {!contracts.loading && !contracts.error && items.length > 0 ? (
          <div className="space-y-2.5">
            {items.map((contract) => (
              <PortalInteractiveRow
                key={contract.id}
                icon={Warehouse}
                tone={
                  contract.status === 'active'
                    ? 'success'
                    : contract.status.includes('overdue')
                      ? 'danger'
                      : 'warning'
                }
                title={contract.contract_number}
                subtitle={`${formatDate(contract.start_date, dateLocale)} – ${formatDate(contract.end_date, dateLocale)}`}
                meta={contract.period_label || contract.type}
                trailing={
                  <div className="flex flex-col items-end gap-1.5 sm:flex-row sm:items-center">
                    <span className="text-sm font-semibold text-navy-900">
                      {formatCurrency(contract.open_balance_cents / 100, dateLocale)}
                    </span>
                    <ContractStatusBadge status={contract.status} />
                  </div>
                }
                onClick={() => setSelected(contract)}
              />
            ))}
          </div>
        ) : null}
      </PortalContent>

      <Modal open={!!selected} onClose={() => setSelected(null)} size="lg">
        {selected ? (
          <>
            <PortalModalHeader
              eyebrow={t('adminNew.portal.stalling.detailEyebrow')}
              title={selected.contract_number}
              subtitle={selected.period_label || selected.type}
            />
            <PortalModalBody>
              <div className="flex flex-wrap items-center gap-2">
                <ContractStatusBadge status={selected.status} />
              </div>
              <PortalDetailGrid
                items={[
                  {
                    label: t('adminNew.stalling.columns.period'),
                    value: `${formatDate(selected.start_date, dateLocale)} – ${formatDate(selected.end_date, dateLocale)}`,
                  },
                  {
                    label: t('adminNew.stalling.columns.type'),
                    value: t(`adminNew.stalling.type.${selected.type}`) || selected.type,
                  },
                  {
                    label: t('adminNew.stalling.columns.paidUntil'),
                    value: selected.paid_until
                      ? formatDate(selected.paid_until, dateLocale)
                      : '—',
                  },
                  {
                    label: t('adminNew.stalling.columns.openBalance'),
                    value: formatCurrency(selected.open_balance_cents / 100, dateLocale),
                  },
                ]}
              />
              {selected.boat ? (
                <div className="rounded-xl border border-navy-100 bg-sand-50/60 p-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-navy-400">
                    {t('adminNew.portal.stalling.linkedBoat')}
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-marine-50 text-marine-700">
                      <Ship className="h-4 w-4" />
                    </span>
                    <div>
                      <div className="font-semibold text-navy-900">{selected.boat.name}</div>
                      <div className="text-xs text-navy-500">
                        {selected.boat.registration_number || selected.boat.type}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </PortalModalBody>
            <PortalModalFooter>
              <Button variant="outline" onClick={() => setSelected(null)}>
                {t('adminNew.common.cancel')}
              </Button>
              <Link href={`/${locale}/dashboard/facturen`}>
                <Button variant="gold">{t('adminNew.portal.stalling.viewInvoices')}</Button>
              </Link>
            </PortalModalFooter>
          </>
        ) : null}
      </Modal>
    </>
  );
}
