'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  CalendarClock,
  CheckCircle2,
  CircleCheck,
  Plus,
  Wrench,
  XCircle,
} from 'lucide-react';
import { AdminPageHeader } from '@/components/admin/AdminShell';
import { AdminConfirmModal } from '@/components/admin/AdminConfirmModal';
import { AppointmentCreateModal } from '@/components/admin/AppointmentCreateModal';
import type { SchedulerMove, SchedulerSelection } from '@/components/admin/AppointmentScheduler';
import {
  AdminContent,
  AdminSectionCard,
  AdminToolbar,
} from '@/components/admin/AdminUi';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { appointmentsService, workOrdersService } from '@/lib/services';
import { useMutation, useQuery } from '@/lib/hooks/useAsync';
import { EmptyState, ErrorState, LoadingState } from '@/components/admin/DataState';
import { useToast } from '@/components/ui/ToastProvider';
import { getApiErrorMessage } from '@/lib/api-error';
import { useIntl } from '@/i18n/IntlProvider';
import { formatDate, intlLocale } from '@/lib/format';
import {
  appointmentToEvent,
  calendarQueryRange,
  formatLocalTime,
  localDateKey,
  normalizeDateKey,
  normalizeView,
  parseDateKey,
  addDays,
  type CalendarView,
} from '@/lib/appointment-calendar';
import type { Appointment } from '@/lib/api-types';

const AppointmentScheduler = dynamic(
  () => import('@/components/admin/AppointmentScheduler').then((mod) => mod.AppointmentScheduler),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[640px] items-center justify-center rounded-xl border border-navy-100 bg-white">
        <LoadingState />
      </div>
    ),
  }
);

const WORK_ORDER_PRIORITY_STYLES: Record<string, string> = {
  urgent: 'border-rose-200 bg-rose-50 text-rose-700',
  high: 'border-amber-200 bg-amber-50 text-amber-700',
  normal: 'border-marine-200 bg-marine-50 text-marine-700',
};

const STATUS_OPTIONS = [
  'pending_manual_review',
  'confirmed',
  'planned',
  'started',
  'completed',
  'cancelled',
] as const;

function workOrderPriorityStyle(priority: unknown): string {
  return WORK_ORDER_PRIORITY_STYLES[String(priority ?? 'normal')] ?? WORK_ORDER_PRIORITY_STYLES.normal;
}

function statusLabelKey(status: string): string {
  if (status === 'pending_manual_review') return 'adminNew.appointments.statusPending';
  if (status === 'confirmed') return 'adminNew.appointments.statusConfirmed';
  if (status === 'planned') return 'adminNew.appointments.statusPlanned';
  if (status === 'started') return 'adminNew.appointments.statusStarted';
  if (status === 'completed') return 'adminNew.appointments.statusCompleted';
  if (status === 'cancelled') return 'adminNew.appointments.statusCancelled';
  return 'adminNew.appointments.columns.status';
}

function appointmentStatusTone(status: string): 'success' | 'danger' | 'warning' | 'neutral' {
  if (status === 'completed') return 'success';
  if (status === 'cancelled' || status === 'no_show') return 'danger';
  if (status === 'pending_manual_review' || status === 'requested') return 'warning';
  return 'neutral';
}

function conflictDetail(conflicts: Array<Record<string, unknown>>): string {
  const first = conflicts[0];
  if (!first) return '';
  const time = String(first.start_time ?? '').slice(0, 5);
  const label = String(first.boat_name ?? first.customer_name ?? '').trim();
  return [time, label].filter(Boolean).join(' · ');
}

export default function AppointmentsPage({ embedded = false }: { embedded?: boolean }) {
  return (
    <React.Suspense fallback={<AdminContent><div className="py-16"><LoadingState /></div></AdminContent>}>
      <AppointmentsSchedulerPage embedded={embedded} />
    </React.Suspense>
  );
}

