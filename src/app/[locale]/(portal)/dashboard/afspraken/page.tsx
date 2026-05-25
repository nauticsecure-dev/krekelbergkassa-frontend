'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Calendar,
  Clock,
  MapPin,
  Plus,
  Ship,
} from 'lucide-react';
import { PortalPageHeader } from '@/components/portal/PortalShell';
import {
  AppointmentStatusBadge,
  groupByDateKey,
  PortalContent,
  PortalDetailGrid,
  PortalFilterBar,
  PortalFilterPill,
  PortalInteractiveRow,
  PortalModalBody,
  PortalModalFooter,
  PortalModalHeader,
  PortalSectionCard,
  PortalSectionLabel,
} from '@/components/portal/PortalUi';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { LoadingState, ErrorState, EmptyState } from '@/components/admin/DataState';
import { useQuery } from '@/lib/hooks/useAsync';
import { portalService } from '@/lib/services';
import type { Appointment } from '@/lib/api-types';
import { useIntl } from '@/i18n/IntlProvider';
import { formatDate, formatDateTime } from '@/lib/format';

type StatusFilter = '' | 'upcoming' | 'completed' | 'cancelled';

export default function PortalAppointmentsPage() {
  const { t, locale } = useIntl();
  const dateLocale = locale === 'en' ? 'en-GB' : locale === 'de' ? 'de-DE' : 'nl-NL';
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>('');
  const [selected, setSelected] = React.useState<Appointment | null>(null);

  const appointments = useQuery([statusFilter], () =>
    portalService.appointments({
      status: statusFilter || undefined,
      per_page: 50,
    })
  );

  const items = appointments.data?.data ?? [];
  const upcoming = items.filter((a) => {
    const s = a.status.toLowerCase();
    return !s.includes('complete') && !s.includes('cancel');
  }).length;
  const completed = items.filter((a) => a.status.toLowerCase().includes('complete')).length;
  const grouped = groupByDateKey(items, 'appointment_date');

  return (
    <>
      <PortalPageHeader
        title={t('adminNew.portal.appointments.title')}
        subtitle={t('adminNew.portal.appointments.subtitle')}
        stats={[
          {
            label: t('adminNew.portal.appointments.metricTotal'),
            value: appointments.data?.total ?? items.length,
            icon: Calendar,
            tone: 'marine',
            loading: appointments.loading,
          },
          {
            label: t('adminNew.portal.appointments.metricUpcoming'),
            value: upcoming,
            icon: Clock,
            tone: 'gold',
            loading: appointments.loading,
          },
          {
            label: t('adminNew.portal.appointments.metricCompleted'),
            value: completed,
            icon: Ship,
            tone: 'success',
            loading: appointments.loading,
          },
          {
            label: t('adminNew.portal.appointments.metricNext'),
            value: items[0] ? formatDate(items[0].appointment_date, dateLocale) : '—',
            hint: items[0]?.start_time,
            icon: MapPin,
            tone: 'navy',
            loading: appointments.loading,
          },
        ]}
      />

      <PortalContent>
        <PortalSectionCard
          title={t('adminNew.portal.appointments.title')}
          description={t('adminNew.portal.appointments.listOverview')}
          icon={Calendar}
          action={
            <Link href={`/${locale}/kraanafspraak`}>
              <Button variant="gold" size="sm" leftIcon={<Plus className="h-4 w-4" />}>
                {t('adminNew.portal.appointments.book')}
              </Button>
            </Link>
          }
        >
        <PortalFilterBar className="mb-4">
          {(
            [
              ['', t('adminNew.portal.appointments.filterAll')],
              ['upcoming', t('adminNew.portal.appointments.filterUpcoming')],
              ['completed', t('adminNew.portal.appointments.filterCompleted')],
              ['cancelled', t('adminNew.portal.appointments.filterCancelled')],
            ] as const
          ).map(([value, label]) => (
            <PortalFilterPill
              key={value || 'all'}
              active={statusFilter === value}
              onClick={() => setStatusFilter(value)}
            >
              {label}
            </PortalFilterPill>
          ))}
        </PortalFilterBar>

        {appointments.loading ? (
          <LoadingState label={t('adminNew.portal.appointments.loading')} variant="list" />
        ) : null}

        {!appointments.loading && appointments.error ? (
          <ErrorState message={appointments.error} onRetry={() => void appointments.refetch()} />
        ) : null}

        {!appointments.loading && !appointments.error && items.length === 0 ? (
          <EmptyState
            title={t('adminNew.portal.appointments.empty')}
            message={t('adminNew.portal.appointments.emptyMessage')}
            action={
              <Link href={`/${locale}/kraanafspraak`}>
                <Button variant="gold" size="sm" leftIcon={<Plus className="h-4 w-4" />}>
                  {t('adminNew.portal.appointments.book')}
                </Button>
              </Link>
            }
          />
        ) : null}

        {!appointments.loading && !appointments.error && items.length > 0 ? (
          <div className="space-y-5">
            {grouped.map(([dateKey, dayItems]) => (
              <div key={dateKey}>
                <PortalSectionLabel>
                  {dateKey === 'unknown'
                    ? t('adminNew.portal.appointments.unknownDate')
                    : formatDate(dateKey, dateLocale)}
                </PortalSectionLabel>
                <div className="space-y-2.5">
                  {dayItems.map((item) => {
                    const appt = item as Appointment;
                    const services = appt.service_codes?.join(', ') || t('adminNew.portal.appointments.service');
                    return (
                      <PortalInteractiveRow
                        key={appt.id}
                        icon={Calendar}
                        tone={
                          appt.status.toLowerCase().includes('cancel')
                            ? 'sand'
                            : appt.status.toLowerCase().includes('complete')
                              ? 'success'
                              : 'marine'
                        }
                        title={`${appt.start_time} – ${appt.end_time}`}
                        subtitle={services}
                        meta={t('adminNew.portal.appointments.duration', {
                          minutes: String(appt.duration_minutes),
                        })}
                        trailing={<AppointmentStatusBadge status={appt.status} />}
                        onClick={() => setSelected(appt)}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : null}
        </PortalSectionCard>
      </PortalContent>

      <Modal open={!!selected} onClose={() => setSelected(null)} size="lg">
        {selected ? (
          <>
            <PortalModalHeader
              eyebrow={t('adminNew.portal.appointments.detailEyebrow')}
              title={formatDateTime(selected.appointment_date, dateLocale)}
              subtitle={`${selected.start_time} – ${selected.end_time}`}
            />
            <PortalModalBody>
              <div className="flex flex-wrap items-center gap-2">
                <AppointmentStatusBadge status={selected.status} />
                <span className="text-xs text-navy-500">
                  {t('adminNew.portal.appointments.approval')}: {selected.approval_type}
                </span>
              </div>
              <PortalDetailGrid
                items={[
                  {
                    label: t('adminNew.portal.appointments.services'),
                    value: selected.service_codes?.join(', ') || '—',
                  },
                  {
                    label: t('adminNew.portal.appointments.durationLabel'),
                    value: t('adminNew.portal.appointments.duration', {
                      minutes: String(selected.duration_minutes),
                    }),
                  },
                  {
                    label: t('adminNew.portal.appointments.location'),
                    value: selected.location_id || '—',
                  },
                  {
                    label: t('adminNew.portal.appointments.confirmedAt'),
                    value: selected.confirmed_at
                      ? formatDateTime(selected.confirmed_at, dateLocale)
                      : '—',
                  },
                ]}
              />
              {selected.customer_notes ? (
                <div className="rounded-xl border border-navy-100 bg-sand-50/60 p-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-navy-400">
                    {t('adminNew.portal.appointments.notes')}
                  </div>
                  <p className="mt-2 text-sm text-navy-700">{selected.customer_notes}</p>
                </div>
              ) : null}
            </PortalModalBody>
            <PortalModalFooter>
              <Button variant="outline" onClick={() => setSelected(null)}>
                {t('adminNew.common.cancel')}
              </Button>
              <Link href={`/${locale}/kraanafspraak`}>
                <Button variant="gold" rightIcon={<ArrowRight className="h-4 w-4" />}>
                  {t('adminNew.portal.appointments.bookAnother')}
                </Button>
              </Link>
            </PortalModalFooter>
          </>
        ) : null}
      </Modal>
    </>
  );
}
