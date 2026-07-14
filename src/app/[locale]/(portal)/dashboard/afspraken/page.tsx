'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Calendar,
  CalendarClock,
  Clock,
  Download,
  MapPin,
  Plus,
  Ship,
  XCircle,
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
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { LoadingState, ErrorState, EmptyState } from '@/components/admin/DataState';
import { useQuery, useMutation } from '@/lib/hooks/useAsync';
import { portalService } from '@/lib/services';
import type { Appointment } from '@/lib/api-types';
import { useIntl } from '@/i18n/IntlProvider';
import { formatDate, formatDateTime } from '@/lib/format';
import { useToast } from '@/components/ui/ToastProvider';
import { getApiErrorMessage } from '@/lib/api-error';

type StatusFilter = '' | 'upcoming' | 'completed' | 'cancelled';

function isUpcoming(a: Appointment): boolean {
  const s = a.status.toLowerCase();
  if (s.includes('complete') || s.includes('cancel') || s.includes('no_show')) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(`${(a.appointment_date || '').slice(0, 10)}T00:00:00`);
  return d >= today;
}

function isPast(a: Appointment): boolean {
  return !isUpcoming(a);
}

export default function PortalAppointmentsPage() {
  const { t, locale } = useIntl();
  const { push } = useToast();
  const dateLocale = locale === 'en' ? 'en-GB' : locale === 'de' ? 'de-DE' : 'nl-NL';
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>('');
  const [selected, setSelected] = React.useState<Appointment | null>(null);
  const [downloadingId, setDownloadingId] = React.useState<string | null>(null);

  // Cancel + reschedule flows (Trello #99).
  const [cancelFor, setCancelFor] = React.useState<Appointment | null>(null);
  const [cancelReason, setCancelReason] = React.useState('');
  const [rescheduleFor, setRescheduleFor] = React.useState<Appointment | null>(null);
  const [prefDate, setPrefDate] = React.useState('');
  const [prefTime, setPrefTime] = React.useState('');
  const [reschedReason, setReschedReason] = React.useState('');

  const appointments = useQuery([statusFilter], () =>
    portalService.appointments({
      status: statusFilter || undefined,
      per_page: 50,
    })
  );

  const cancelMutation = useMutation((id: string, reason?: string) =>
    portalService.cancelAppointment(id, reason)
  );
  const reschedMutation = useMutation(
    (id: string, payload: { preferred_date: string; preferred_time: string; reason: string }) =>
      portalService.requestReschedule(id, payload)
  );

  const closeReschedule = () => {
    setRescheduleFor(null);
    setPrefDate('');
    setPrefTime('');
    setReschedReason('');
  };

  const onCancel = async () => {
    if (!cancelFor) return;
    try {
      await cancelMutation.mutate(cancelFor.id, cancelReason || undefined);
      push({ tone: 'success', title: t('adminNew.portal.appointments.cancelledToast') });
      setCancelFor(null);
      setCancelReason('');
      setSelected(null);
      await appointments.refetch();
    } catch (err) {
      push({
        tone: 'error',
        title: t('adminNew.portal.appointments.actionFailed'),
        message: getApiErrorMessage(err),
      });
    }
  };

  const onReschedule = async () => {
    if (!rescheduleFor) return;
    try {
      await reschedMutation.mutate(rescheduleFor.id, {
        preferred_date: prefDate,
        preferred_time: prefTime,
        reason: reschedReason,
      });
      push({ tone: 'success', title: t('adminNew.portal.appointments.rescheduleRequestedToast') });
      closeReschedule();
      setSelected(null);
      await appointments.refetch();
    } catch (err) {
      push({
        tone: 'error',
        title: t('adminNew.portal.appointments.actionFailed'),
        message: getApiErrorMessage(err),
      });
    }
  };

  const downloadConfirmation = async (appt: Appointment) => {
    setDownloadingId(appt.id);
    try {
      const blob = await portalService.appointmentConfirmationPdf(appt.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bevestiging-afspraak-${(appt.appointment_date || '').slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      push({ tone: 'error', title: 'Download mislukt', message: getApiErrorMessage(err) });
    } finally {
      setDownloadingId(null);
    }
  };

  const items = appointments.data?.data ?? [];
  const upcomingItems = items.filter(isUpcoming);
  const pastItems = items.filter(isPast);
  const upcomingCount = upcomingItems.length;
  const completed = items.filter((a) => a.status.toLowerCase().includes('complete')).length;
  const upcomingGrouped = groupByDateKey(upcomingItems, 'appointment_date');
  const pastGrouped = groupByDateKey(pastItems, 'appointment_date');

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
            value: upcomingCount,
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
          <div className="space-y-8">
            {/* Upcoming appointments */}
            {upcomingGrouped.length > 0 ? (
              <div>
                <div className="mb-3 text-sm font-semibold text-navy-700">Aankomende afspraken</div>
                <div className="space-y-5">
                  {upcomingGrouped.map(([dateKey, dayItems]) => (
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
                          const loc = appt.location;
                          return (
                            <PortalInteractiveRow
                              key={appt.id}
                              icon={Calendar}
                              tone="marine"
                              title={`${(appt.start_time || '').slice(0, 5)} – ${(appt.end_time || '').slice(0, 5)}`}
                              subtitle={services}
                              meta={loc?.code ? `Dok: ${loc.code}` : t('adminNew.portal.appointments.duration', { minutes: String(appt.duration_minutes) })}
                              trailing={<AppointmentStatusBadge status={appt.status} statusGeneric={appt.status_generic} />}
                              onClick={() => setSelected(appt)}
                            />
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-navy-100 px-4 py-6 text-center text-sm text-navy-400">
                Geen aankomende afspraken
              </div>
            )}

            {/* Past appointments */}
            {pastGrouped.length > 0 ? (
              <div>
                <div className="mb-3 text-sm font-semibold text-navy-500">Afgelopen afspraken</div>
                <div className="space-y-5">
                  {pastGrouped.map(([dateKey, dayItems]) => (
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
                                appt.status.toLowerCase().includes('cancel') ? 'sand'
                                : appt.status.toLowerCase().includes('complete') ? 'success'
                                : 'sand'
                              }
                              title={`${(appt.start_time || '').slice(0, 5)} – ${(appt.end_time || '').slice(0, 5)}`}
                              subtitle={services}
                              meta={t('adminNew.portal.appointments.duration', { minutes: String(appt.duration_minutes) })}
                              trailing={<AppointmentStatusBadge status={appt.status} statusGeneric={appt.status_generic} />}
                              onClick={() => setSelected(appt)}
                            />
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
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
                <AppointmentStatusBadge status={selected.status} statusGeneric={selected.status_generic} />
                {selected.approval_type ? (
                  <span className="text-xs text-navy-500">
                    {t('adminNew.portal.appointments.approval')}: {selected.approval_type}
                  </span>
                ) : null}
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
                    value: selected.location?.code
                      ? `${selected.location.code}${selected.location.name ? ` – ${selected.location.name}` : ''}`
                      : (selected.location_id || '—'),
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
              {selected.public_notes ? (
                <div className="rounded-xl border border-marine-200 bg-marine-50/40 p-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-marine-600">
                    Instructies
                  </div>
                  <p className="mt-2 text-sm text-marine-800">{selected.public_notes}</p>
                </div>
              ) : null}
            </PortalModalBody>
            <PortalModalFooter>
              <Button variant="outline" onClick={() => setSelected(null)}>
                {t('adminNew.common.cancel')}
              </Button>
              {/* Download confirmation PDF */}
              {!selected.status.toLowerCase().includes('cancel') ? (
                <Button
                  variant="outline"
                  leftIcon={<Download className="h-4 w-4" />}
                  disabled={downloadingId === selected.id}
                  onClick={() => void downloadConfirmation(selected)}
                >
                  {downloadingId === selected.id ? 'Downloaden…' : 'Bevestiging downloaden'}
                </Button>
              ) : null}
              {selected.can_cancel ? (
                <>
                  <Button
                    variant="outline"
                    leftIcon={<CalendarClock className="h-4 w-4" />}
                    onClick={() => {
                      setRescheduleFor(selected);
                      setPrefDate((selected.appointment_date || '').slice(0, 10));
                      setPrefTime((selected.start_time || '').slice(0, 5));
                    }}
                  >
                    {t('adminNew.portal.appointments.requestReschedule')}
                  </Button>
                  <Button
                    variant="danger"
                    leftIcon={<XCircle className="h-4 w-4" />}
                    onClick={() => {
                      setCancelFor(selected);
                      setCancelReason('');
                    }}
                  >
                    {t('adminNew.portal.appointments.cancelAppointment')}
                  </Button>
                </>
              ) : (
                <Link href={`/${locale}/kraanafspraak`}>
                  <Button variant="gold" rightIcon={<ArrowRight className="h-4 w-4" />}>
                    {t('adminNew.portal.appointments.bookAnother')}
                  </Button>
                </Link>
              )}
            </PortalModalFooter>
          </>
        ) : null}
      </Modal>

      {/* Cancel confirmation with optional reason */}
      <ConfirmModal
        open={!!cancelFor}
        onClose={() => {
          setCancelFor(null);
          setCancelReason('');
        }}
        onConfirm={onCancel}
        title={t('adminNew.portal.appointments.cancelAppointment')}
        message={t('adminNew.portal.appointments.cancelConfirm')}
        confirmLabel={t('adminNew.portal.appointments.cancelAppointment')}
        variant="danger"
        loading={cancelMutation.loading}
        inputLabel={t('adminNew.portal.appointments.cancelReasonLabel')}
        inputPlaceholder={t('adminNew.portal.appointments.cancelReasonPlaceholder')}
        inputValue={cancelReason}
        onInputChange={setCancelReason}
      />

      {/* Reschedule request form */}
      <Modal open={!!rescheduleFor} onClose={closeReschedule} size="md" className="p-6">
        {rescheduleFor ? (
          <div>
            <h3 className="font-display text-xl text-navy-900">
              {t('adminNew.portal.appointments.requestReschedule')}
            </h3>
            <p className="mt-1 text-sm text-navy-500">
              {t('adminNew.portal.appointments.rescheduleHint')}
            </p>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Input
                label={t('adminNew.portal.appointments.preferredDate')}
                type="date"
                value={prefDate}
                onChange={(e) => setPrefDate(e.target.value)}
              />
              <Input
                label={t('adminNew.portal.appointments.preferredTime')}
                type="time"
                value={prefTime}
                onChange={(e) => setPrefTime(e.target.value)}
              />
            </div>

            <label className="mt-4 block text-sm">
              <span className="mb-1 block font-medium text-navy-700">
                {t('adminNew.portal.appointments.rescheduleReason')}
              </span>
              <textarea
                className="input-base min-h-24 w-full"
                value={reschedReason}
                onChange={(e) => setReschedReason(e.target.value)}
                placeholder={t('adminNew.portal.appointments.rescheduleReasonPlaceholder')}
              />
            </label>

            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" onClick={closeReschedule}>
                {t('adminNew.common.cancel')}
              </Button>
              <Button
                variant="gold"
                onClick={() => void onReschedule()}
                disabled={!prefDate || reschedMutation.loading}
              >
                {t('adminNew.portal.appointments.sendRequest')}
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </>
  );
}
