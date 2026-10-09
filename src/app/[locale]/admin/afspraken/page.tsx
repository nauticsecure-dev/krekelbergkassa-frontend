'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  CalendarClock,
  CalendarDays,
  CalendarRange,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  Clock3,
  Plus,
  Wrench,
  XCircle,
} from 'lucide-react';
import { AdminPageHeader } from '@/components/admin/AdminShell';
import { AdminConfirmModal } from '@/components/admin/AdminConfirmModal';
import {
  AdminContent,
  AdminSectionCard,
  AdminToolbar,
} from '@/components/admin/AdminUi';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { appointmentsService, workOrdersService } from '@/lib/services';
import { useMutation, useQuery } from '@/lib/hooks/useAsync';
import { EmptyState, ErrorState, LoadingState } from '@/components/admin/DataState';
import { useToast } from '@/components/ui/ToastProvider';
import { getApiErrorMessage } from '@/lib/api-error';
import { useIntl } from '@/i18n/IntlProvider';
import { formatDate } from '@/lib/format';
import type { Appointment } from '@/lib/api-types';

type CalendarView = 'day' | 'week' | 'month';

const CALENDAR_VIEWS: { id: CalendarView; labelKey: string; icon: typeof CalendarDays }[] = [
  { id: 'day', labelKey: 'planning.viewDay', icon: CalendarDays },
  { id: 'week', labelKey: 'planning.viewWeek', icon: CalendarRange },
  { id: 'month', labelKey: 'planning.viewMonth', icon: CalendarClock },
];

const WORK_ORDER_PRIORITY_STYLES: Record<string, string> = {
  urgent: 'border-rose-200 bg-rose-50 text-rose-700',
  high: 'border-amber-200 bg-amber-50 text-amber-700',
  normal: 'border-marine-200 bg-marine-50 text-marine-700',
};

function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function startOfWeek(date: Date): Date {
  const start = new Date(date);
  const offset = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - offset);
  start.setHours(0, 0, 0, 0);
  return start;
}

function getCalendarRange(date: Date, view: CalendarView): { from: Date; to: Date } {
  if (view === 'day') {
    const day = new Date(date);
    day.setHours(0, 0, 0, 0);
    return { from: day, to: day };
  }

  if (view === 'week') {
    const from = startOfWeek(date);
    const to = new Date(from);
    to.setDate(to.getDate() + 6);
    return { from, to };
  }

  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const from = startOfWeek(first);
  const to = new Date(from);
  to.setDate(to.getDate() + 41);
  return { from, to };
}

function addDays(date: Date, count: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + count);
  return next;
}

function workOrderPriorityStyle(priority: unknown): string {
  return WORK_ORDER_PRIORITY_STYLES[String(priority ?? 'normal')] ?? WORK_ORDER_PRIORITY_STYLES.normal;
}

function appointmentStatusTone(status: string): 'success' | 'danger' | 'warning' | 'neutral' {
  if (status === 'completed') return 'success';
  if (status === 'cancelled' || status === 'no_show') return 'danger';
  if (status === 'pending_manual_review' || status === 'requested') return 'warning';
  return 'neutral';
}

