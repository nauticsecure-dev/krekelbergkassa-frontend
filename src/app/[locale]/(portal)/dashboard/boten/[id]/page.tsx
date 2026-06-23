'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Anchor,
  ArrowLeft,
  FileText,
  History,
  MapPin,
  Ship,
  Warehouse,
} from 'lucide-react';
import { PortalPageHeader } from '@/components/portal/PortalShell';
import {
  PortalContent,
  PortalDetailGrid,
  PortalInteractiveRow,
  PortalSectionCard,
} from '@/components/portal/PortalUi';
import { Button } from '@/components/ui/Button';
import { EmptyState, ErrorState, LoadingState } from '@/components/admin/DataState';
import { portalService } from '@/lib/services';
import { useQuery } from '@/lib/hooks/useAsync';
import { centsToEuro, formatCurrency, formatDate } from '@/lib/format';
import { useIntl } from '@/i18n/IntlProvider';

type Row = Record<string, unknown>;

export default function PortalBoatDossierPage() {
  const { t, locale } = useIntl();
  const params = useParams();
  const id = String(params.id);
  const dateLocale = locale === 'en' ? 'en-GB' : locale === 'de' ? 'de-DE' : 'nl-NL';

  const dossier = useQuery([id], () => portalService.boatDossier(id));
  const workOrdersQuery = useQuery([id, 'work-orders'], () =>
    portalService.boatWorkOrders(id).catch(() => [] as Row[])
  );
  const invoicesQuery = useQuery([id, 'invoices'], () =>
    portalService.boatInvoices(id).catch(() => [] as Row[])
  );
  const timelineQuery = useQuery([id, 'timeline'], () =>
    portalService.boatTimeline(id).catch(() => [] as Row[])
  );

  const data = (dossier.data ?? {}) as Row;
  const boat = (data.boat ?? data) as Row;
  const storage = (data.storage_contracts ?? data.storage ?? []) as Row[];

  // Prefer dedicated endpoints; fall back to embedded dossier data.
  const workOrders = (workOrdersQuery.data?.length
    ? workOrdersQuery.data
    : (data.work_orders ?? [])) as Row[];
  const invoices = (invoicesQuery.data?.length
    ? invoicesQuery.data
    : (((data.financial as Row | undefined)?.invoices ?? data.invoices) ?? [])) as Row[];
  const timeline = (timelineQuery.data?.length
    ? timelineQuery.data
    : (data.timeline ?? [])) as Row[];

  const boatName = String(boat.name ?? t('adminNew.portal.boats.title'));

  return (
    <>
      <PortalPageHeader
        eyebrow={String(boat.type ?? '')}
        title={boatName}
        subtitle={t('adminNew.portal.boatDossier.subtitle')}
        rightSlot={
          <Link href={`/${locale}/dashboard/boten`}>
            <Button variant="outline" size="sm" leftIcon={<ArrowLeft className="h-4 w-4" />}>
              {t('adminNew.common.back')}
            </Button>
          </Link>
        }
        stats={[
          {
            label: t('adminNew.portal.boats.length'),
            value: boat.length_cm ? `${boat.length_cm} cm` : '—',
            icon: Ship,
            tone: 'marine',
            loading: dossier.loading,
          },
          {
            label: t('adminNew.portal.boats.location'),
            value: String(boat.location_code ?? '—'),
            icon: MapPin,
            tone: 'gold',
            loading: dossier.loading,
          },
          {
            label: t('adminNew.workOrders.title'),
            value: workOrders.length,
            icon: Anchor,
            tone: 'navy',
            loading: workOrdersQuery.loading,
          },
          {
            label: t('admin.sidebar.invoices'),
            value: invoices.length,
            icon: FileText,
            tone: 'success',
            loading: invoicesQuery.loading,
          },
        ]}
      />

      <PortalContent>
        {dossier.loading ? <LoadingState label={t('adminNew.common.loading')} variant="cards" /> : null}
        {!dossier.loading && dossier.error ? (
          <ErrorState message={dossier.error} onRetry={() => void dossier.refetch()} />
        ) : null}

        {!dossier.loading && !dossier.error ? (
          <div className="space-y-5">
            <PortalSectionCard
              title={t('adminNew.portal.boatDossier.boatInfo')}
              description={t('adminNew.portal.boatDossier.boatInfoDesc')}
              icon={Ship}
            >
              <PortalDetailGrid
                items={[
                  { label: t('adminNew.boats.columns.type'), value: String(boat.type ?? '—') },
                  { label: t('adminNew.boats.fields.brand'), value: String(boat.brand ?? '—') },
                  { label: t('adminNew.boats.fields.model'), value: String(boat.model ?? '—') },
                  { label: t('adminNew.boats.fields.buildYear'), value: String(boat.build_year ?? '—') },
                  { label: t('adminNew.portal.boats.length'), value: boat.length_cm ? `${boat.length_cm} cm` : '—' },
                  { label: t('adminNew.boats.fields.widthCm'), value: boat.width_cm ? `${boat.width_cm} cm` : '—' },
                  {
                    label: t('adminNew.boats.fields.registrationNumber'),
                    value: String(boat.registration_number ?? '—'),
                  },
                  {
                    label: t('adminNew.boats.fields.insuranceExpiry'),
                    value: boat.insurance_expiry_date
                      ? formatDate(String(boat.insurance_expiry_date), dateLocale)
                      : '—',
                  },
                ]}
              />
            </PortalSectionCard>

            <PortalSectionCard
              title={t('adminNew.portal.boatDossier.storage')}
              icon={Warehouse}
            >
              {storage.length === 0 ? (
                <EmptyState
                  title={t('adminNew.portal.boatDossier.noStorage')}
                  message={t('adminNew.portal.boatDossier.noStorageMessage')}
                />
              ) : (
                <div className="space-y-2.5">
                  {storage.map((c, i) => (
                    <PortalInteractiveRow
                      key={String(c.id ?? i)}
                      icon={Warehouse}
                      tone="gold"
                      title={String(c.contract_number ?? c.location_code ?? `#${i + 1}`)}
                      subtitle={String(c.location_code ?? '')}
                      meta={c.status ? String(c.status) : undefined}
                    />
                  ))}
                </div>
              )}
            </PortalSectionCard>

            <PortalSectionCard
              title={t('adminNew.workOrders.title')}
              icon={Anchor}
            >
              {workOrdersQuery.loading ? (
                <LoadingState label={t('adminNew.common.loading')} variant="list" />
              ) : workOrders.length === 0 ? (
                <EmptyState
                  title={t('adminNew.portal.boatDossier.noWorkOrders')}
                  message={t('adminNew.portal.boatDossier.noWorkOrdersMessage')}
                />
              ) : (
                <div className="space-y-2.5">
                  {workOrders.map((wo, i) => (
                    <PortalInteractiveRow
                      key={String(wo.id ?? i)}
                      icon={Anchor}
                      tone="navy"
                      title={String(wo.number ?? wo.id ?? `#${i + 1}`)}
                      subtitle={wo.type ? String(wo.type) : undefined}
                      meta={wo.created_at ? formatDate(String(wo.created_at), dateLocale) : undefined}
                      trailing={
                        wo.status ? (
                          <span className="rounded-full bg-navy-50 px-2.5 py-1 text-[11px] font-semibold text-navy-600">
                            {String(wo.status)}
                          </span>
                        ) : undefined
                      }
                    />
                  ))}
                </div>
              )}
            </PortalSectionCard>

            <PortalSectionCard
              title={t('admin.sidebar.invoices')}
              icon={FileText}
            >
              {invoicesQuery.loading ? (
                <LoadingState label={t('adminNew.common.loading')} variant="list" />
              ) : invoices.length === 0 ? (
                <EmptyState
                  title={t('adminNew.portal.boatDossier.noInvoices')}
                  message={t('adminNew.portal.boatDossier.noInvoicesMessage')}
                />
              ) : (
                <div className="space-y-2.5">
                  {invoices.map((inv, i) => {
                    const cents = inv.total_amount_cents ?? inv.outstanding_cents ?? inv.total_amount;
                    return (
                      <PortalInteractiveRow
                        key={String(inv.id ?? i)}
                        icon={FileText}
                        tone="marine"
                        title={String(inv.invoice_number ?? inv.id ?? `#${i + 1}`)}
                        subtitle={inv.status ? String(inv.status) : undefined}
                        meta={
                          cents != null
                            ? formatCurrency(centsToEuro(Number(cents)), dateLocale)
                            : undefined
                        }
                      />
                    );
                  })}
                </div>
              )}
            </PortalSectionCard>

            <PortalSectionCard
              title={t('adminNew.boats.tabs.timeline')}
              icon={History}
            >
              {timelineQuery.loading ? (
                <LoadingState label={t('adminNew.common.loading')} variant="list" />
              ) : timeline.length === 0 ? (
                <EmptyState
                  title={t('adminNew.portal.boatDossier.noTimeline')}
                  message={t('adminNew.portal.boatDossier.noTimelineMessage')}
                />
              ) : (
                <ol className="space-y-3">
                  {timeline.map((item, i) => (
                    <li key={String(item.id ?? i)} className="flex items-start gap-3 text-sm">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-marine-400" />
                      <div>
                        <div className="text-navy-800">
                          {String(item.title ?? item.message ?? item.type ?? '—')}
                        </div>
                        <div className="text-xs text-navy-400">
                          {item.created_at ? formatDate(String(item.created_at), dateLocale) : ''}
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </PortalSectionCard>
          </div>
        ) : null}
      </PortalContent>
    </>
  );
}