function AppointmentsSchedulerPage({ embedded = false }: { embedded?: boolean }) {
  const { t, locale } = useIntl();
  const { push } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamsRef = React.useRef(searchParams);
  searchParamsRef.current = searchParams;
  const dateLocale = intlLocale(locale);

  const view = normalizeView(searchParams.get('view'));
  const date = normalizeDateKey(searchParams.get('date'));
  const statusParam = searchParams.get('status') ?? '';
  const status = (STATUS_OPTIONS as readonly string[]).includes(statusParam) ? statusParam : '';
  const createOpen = searchParams.get('create') === '1';
  const [draft, setDraft] = React.useState<SchedulerSelection | null>(null);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = React.useState<string | null>(null);

  const updateUrl = React.useCallback((patch: Record<string, string | null | undefined>) => {
    const next = new URLSearchParams(searchParamsRef.current.toString());
    let changed = false;
    for (const [key, value] of Object.entries(patch)) {
      const existing = next.get(key);
      if (!value) {
        if (existing !== null) {
          next.delete(key);
          changed = true;
        }
        continue;
      }
      if (existing !== value) {
        next.set(key, value);
        changed = true;
      }
    }
    if (!changed) return;
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [pathname, router]);

  const range = React.useMemo(() => calendarQueryRange(date, view), [date, view]);
  const inclusiveTo = localDateKey(addDays(parseDateKey(range.to), -1));

  const appointments = useQuery(
    ['afspraken-calendar', range.from, range.to, status],
    () => appointmentsService.calendar({
      from: range.from,
      to: range.to,
      status: status || undefined,
    })
  );
  const stats = useQuery(['afspraken-stats'], () => appointmentsService.stats());
  const workOrders = useQuery(
    ['afspraken-work-orders', range.from, inclusiveTo],
    () => workOrdersService.list({ due_from: range.from, due_to: inclusiveTo, per_page: 100 })
  );

  const rows = React.useMemo(() => appointments.data?.data ?? [], [appointments.data?.data]);
  const rowsRef = React.useRef(rows);
  rowsRef.current = rows;
  const events = React.useMemo(() => rows.map(appointmentToEvent), [rows]);
  const selected = rows.find((row) => row.id === selectedId) ?? null;
  const workOrderRows = (workOrders.data?.data ?? []) as Array<Record<string, unknown>>;

  const confirm = useMutation(appointmentsService.confirm);
  const cancel = useMutation((id: string) =>
    appointmentsService.cancel(id, t('adminNew.appointments.cancelReason'))
  );
  const updateStatus = useMutation(
    ({ id, next }: { id: string; next: string }) =>
      appointmentsService.updateStatus(id, { status: next })
  );

  const pendingCount = Number(stats.data?.pending_review ?? rows.filter((row) =>
    ['pending_manual_review', 'requested'].includes(row.status)
  ).length);
  const todayCount = Number(stats.data?.today ?? rows.filter((row) =>
    row.appointment_date?.slice(0, 10) === localDateKey(new Date())
  ).length);

  const refresh = async () => {
    await Promise.all([appointments.refetch(), stats.refetch()]);
  };

  const onConfirm = async (id: string) => {
    try {
      await confirm.mutate(id);
      await refresh();
      push({ tone: 'success', title: t('adminNew.appointments.toasts.confirmed') });
    } catch (err) {
      push({ tone: 'error', title: t('adminNew.common.operationFailed'), message: getApiErrorMessage(err) });
    }
  };

  const onCancel = async (id: string) => {
    try {
      await cancel.mutate(id);
      await refresh();
      setSelectedId(null);
      push({ tone: 'success', title: t('adminNew.appointments.toasts.cancelled') });
    } catch (err) {
      push({ tone: 'error', title: t('adminNew.common.operationFailed'), message: getApiErrorMessage(err) });
    }
  };

  const onAdvance = async (id: string, nextStatus: string) => {
    try {
      await updateStatus.mutate({ id, next: nextStatus });
      await refresh();
      push({
        tone: 'success',
        title: t('adminNew.appointments.toasts.advanced', { status: nextStatus }) ||
          t('adminNew.appointments.toasts.completed'),
      });
    } catch (err) {
      push({ tone: 'error', title: t('adminNew.common.operationFailed'), message: getApiErrorMessage(err) });
    }
  };

  const onMove = async (change: SchedulerMove) => {
    const row = rowsRef.current.find((item) => item.id === change.id);
    const startDate = localDateKey(change.start);
    const endDate = localDateKey(new Date(change.end.getTime() - 1));
    const duration = Math.round((change.end.getTime() - change.start.getTime()) / 60000);
    if (startDate !== endDate || duration < 15) {
      change.revert();
      push({ tone: 'error', title: t('adminNew.appointments.toasts.moveFailed') });
      return;
    }
    try {
      const conflicts = await appointmentsService.checkConflicts({
        date: startDate,
        start_time: formatLocalTime(change.start),
        duration_minutes: duration,
        location_id: row?.location_id ?? null,
        ignore_appointment_id: change.id,
      });
      if (conflicts.has_conflicts) {
        change.revert();
        push({
          tone: 'error',
          title: t('adminNew.appointments.toasts.conflict'),
          message: conflictDetail(conflicts.conflicts ?? []),
        });
        return;
      }
      await appointmentsService.schedule(change.id, {
        date: startDate,
        start_time: formatLocalTime(change.start),
        duration_minutes: duration,
        notify_customer: false,
        staff_note: 'Verplaatst via afsprakenplanning.',
      });
      push({ tone: 'success', title: t('adminNew.appointments.toasts.moved') });
      await refresh();
    } catch (err) {
      change.revert();
      push({
        tone: 'error',
        title: t('adminNew.appointments.toasts.moveFailed'),
        message: getApiErrorMessage(err),
      });
    }
  };

  const openCreate = (selection?: SchedulerSelection) => {
    setDraft(selection ?? {
      date,
      startTime: '09:00',
      endTime: '10:00',
      durationMinutes: 60,
    });
    updateUrl({ create: '1' });
  };

  const onViewDateChange = React.useCallback((next: { view: CalendarView; date: string }) => {
    updateUrl({ view: next.view, date: next.date });
  }, [updateUrl]);

  React.useEffect(() => {
    const currentView = searchParams.get('view');
    const currentDate = searchParams.get('date');
    if (currentView === view && currentDate === date) return;
    updateUrl({ view, date });
  }, [date, searchParams, updateUrl, view]);

  return (
    <>
      {embedded ? null : (
      <AdminPageHeader
        title={t('adminNew.appointments.title')}
        subtitle={t('adminNew.appointments.subtitle')}
        stats={[
          {
            label: t('adminNew.appointments.total', { count: rows.length }),
            value: rows.length,
            icon: CalendarClock,
            tone: 'marine',
            loading: appointments.loading && rows.length === 0,
          },
          {
            label: t('adminNew.appointments.statusPending'),
            value: pendingCount,
            icon: CheckCircle2,
            tone: pendingCount > 0 ? 'warning' : 'success',
            loading: stats.loading && stats.data == null,
          },
          {
            label: t('adminNew.appointments.today'),
            value: todayCount,
            icon: CircleCheck,
            tone: 'gold',
            loading: stats.loading && stats.data == null,
          },
        ]}
      />
      )}
      <AdminContent>
        <AdminSectionCard
          title={t('adminNew.appointments.title')}
          description={t('adminNew.appointments.listOverview')}
          icon={CalendarClock}
        >
          <AdminToolbar className="mb-4 border-0 bg-transparent p-0 shadow-none">
            <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
              <label className="flex items-center gap-2 text-sm font-medium text-navy-700">
                <span className="sr-only">{t('adminNew.appointments.columns.date')}</span>
                <input
                  type="date"
                  className="input-base w-full sm:w-auto"
                  value={date}
                  onChange={(event) => {
                    if (event.target.value) updateUrl({ date: event.target.value });
                  }}
                />
              </label>
              <label className="sr-only" htmlFor="appointment-status-filter">
                {t('adminNew.appointments.columns.status')}
              </label>
              <select
                id="appointment-status-filter"
                className="input-base w-full min-w-0 sm:w-auto sm:min-w-[180px]"
                value={status}
                onChange={(event) => updateUrl({ status: event.target.value || null })}
              >
                <option value="">{t('adminNew.appointments.allStatuses')}</option>
                {STATUS_OPTIONS.map((option) => (
                  <option key={option} value={option}>{t(statusLabelKey(option))}</option>
                ))}
              </select>
            </div>
            <Button
              variant="gold"
              className="w-full shrink-0 sm:ml-auto sm:w-auto"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => openCreate()}
            >
              {t('planning.createAppointment')}
            </Button>
          </AdminToolbar>

          {appointments.error ? (
            <div className="mb-3">
              <ErrorState message={appointments.error} onRetry={() => void appointments.refetch()} />
            </div>
          ) : null}

          <div className="relative">
            {appointments.loading && rows.length === 0 ? (
              <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-white/70">
                <LoadingState label={t('adminNew.appointments.loading')} />
              </div>
            ) : null}
            <AppointmentScheduler
              events={events}
              view={view}
              date={date}
              onViewDateChange={onViewDateChange}
              onMove={(change) => void onMove(change)}
              onSelect={openCreate}
              onEventClick={setSelectedId}
            />
          </div>
        </AdminSectionCard>

        <AdminSectionCard
          title={t('adminNew.workOrders.overlay.title')}
          description={t('adminNew.workOrders.overlay.toggle')}
          icon={Wrench}
        >
          {workOrders.loading ? (
            <LoadingState label={t('adminNew.common.loading')} />
          ) : workOrders.error ? (
            <ErrorState message={workOrders.error} onRetry={() => void workOrders.refetch()} />
          ) : workOrderRows.filter((workOrder) => workOrder.due_date).length === 0 ? (
            <EmptyState
              title={t('adminNew.workOrders.overlay.emptyTitle')}
              message={t('adminNew.workOrders.overlay.emptyMessage')}
            />
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {workOrderRows
                .filter((workOrder) => workOrder.due_date)
                .sort((a, b) => String(a.due_date).localeCompare(String(b.due_date)))
                .map((workOrder) => (
                  <li key={String(workOrder.id)}>
                    <Link
                      href={`/${locale}/admin/werkorders/${workOrder.id}`}
                      className={`flex h-full items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm transition hover:brightness-95 ${workOrderPriorityStyle(workOrder.priority)}`}
                    >
                      <span className="min-w-0 truncate font-medium">
                        #{String(workOrder.number ?? workOrder.id)} ·{' '}
                        {String(
                          workOrder.boat_name ??
                            (workOrder.boat as { name?: string } | undefined)?.name ??
                            workOrder.type ??
                            '—'
                        )}
                      </span>
                      <span className="shrink-0 text-xs font-semibold">
                        {formatDate(String(workOrder.due_date), dateLocale)}
                      </span>
                    </Link>
                  </li>
                ))}
            </ul>
          )}
        </AdminSectionCard>
      </AdminContent>

      <AppointmentCreateModal
        open={createOpen}
        defaultDate={draft?.date || date}
        defaultStart={draft?.startTime || '09:00'}
        defaultDuration={draft?.durationMinutes || 60}
        onClose={() => updateUrl({ create: null })}
        onCreated={refresh}
      />

      <AppointmentDetailModal
        appointment={selected}
        dateLocale={dateLocale}
        onClose={() => setSelectedId(null)}
        onConfirm={onConfirm}
        onAdvance={onAdvance}
        onCancel={setCancelTarget}
      />

      <AdminConfirmModal
        open={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={async () => {
          if (!cancelTarget) return;
          await onCancel(cancelTarget);
          setCancelTarget(null);
        }}
        title={t('adminNew.appointments.cancel')}
        message={t('adminNew.appointments.confirmCancel')}
        confirmLabel={t('adminNew.appointments.cancel')}
        cancelLabel={t('adminNew.common.cancel')}
        variant="danger"
        icon={XCircle}
        loading={cancel.loading}
      />
    </>
  );
}

function AppointmentDetailModal({
  appointment,
  dateLocale,
  onClose,
  onConfirm,
  onAdvance,
  onCancel,
}: {
  appointment: Appointment | null;
  dateLocale: string;
  onClose: () => void;
  onConfirm: (id: string) => void;
  onAdvance: (id: string, next: string) => void;
  onCancel: (id: string) => void;
}) {
  const { t } = useIntl();
  const isPending = appointment ? ['pending_manual_review', 'requested'].includes(appointment.status) : false;
  const nextStep = appointment?.next_status ?? null;
  const canCancel = appointment ? !['completed', 'cancelled', 'no_show'].includes(appointment.status) : false;

  return (
    <Modal open={!!appointment} onClose={onClose} size="md" className="p-6">
      {appointment ? (
        <>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-display text-xl text-navy-900">{appointment.boat?.name ?? '—'}</h3>
              <p className="mt-1 text-sm text-navy-500">{appointment.customer?.name ?? '—'}</p>
            </div>
            <Badge tone={appointmentStatusTone(appointment.status)}>
              {appointment.status_label ?? t(statusLabelKey(appointment.status))}
            </Badge>
          </div>
          <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-navy-400">{t('adminNew.appointments.columns.date')}</dt>
              <dd className="font-medium text-navy-900">
                {formatDate(appointment.appointment_date?.slice(0, 10), dateLocale)}
              </dd>
            </div>
            <div>
              <dt className="text-navy-400">{t('adminNew.appointments.columns.time')}</dt>
              <dd className="font-medium text-navy-900">
                {(appointment.start_time ?? '').slice(0, 5)}–{(appointment.end_time ?? '').slice(0, 5)}
              </dd>
            </div>
            <div className="col-span-2">
              <dt className="text-navy-400">{t('adminNew.appointments.columns.services')}</dt>
              <dd className="font-medium text-navy-900">{appointment.service_codes?.join(', ') || '—'}</dd>
            </div>
            {appointment.assigned_to?.name ? (
              <div className="col-span-2">
                <dt className="text-navy-400">{t('planning.fieldAssignee')}</dt>
                <dd className="font-medium text-navy-900">{appointment.assigned_to.name}</dd>
              </div>
            ) : null}
          </dl>
          <div className="mt-6 flex flex-wrap justify-end gap-2">
            {isPending ? (
              <Button size="sm" variant="secondary" leftIcon={<CheckCircle2 className="h-3.5 w-3.5" />} onClick={() => onConfirm(appointment.id)}>
                {t('adminNew.appointments.confirm')}
              </Button>
            ) : nextStep ? (
              <Button size="sm" variant="secondary" leftIcon={<CircleCheck className="h-3.5 w-3.5" />} onClick={() => onAdvance(appointment.id, nextStep)}>
                {nextStep.replace(/_/g, ' ')}
              </Button>
            ) : null}
            {canCancel ? (
              <Button size="sm" variant="ghost" leftIcon={<XCircle className="h-3.5 w-3.5" />} onClick={() => onCancel(appointment.id)}>
                {t('adminNew.appointments.cancel')}
              </Button>
            ) : null}
          </div>
        </>
      ) : null}
    </Modal>
  );
}