export default function AppointmentsPage() {
  const { t, locale } = useIntl();
  const { push } = useToast();
  const [status, setStatus] = React.useState('');
  const [view, setView] = React.useState<CalendarView>('week');
  const [selectedDate, setSelectedDate] = React.useState(() => new Date());
  const [cancelTarget, setCancelTarget] = React.useState<string | null>(null);
  const dateLocale = locale === 'en' ? 'en-GB' : locale === 'de' ? 'de-DE' : 'nl-NL';

  const range = React.useMemo(
    () => getCalendarRange(selectedDate, view),
    [selectedDate, view]
  );
  const dateFrom = localDateKey(range.from);
  const dateTo = localDateKey(range.to);

  const appointments = useQuery([status, dateFrom, dateTo], () =>
    appointmentsService.list({
      status: status || undefined,
      date_from: dateFrom,
      date_to: dateTo,
      page: 1,
      per_page: 200,
    })
  );

  const workOrders = useQuery(
    ['afspraken-work-orders', dateFrom, dateTo],
    () => workOrdersService.list({ due_from: dateFrom, due_to: dateTo, per_page: 100 })
  );
  const workOrderRows = (workOrders.data?.data ?? []) as Array<Record<string, unknown>>;

  const confirm = useMutation(appointmentsService.confirm);
  const cancel = useMutation((id: string) =>
    appointmentsService.cancel(id, t('adminNew.appointments.cancelReason'))
  );
  const updateStatus = useMutation(
    ({ id, next }: { id: string; next: string }) =>
      appointmentsService.updateStatus(id, { status: next })
  );

  const rows = React.useMemo(() => appointments.data?.data ?? [], [appointments.data?.data]);
  const appointmentsByDate = React.useMemo(() => {
    const grouped: Record<string, Appointment[]> = {};
    for (const appointment of rows) {
      const key = appointment.appointment_date?.slice(0, 10);
      if (key) (grouped[key] ??= []).push(appointment);
    }
    Object.values(grouped).forEach((items) =>
      items.sort((a, b) => (a.start_time ?? '').localeCompare(b.start_time ?? ''))
    );
    return grouped;
  }, [rows]);

  const pendingCount = rows.filter((row) =>
    ['pending_manual_review', 'requested'].includes(row.status)
  ).length;
  const todayKey = localDateKey(new Date());
  const todayCount = rows.filter((row) =>
    row.appointment_date?.slice(0, 10) === todayKey
  ).length;

  const onConfirm = async (id: string) => {
    try {
      await confirm.mutate(id);
      await appointments.refetch();
      push({ tone: 'success', title: t('adminNew.appointments.toasts.confirmed') });
    } catch (err) {
      push({
        tone: 'error',
        title: t('adminNew.common.operationFailed'),
        message: getApiErrorMessage(err),
      });
    }
  };

  const onCancel = async (id: string) => {
    try {
      await cancel.mutate(id);
      await appointments.refetch();
      push({ tone: 'success', title: t('adminNew.appointments.toasts.cancelled') });
    } catch (err) {
      push({
        tone: 'error',
        title: t('adminNew.common.operationFailed'),
        message: getApiErrorMessage(err),
      });
    }
  };

  const onAdvance = async (id: string, nextStatus: string) => {
    try {
      await updateStatus.mutate({ id, next: nextStatus });
      await appointments.refetch();
      push({
        tone: 'success',
        title: t('adminNew.appointments.toasts.advanced', { status: nextStatus }) ||
          t('adminNew.appointments.toasts.completed'),
      });
    } catch (err) {
      push({
        tone: 'error',
        title: t('adminNew.common.operationFailed'),
        message: getApiErrorMessage(err),
      });
    }
  };

  const move = (direction: number) => {
    const next = new Date(selectedDate);
    if (view === 'day') next.setDate(next.getDate() + direction);
    else if (view === 'week') next.setDate(next.getDate() + direction * 7);
    else next.setMonth(next.getMonth() + direction);
    setSelectedDate(next);
  };

  const goToToday = () => setSelectedDate(new Date());

  const heading = view === 'day'
    ? selectedDate.toLocaleDateString(dateLocale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : view === 'month'
      ? selectedDate.toLocaleDateString(dateLocale, { month: 'long', year: 'numeric' })
      : `${range.from.toLocaleDateString(dateLocale, { day: 'numeric', month: 'short' })} – ${range.to.toLocaleDateString(dateLocale, { day: 'numeric', month: 'short', year: 'numeric' })}`;

  const calendarDays = React.useMemo(
    () => Array.from({ length: 42 }, (_, index) => addDays(range.from, index)),
    [range.from]
  );
  const weekDays = React.useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(range.from, index)),
    [range.from]
  );

  return (
    <>
      <AdminPageHeader
        title={t('adminNew.appointments.title')}
        subtitle={t('adminNew.appointments.subtitle')}
        stats={[
          {
            label: t('adminNew.appointments.total', { count: appointments.data?.meta?.total ?? rows.length }),
            value: appointments.data?.meta?.total ?? rows.length,
            icon: CalendarClock,
            tone: 'marine',
            loading: appointments.loading,
          },
          {
            label: t('adminNew.appointments.statusPending'),
            value: pendingCount,
            icon: CheckCircle2,
            tone: pendingCount > 0 ? 'warning' : 'success',
            loading: appointments.loading,
          },
          {
            label: t('adminNew.appointments.today'),
            value: todayCount,
            icon: CircleCheck,
            tone: 'gold',
            loading: appointments.loading,
          },
        ]}
      />
      <AdminContent>
        <AdminSectionCard
          title={t('adminNew.appointments.title')}
          description={t('adminNew.appointments.listOverview')}
          icon={CalendarClock}
        >
          <AdminToolbar className="mb-4 border-0 bg-transparent p-0 shadow-none">
            <div className="flex flex-wrap items-center gap-2">
              {CALENDAR_VIEWS.map(({ id, labelKey, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={view === id}
                  onClick={() => setView(id)}
                  className={`inline-flex h-10 items-center gap-2 rounded-lg border px-3 text-sm font-semibold transition ${
                    view === id
                      ? 'border-marine-700 bg-marine-700 text-white'
                      : 'border-navy-200 bg-white text-navy-700 hover:bg-sand-50'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {t(labelKey)}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="sr-only" htmlFor="appointment-status-filter">
                {t('adminNew.appointments.columns.status')}
              </label>
              <select
                id="appointment-status-filter"
                className="input-base min-w-[180px]"
                value={status}
                onChange={(event) => setStatus(event.target.value)}
              >
                <option value="">{t('adminNew.appointments.allStatuses')}</option>
                <option value="pending_manual_review">{t('adminNew.appointments.statusPending')}</option>
                <option value="confirmed">{t('adminNew.appointments.statusConfirmed')}</option>
                <option value="started">{t('adminNew.appointments.statusStarted')}</option>
                <option value="completed">{t('adminNew.appointments.statusCompleted')}</option>
                <option value="cancelled">{t('adminNew.appointments.statusCancelled')}</option>
              </select>
              <Link href={`/${locale}/planning?create=1`}>
                <Button variant="gold" leftIcon={<Plus className="h-4 w-4" />}>
                  {t('planning.createAppointment')}
                </Button>
              </Link>
            </div>
          </AdminToolbar>

          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-navy-100 bg-white p-3">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={goToToday}
              >
                {t('planning.today')}
              </Button>
              <button
                type="button"
                onClick={() => move(-1)}
                aria-label={t('planning.prevWeek')}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-navy-200 text-navy-700 hover:bg-sand-50"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => move(1)}
                aria-label={t('planning.nextWeek')}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-navy-200 text-navy-700 hover:bg-sand-50"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <h2 className="min-w-[200px] text-center text-lg font-semibold capitalize text-navy-900">
              {heading}
            </h2>
            <label className="flex items-center gap-2 text-sm font-medium text-navy-700">
              <span>{t('adminNew.appointments.columns.date')}</span>
              <input
                type="date"
                className="input-base w-auto"
                value={localDateKey(selectedDate)}
                onChange={(event) => {
                  if (event.target.value) {
                    const [year, month, day] = event.target.value.split('-').map(Number);
                    setSelectedDate(new Date(year, month - 1, day));
                  }
                }}
              />
            </label>
          </div>

          {appointments.loading ? (
            <div className="py-12"><LoadingState label={t('adminNew.appointments.loading')} /></div>
          ) : appointments.error ? (
            <ErrorState message={appointments.error} onRetry={() => void appointments.refetch()} />
          ) : rows.length === 0 ? (
            <EmptyState
              title={t('adminNew.appointments.emptyTitle')}
              message={t('adminNew.appointments.emptyMessage')}
            />
          ) : view === 'month' ? (
            <div className="overflow-x-auto rounded-xl border border-navy-100">
              <div className="min-w-[840px]">
                <div className="grid grid-cols-7 border-b border-navy-100 bg-navy-50">
                  {weekDays.map((date) => (
                    <div key={date.getDay()} className="px-3 py-2 text-xs font-bold uppercase tracking-wide text-navy-500">
                      {date.toLocaleDateString(dateLocale, { weekday: 'short' })}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7">
                  {calendarDays.map((date) => {
                    const key = localDateKey(date);
                    const dayAppointments = appointmentsByDate[key] ?? [];
                    const isCurrentMonth = date.getMonth() === selectedDate.getMonth();
                    const isToday = key === todayKey;
                    return (
                      <div
                        key={key}
                        className={`min-h-[132px] border-b border-r border-navy-100 p-2 align-top transition hover:bg-marine-50 ${
                          isCurrentMonth ? 'bg-white' : 'bg-sand-50/60 text-navy-400'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedDate(date);
                            setView('day');
                          }}
                          aria-label={`${date.toLocaleDateString(dateLocale, { dateStyle: 'full' })} · ${t('adminNew.appointments.total', { count: dayAppointments.length })}`}
                          className={`mb-2 inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold hover:bg-marine-100 ${
                            isToday ? 'bg-marine-700 text-white hover:bg-marine-800' : isCurrentMonth ? 'text-navy-800' : 'text-navy-400'
                          }`}
                        >
                          {date.getDate()}
                        </button>
                        <div className="space-y-1">
                          {dayAppointments.slice(0, 3).map((appointment) => (
                            <AppointmentCalendarCard
                              key={appointment.id}
                              row={appointment}
                              compact
                              t={t}
                              onConfirm={onConfirm}
                              onCancel={setCancelTarget}
                              onAdvance={onAdvance}
                            />
                          ))}
                          {dayAppointments.length > 3 ? (
                            <p className="px-1 text-[11px] font-semibold text-marine-700">
                              +{dayAppointments.length - 3}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : view === 'week' ? (
            <div className="overflow-x-auto rounded-xl border border-navy-100">
              <div className="grid min-w-[1050px] grid-cols-7 divide-x divide-navy-100">
                {weekDays.map((date) => {
                  const key = localDateKey(date);
                  const dayAppointments = appointmentsByDate[key] ?? [];
                  return (
                    <section key={key} className="min-h-[560px] bg-white">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDate(date);
                          setView('day');
                        }}
                        className={`sticky top-0 z-10 flex w-full items-center justify-between border-b border-navy-100 px-3 py-3 text-left ${
                          key === todayKey ? 'bg-marine-50' : 'bg-white'
                        }`}
                      >
                        <span className="text-sm font-semibold text-navy-800">
                          {date.toLocaleDateString(dateLocale, { weekday: 'short' })}
                        </span>
                        <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                          key === todayKey ? 'bg-marine-700 text-white' : 'text-navy-700'
                        }`}>
                          {date.getDate()}
                        </span>
                      </button>
                      <div className="space-y-2 p-2">
                        {dayAppointments.length === 0 ? (
                          <p className="py-5 text-center text-xs text-navy-400">—</p>
                        ) : dayAppointments.map((appointment) => (
                          <AppointmentCalendarCard
                            key={appointment.id}
                            row={appointment}
                            t={t}
                            onConfirm={onConfirm}
                            onCancel={setCancelTarget}
                            onAdvance={onAdvance}
                          />
                        ))}
                      </div>
                    </section>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-navy-100 bg-white">
              {appointmentsByDate[localDateKey(selectedDate)]?.length ? (
                <ol className="divide-y divide-navy-100">
                  {appointmentsByDate[localDateKey(selectedDate)].map((appointment) => (
                    <li key={appointment.id} className="grid gap-3 p-4 sm:grid-cols-[90px_1fr]">
                      <div className="flex items-start gap-2 pt-1 text-sm font-bold text-marine-800">
                        <Clock3 className="mt-0.5 h-4 w-4 shrink-0" />
                        {(appointment.start_time ?? '').slice(0, 5)}
                      </div>
                      <AppointmentCalendarCard
                        row={appointment}
                        t={t}
                        onConfirm={onConfirm}
                        onCancel={setCancelTarget}
                        onAdvance={onAdvance}
                      />
                    </li>
                  ))}
                </ol>
              ) : (
                <EmptyState
                  title={t('adminNew.appointments.emptyTitle')}
                  message={t('adminNew.appointments.emptyMessage')}
                />
              )}
            </div>
          )}
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

function AppointmentCalendarCard({
  row,
  compact = false,
  t,
  onConfirm,
  onCancel,
  onAdvance,
}: {
  row: Appointment;
  compact?: boolean;
  t: (key: string, opts?: Record<string, string | number>) => string;
  onConfirm: (id: string) => void;
  onCancel: (id: string) => void;
  onAdvance: (id: string, next: string) => void;
}) {
  const isPending = ['pending_manual_review', 'requested'].includes(row.status);
  const nextStep = row.next_status ?? null;
  const canCancel = !['completed', 'cancelled', 'no_show'].includes(row.status);

  return (
    <article className={`rounded-lg border border-navy-100 bg-white shadow-sm ${compact ? 'p-1.5' : 'p-3'}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className={`font-semibold text-navy-900 ${compact ? 'truncate text-[11px]' : 'text-sm'}`}>
            {!compact ? <span className="mr-1 text-marine-700">{(row.start_time ?? '').slice(0, 5)}</span> : null}
            {row.boat?.name ?? '—'}
          </p>
          {!compact && row.customer?.name ? (
            <p className="mt-0.5 truncate text-xs text-navy-500">{row.customer.name}</p>
          ) : null}
          <p className={`mt-1 text-navy-500 ${compact ? 'truncate text-[10px]' : 'text-xs'}`}>
            {row.service_codes?.join(', ') || '—'}
            {!compact && row.end_time ? ` · ${row.end_time.slice(0, 5)}` : ''}
          </p>
        </div>
        <Badge tone={appointmentStatusTone(row.status)}>
          {compact ? row.status_label ?? row.status : row.status_label ?? row.status}
        </Badge>
      </div>
      <div className={`mt-2 flex flex-wrap gap-1 ${compact ? '[&>button]:!h-7 [&>button]:!px-2 [&>button]:!text-[10px]' : ''}`}>
        {isPending ? (
          <Button
            size="sm"
            variant="secondary"
            leftIcon={<CheckCircle2 className="h-3.5 w-3.5" />}
            onClick={() => onConfirm(row.id)}
          >
            {compact ? '✓' : t('adminNew.appointments.confirm')}
          </Button>
        ) : nextStep ? (
          <Button
            size="sm"
            variant="secondary"
            leftIcon={<CircleCheck className="h-3.5 w-3.5" />}
            onClick={() => onAdvance(row.id, nextStep)}
          >
            {compact ? '→' : nextStep.replace(/_/g, ' ')}
          </Button>
        ) : null}
        {canCancel ? (
          <Button
            size="sm"
            variant="ghost"
            leftIcon={<XCircle className="h-3.5 w-3.5" />}
            onClick={() => onCancel(row.id)}
          >
            {compact ? '×' : t('adminNew.appointments.cancel')}
          </Button>
        ) : null}
      </div>
    </article>
  );
}
