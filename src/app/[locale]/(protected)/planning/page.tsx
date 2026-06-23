'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  CalendarDays,
  CalendarRange,
  CheckCircle2,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Droplets,
  Hammer,
  LayoutGrid,
  List,
  Plus,
  Ship,
  User,
  Warehouse,
  X,
} from 'lucide-react';
import { SimpleHero } from '@/components/site/SimpleHero';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { LoadingState, ErrorState } from '@/components/admin/DataState';
import { AdminSelect, AdminTabBar } from '@/components/admin/AdminUi';
import { AppointmentStatusBadge } from '@/components/portal/PortalUi';
import { useIntl } from '@/i18n/IntlProvider';
import { useAuth } from '@/lib/auth-context';
import { canAccessAdmin, loginPath } from '@/lib/auth-routes';
import { useQuery, useMutation } from '@/lib/hooks/useAsync';
import {
  appointmentsService,
  portalService,
  usersService,
  calendarService,
  customersService,
  boatsService,
} from '@/lib/services';
import type { Appointment, AdminUser, BoatLocation, Customer, Boat } from '@/lib/api-types';
import { useToast } from '@/components/ui/ToastProvider';
import { getApiErrorMessage } from '@/lib/api-error';
import { cn } from '@/lib/cn';

const DUTCH_DAYS = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'];

type SlotType = 'crane' | 'wash' | 'storage' | 'maintenance';
type ViewMode = 'week' | 'month' | 'day' | 'agenda';

const SLOT_TYPES: { id: SlotType; label: string; icon: typeof Ship; tone: string }[] = [
  { id: 'crane', label: 'Kraan', icon: Ship, tone: 'marine' },
  { id: 'wash', label: 'Afspuiten', icon: Droplets, tone: 'gold' },
  { id: 'storage', label: 'Stalling', icon: Warehouse, tone: 'navy' },
  { id: 'maintenance', label: 'Onderhoud', icon: Hammer, tone: 'sand' },
];

// Crane/service filter options (service_code values sent to the API).
const SERVICE_FILTERS: { code: string; labelKey: string }[] = [
  { code: 'kraan', labelKey: 'planning.serviceCrane' },
  { code: 'afspuiten', labelKey: 'planning.serviceWash' },
  { code: 'stalling', labelKey: 'planning.serviceStorage' },
  { code: 'winterberging', labelKey: 'planning.serviceWinter' },
];

function slotTypeFor(codes: string[]): SlotType {
  const c = (codes ?? []).map((x) => x.toLowerCase()).join(' ');
  if (c.includes('kran') || c.includes('crane')) return 'crane';
  if (c.includes('afspuit') || c.includes('wash')) return 'wash';
  if (c.includes('stall') || c.includes('winter') || c.includes('berg')) return 'storage';
  return 'maintenance';
}

function startOfWeek(d: Date) {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const out = new Date(d);
  out.setDate(d.getDate() + diff);
  out.setHours(0, 0, 0, 0);
  return out;
}

function startOfMonth(d: Date) {
  const out = new Date(d.getFullYear(), d.getMonth(), 1);
  out.setHours(0, 0, 0, 0);
  return out;
}

function localKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const MONTHS_NL = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];

function formatWeekRange(start: Date) {
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return `${start.getDate()} ${MONTHS_NL[start.getMonth()]} – ${end.getDate()} ${MONTHS_NL[end.getMonth()]} ${end.getFullYear()}`;
}

function formatDayLabel(d: Date) {
  return `${DUTCH_DAYS[(d.getDay() + 6) % 7]} ${d.getDate()} ${MONTHS_NL[d.getMonth()]} ${d.getFullYear()}`;
}

function isActive(status: string) {
  const s = status.toLowerCase();
  return !s.includes('cancel') && !s.includes('complete');
}

function asNumber(v: unknown): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

export default function PlanningPage() {
  const { t, locale } = useIntl();
  const { user, loading: authLoading, isDemo } = useAuth();
  const router = useRouter();
  const { push } = useToast();

  const isStaff = canAccessAdmin(user?.role, isDemo);

  // Client-side guard (middleware already gates server navigations).
  React.useEffect(() => {
    if (!authLoading && !user) {
      router.replace(loginPath(locale, `/${locale}/planning`));
    }
  }, [authLoading, user, router, locale]);

  const [view, setView] = React.useState<ViewMode>('week');
  // `base` is the anchor for the visible range: start of week for week/agenda,
  // start of month for month, and the selected day for the day view.
  const [base, setBase] = React.useState(() => startOfWeek(new Date()));
  const [selected, setSelected] = React.useState<Appointment | null>(null);
  const [cancelFor, setCancelFor] = React.useState<Appointment | null>(null);

  // Staff filters.
  const [employeeFilter, setEmployeeFilter] = React.useState('');
  const [serviceFilter, setServiceFilter] = React.useState('');

  // Bulk select.
  const [selectMode, setSelectMode] = React.useState(false);
  const [picked, setPicked] = React.useState<Set<string>>(new Set());

  // Create modal.
  const [createOpen, setCreateOpen] = React.useState(false);

  // Compute the visible date range based on the view + base anchor.
  const range = React.useMemo(() => {
    if (view === 'month') {
      const first = startOfMonth(base);
      const gridStart = startOfWeek(first);
      const gridEnd = new Date(gridStart);
      gridEnd.setDate(gridStart.getDate() + 41); // 6 weeks
      return { from: gridStart, to: gridEnd, monthFirst: first };
    }
    if (view === 'day') {
      const d = new Date(base);
      d.setHours(0, 0, 0, 0);
      return { from: d, to: d, monthFirst: d };
    }
    // week + agenda use the week starting at `base`
    const from = startOfWeek(base);
    const to = new Date(from);
    to.setDate(from.getDate() + 6);
    return { from, to, monthFirst: from };
  }, [view, base]);

  const dateFrom = localKey(range.from);
  const dateTo = localKey(range.to);

  // Staff/admin see all appointments; customers only their own (portal).
  const query = useQuery<{ data: Appointment[] }>(
    [isStaff, Boolean(user), dateFrom, dateTo, employeeFilter, serviceFilter],
    async () => {
      if (!user) return { data: [] };
      if (!isStaff) {
        return portalService.appointments({ per_page: 100 });
      }
      return appointmentsService.list({
        per_page: 200,
        date_from: dateFrom,
        date_to: dateTo,
        ...(employeeFilter ? { assigned_to: employeeFilter } : {}),
        ...(serviceFilter ? { service_code: serviceFilter } : {}),
      });
    },
    { immediate: Boolean(user) }
  );

  const appointments = React.useMemo(() => query.data?.data ?? [], [query.data]);
  const refetch = query.refetch;

  // Dashboard stats (staff only) — refetch when the employee filter changes.
  const statsQuery = useQuery<Record<string, unknown>>(
    [isStaff, Boolean(user), employeeFilter],
    async () => {
      if (!user || !isStaff) return {};
      return appointmentsService.stats(employeeFilter ? { assigned_to: employeeFilter } : undefined);
    },
    { immediate: false }
  );
  React.useEffect(() => {
    if (isStaff && user) void statsQuery.refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStaff, user, employeeFilter]);
  const stats = statsQuery.data ?? {};

  // Employee + location lookups for filters/forms (staff only).
  const staffQuery = useQuery<{ data: AdminUser[] }>(
    [isStaff, Boolean(user)],
    async () => {
      if (!user || !isStaff) return { data: [] };
      return usersService.list({ role: 'staff' });
    },
    { immediate: false }
  );
  React.useEffect(() => {
    if (isStaff && user) void staffQuery.refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStaff, user]);
  const staffMembers = staffQuery.data?.data ?? [];

  const confirm = useMutation(appointmentsService.confirm);
  const updateStatus = useMutation(appointmentsService.updateStatus);
  const cancel = useMutation((id: string, reason: string) =>
    appointmentsService.cancel(id, reason)
  );
  const reschedule = useMutation(
    (payload: { id: string; date: string; start_time: string; duration_minutes?: number }) =>
      appointmentsService.schedule(payload.id, {
        date: payload.date,
        start_time: payload.start_time,
        duration_minutes: payload.duration_minutes,
        notify_customer: false,
        staff_note: 'Verplaatst via planning (drag & drop).',
      })
  );
  const bulk = useMutation(appointmentsService.bulk);

  // Trello #99: staff drag/drop reschedule between days.
  const [draggingId, setDraggingId] = React.useState<string | null>(null);
  const [dragOverKey, setDragOverKey] = React.useState<string | null>(null);

  const onDropDay = async (dayKey: string) => {
    const appt = appointments.find((a) => a.id === draggingId);
    setDragOverKey(null);
    setDraggingId(null);
    if (!appt || !isStaff) return;
    if ((appt.appointment_date || '').slice(0, 10) === dayKey) return;
    try {
      await reschedule.mutate({
        id: appt.id,
        date: dayKey,
        start_time: (appt.start_time || '09:00').slice(0, 5),
        duration_minutes: appt.duration_minutes ?? undefined,
      });
      push({ tone: 'success', title: t('planning.rescheduled') });
      await refetch();
    } catch (err) {
      push({ tone: 'error', title: t('planning.actionFailed'), message: getApiErrorMessage(err) });
    }
  };

  const runAction = async (fn: () => Promise<unknown>, successKey: string) => {
    try {
      await fn();
      push({ tone: 'success', title: t(successKey) });
      setSelected(null);
      await refetch();
    } catch (err) {
      push({ tone: 'error', title: t('planning.actionFailed'), message: getApiErrorMessage(err) });
    }
  };

  const move = (delta: number) => {
    const next = new Date(base);
    if (view === 'month') next.setMonth(base.getMonth() + delta);
    else if (view === 'day') next.setDate(base.getDate() + delta);
    else next.setDate(base.getDate() + delta * 7);
    setBase(next);
  };

  const goToday = () => {
    const now = new Date();
    setBase(view === 'month' ? startOfMonth(now) : view === 'day' ? (() => { const d = new Date(now); d.setHours(0,0,0,0); return d; })() : startOfWeek(now));
  };

  // Index appointments by day key for the visible range.
  const byDay = React.useMemo(() => {
    const map: Record<string, Appointment[]> = {};
    for (const a of appointments) {
      const key = (a.appointment_date || '').slice(0, 10);
      (map[key] ??= []).push(a);
    }
    for (const key of Object.keys(map)) {
      map[key].sort((x, y) => (x.start_time || '').localeCompare(y.start_time || ''));
    }
    return map;
  }, [appointments]);

  // The 7 day columns for the week view (base is week-aligned in that view).
  const weekDays = React.useMemo(() => {
    const from = startOfWeek(base);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(from);
      d.setDate(from.getDate() + i);
      return d;
    });
  }, [base]);

  // Range-bounded type counts for the legend.
  const rangeCounts = React.useMemo(() => {
    const counts: Record<SlotType, number> = { crane: 0, wash: 0, storage: 0, maintenance: 0 };
    for (const a of appointments) {
      if (!isActive(a.status)) continue;
      counts[slotTypeFor(a.service_codes)] += 1;
    }
    return counts;
  }, [appointments]);

  const togglePick = (id: string) => {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const clearSelection = () => {
    setPicked(new Set());
    setSelectMode(false);
  };

  const runBulk = async (
    payload: {
      action: 'cancel' | 'assign' | 'status';
      reason?: string;
      assigned_to_user_id?: string;
      status?: string;
    }
  ) => {
    if (picked.size === 0) return;
    try {
      await bulk.mutate({ ...payload, appointment_ids: Array.from(picked) });
      push({ tone: 'success', title: t('planning.bulkDone') });
      clearSelection();
      await refetch();
    } catch (err) {
      push({ tone: 'error', title: t('planning.actionFailed'), message: getApiErrorMessage(err) });
    }
  };

  const onExport = async () => {
    try {
      const blob = await appointmentsService.export({ date_from: dateFrom, date_to: dateTo });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `planning-${dateFrom}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      push({ tone: 'error', title: t('planning.actionFailed'), message: getApiErrorMessage(err) });
    }
  };

  if (authLoading || !user) {
    return (
      <div className="container-wide py-24">
        <LoadingState label={t('planning.loading')} />
      </div>
    );
  }

  const headerLabel =
    view === 'month'
      ? `${MONTHS_NL[range.monthFirst.getMonth()]} ${range.monthFirst.getFullYear()}`
      : view === 'day'
        ? formatDayLabel(range.from)
        : formatWeekRange(range.from);

  return (
    <>
      <SimpleHero
        badge={t('planning.badge')}
        title={isStaff ? t('planning.titleStaff') : t('planning.titleCustomer')}
        subtitle={isStaff ? t('planning.subtitleStaff') : t('planning.subtitleCustomer')}
      />

      {/* Staff dashboard stats */}
      {isStaff ? (
        <section className="container-wide -mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={CalendarDays}
            tone="marine"
            label={t('planning.statToday')}
            value={asNumber(stats.today)}
            loading={statsQuery.loading}
          />
          <StatCard
            icon={CalendarRange}
            tone="gold"
            label={t('planning.statTomorrow')}
            value={asNumber(stats.tomorrow)}
            loading={statsQuery.loading}
          />
          <StatCard
            icon={Clock}
            tone="sand"
            label={t('planning.statPending')}
            value={asNumber(stats.pending_review)}
            loading={statsQuery.loading}
          />
          <StatCard
            icon={CheckCircle2}
            tone="navy"
            label={t('planning.statCompletedWeek')}
            value={asNumber(stats.completed_this_week)}
            loading={statsQuery.loading}
          />
        </section>
      ) : (
        <section className="container-wide -mt-10 grid gap-3 sm:grid-cols-4">
          {SLOT_TYPES.map((st) => {
            const Icon = st.icon;
            return (
              <Card key={st.id} className="flex items-center gap-3 p-4">
                <span
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-lg',
                    st.tone === 'marine' && 'bg-marine-50 text-marine-700',
                    st.tone === 'gold' && 'bg-gold-50 text-gold-700',
                    st.tone === 'navy' && 'bg-navy-50 text-navy-700',
                    st.tone === 'sand' && 'bg-sand-100 text-sand-800'
                  )}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <div className="flex-1">
                  <div className="text-xs text-navy-500">{st.label} {t('planning.thisWeek')}</div>
                  <div className="text-lg font-semibold text-navy-900">{rangeCounts[st.id]}</div>
                </div>
              </Card>
            );
          })}
        </section>
      )}

      {/* Calendar */}
      <section className="container-wide py-12">
        {query.error ? <ErrorState message={query.error} onRetry={refetch} /> : null}

        {/* View switcher + staff toolbar */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <AdminTabBar<ViewMode>
            tabs={[
              { id: 'week', label: t('planning.viewWeek'), icon: LayoutGrid },
              { id: 'month', label: t('planning.viewMonth'), icon: CalendarRange },
              { id: 'day', label: t('planning.viewDay'), icon: CalendarDays },
              { id: 'agenda', label: t('planning.viewAgenda'), icon: List },
            ]}
            active={view}
            onChange={(v) => {
              // Re-anchor base sensibly when switching views.
              const now = base;
              if (v === 'month') setBase(startOfMonth(now));
              else if (v === 'week' || v === 'agenda') setBase(startOfWeek(now));
              setView(v);
            }}
          />

          {isStaff ? (
            <div className="flex flex-wrap items-center gap-2">
              <AdminSelect value={employeeFilter} onChange={setEmployeeFilter} className="lg:min-w-[160px]">
                <option value="">{t('planning.filterAllEmployees')}</option>
                {staffMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </AdminSelect>
              <AdminSelect value={serviceFilter} onChange={setServiceFilter} className="lg:min-w-[150px]">
                <option value="">{t('planning.filterAllServices')}</option>
                {SERVICE_FILTERS.map((s) => (
                  <option key={s.code} value={s.code}>
                    {t(s.labelKey)}
                  </option>
                ))}
              </AdminSelect>
              <Button
                variant={selectMode ? 'primary' : 'outline'}
                size="sm"
                leftIcon={<CheckSquare className="h-4 w-4" />}
                onClick={() => {
                  if (selectMode) clearSelection();
                  else setSelectMode(true);
                }}
              >
                {selectMode ? t('planning.exitSelect') : t('planning.selectMode')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Download className="h-4 w-4" />}
                onClick={() => void onExport()}
              >
                {t('planning.export')}
              </Button>
              <Button
                variant="gold"
                size="sm"
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={() => setCreateOpen(true)}
              >
                {t('planning.createAppointment')}
              </Button>
            </div>
          ) : null}
        </div>

        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-navy-100 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => move(-1)}
                  className="rounded-md border border-navy-100 p-1.5 text-navy-700 hover:bg-sand-100"
                  aria-label={t('planning.prevWeek')}
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={goToday}
                  className="rounded-md border border-navy-100 px-3 py-1.5 text-xs font-medium text-navy-700 hover:bg-sand-100"
                >
                  {t('planning.today')}
                </button>
                <button
                  onClick={() => move(1)}
                  className="rounded-md border border-navy-100 p-1.5 text-navy-700 hover:bg-sand-100"
                  aria-label={t('planning.nextWeek')}
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              <div className="text-sm font-semibold text-navy-900">{headerLabel}</div>
            </div>
            <Link href={`/${locale}/kraanafspraak`}>
              <Button variant="outline" size="sm" rightIcon={<ArrowRight className="h-4 w-4" />}>
                {t('planning.newAppointment')}
              </Button>
            </Link>
          </div>

          {query.loading ? (
            <div className="p-8">
              <LoadingState label={t('planning.loading')} />
            </div>
          ) : view === 'week' ? (
            <WeekView
              days={weekDays}
              byDay={byDay}
              isStaff={isStaff}
              selectMode={selectMode}
              picked={picked}
              onTogglePick={togglePick}
              dragOverKey={dragOverKey}
              setDragOverKey={setDragOverKey}
              setDraggingId={setDraggingId}
              onDropDay={onDropDay}
              onSelect={setSelected}
            />
          ) : view === 'month' ? (
            <MonthView
              monthFirst={range.monthFirst}
              gridStart={range.from}
              byDay={byDay}
              onPickDay={(d) => {
                setBase(d);
                setView('day');
              }}
            />
          ) : view === 'day' ? (
            <DayView
              slots={byDay[localKey(range.from)] ?? []}
              selectMode={selectMode}
              picked={picked}
              onTogglePick={togglePick}
              setDraggingId={setDraggingId}
              onSelect={setSelected}
            />
          ) : (
            <AgendaView
              from={range.from}
              to={range.to}
              byDay={byDay}
              selectMode={selectMode}
              picked={picked}
              onTogglePick={togglePick}
              onSelect={setSelected}
              emptyLabel={t('planning.agendaEmpty')}
            />
          )}
        </Card>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-navy-500">
          <div className="flex items-center gap-3">
            {SLOT_TYPES.map((st) => (
              <span key={st.id} className="inline-flex items-center gap-1.5">
                <span
                  className={cn(
                    'h-2.5 w-2.5 rounded-full',
                    st.tone === 'marine' && 'bg-marine-500',
                    st.tone === 'gold' && 'bg-gold-500',
                    st.tone === 'navy' && 'bg-navy-900',
                    st.tone === 'sand' && 'bg-sand-500'
                  )}
                />
                {st.label}
              </span>
            ))}
          </div>
          <div className="inline-flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            {isStaff
              ? `${t('planning.realtimeStaff')} · ${t('planning.dragHint')}`
              : t('planning.realtimeCustomer')}
          </div>
        </div>
      </section>

      {/* Bulk action bar */}
      {isStaff && selectMode && picked.size > 0 ? (
        <BulkBar
          count={picked.size}
          staffMembers={staffMembers}
          loading={bulk.loading}
          onCancel={() => void runBulk({ action: 'cancel', reason: t('planning.cancelReason') })}
          onAssign={(uid) => void runBulk({ action: 'assign', assigned_to_user_id: uid })}
          onStatus={(status) => void runBulk({ action: 'status', status })}
          onClear={clearSelection}
        />
      ) : null}

      {/* Create appointment modal (staff) */}
      {isStaff ? (
        <CreateAppointmentModal
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          staffMembers={staffMembers}
          onCreated={async () => {
            setCreateOpen(false);
            push({ tone: 'success', title: t('planning.created') });
            await refetch();
          }}
        />
      ) : null}

      {/* Appointment detail / actions */}
      <Modal open={!!selected} onClose={() => setSelected(null)} size="md" className="p-6">
        {selected ? (
          <div>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-display text-xl text-navy-900">
                  {(selected.boat as { name?: string } | undefined)?.name ?? t('planning.appointment')}
                </h3>
                <p className="mt-1 text-sm text-navy-500">
                  {(selected.appointment_date || '').slice(0, 10)} · {(selected.start_time || '').slice(0, 5)}
                  {selected.duration_minutes ? ` · ± ${selected.duration_minutes} min` : ''}
                </p>
                {selected.customer?.name ? (
                  <p className="mt-1 text-xs text-navy-400">{selected.customer.name}</p>
                ) : null}
              </div>
              <AppointmentStatusBadge status={selected.status} statusGeneric={selected.status_generic} />
            </div>

            {selected.assigned_to?.name ? (
              <div className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-navy-50 px-2 py-1 text-xs text-navy-700">
                <User className="h-3.5 w-3.5" />
                {selected.assigned_to.name}
              </div>
            ) : null}

            {selected.service_codes?.length ? (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {selected.service_codes.map((c) => (
                  <span key={c} className="rounded-md bg-sand-100 px-2 py-1 text-xs text-navy-700">
                    {c}
                  </span>
                ))}
              </div>
            ) : null}

            {selected.customer_notes ? (
              <p className="mt-4 rounded-lg border border-navy-100 bg-sand-50/60 p-3 text-sm text-navy-600">
                {selected.customer_notes}
              </p>
            ) : null}

            {isStaff ? (
              <div className="mt-6 flex flex-wrap gap-2">
                {selected.status.toLowerCase().includes('pending') ? (
                  <Button
                    variant="primary"
                    onClick={() => runAction(() => confirm.mutate(selected.id), 'planning.confirmed')}
                    disabled={confirm.loading}
                  >
                    {selected.next_status || t('planning.confirm')}
                  </Button>
                ) : null}
                {isActive(selected.status) ? (
                  <Button
                    variant="outline"
                    onClick={() =>
                      runAction(
                        () => updateStatus.mutate(selected.id, { status: 'completed' }),
                        'planning.completed'
                      )
                    }
                    disabled={updateStatus.loading}
                  >
                    {t('planning.markComplete')}
                  </Button>
                ) : null}
                {isActive(selected.status) ? (
                  <Button variant="danger" onClick={() => setCancelFor(selected)}>
                    {t('planning.cancel')}
                  </Button>
                ) : null}
              </div>
            ) : (
              <p className="mt-6 text-xs text-navy-400">{t('planning.customerHint')}</p>
            )}
          </div>
        ) : null}
      </Modal>

      <ConfirmModal
        open={!!cancelFor}
        onClose={() => setCancelFor(null)}
        onConfirm={async () => {
          if (cancelFor) {
            await runAction(
              () => cancel.mutate(cancelFor.id, t('planning.cancelReason')),
              'planning.cancelled'
            );
          }
          setCancelFor(null);
        }}
        title={t('planning.cancel')}
        message={t('planning.cancelConfirm')}
        confirmLabel={t('planning.cancel')}
        variant="danger"
        loading={cancel.loading}
      />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Stat card                                                          */
/* ------------------------------------------------------------------ */

function StatCard({
  icon: Icon,
  tone,
  label,
  value,
  loading,
}: {
  icon: typeof Ship;
  tone: 'marine' | 'gold' | 'navy' | 'sand';
  label: string;
  value: number;
  loading?: boolean;
}) {
  return (
    <Card className="flex items-center gap-3 p-4">
      <span
        className={cn(
          'flex h-10 w-10 items-center justify-center rounded-lg',
          tone === 'marine' && 'bg-marine-50 text-marine-700',
          tone === 'gold' && 'bg-gold-50 text-gold-700',
          tone === 'navy' && 'bg-navy-50 text-navy-700',
          tone === 'sand' && 'bg-sand-100 text-sand-800'
        )}
      >
        <Icon className="h-5 w-5" />
      </span>
      <div className="flex-1">
        <div className="text-xs text-navy-500">{label}</div>
        <div className="text-lg font-semibold text-navy-900">
          {loading ? <span className="inline-block h-5 w-8 animate-pulse rounded bg-sand-200" /> : value}
        </div>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Week view                                                          */
/* ------------------------------------------------------------------ */

function WeekView({
  days,
  byDay,
  isStaff,
  selectMode,
  picked,
  onTogglePick,
  dragOverKey,
  setDragOverKey,
  setDraggingId,
  onDropDay,
  onSelect,
}: {
  days: Date[];
  byDay: Record<string, Appointment[]>;
  isStaff: boolean;
  selectMode: boolean;
  picked: Set<string>;
  onTogglePick: (id: string) => void;
  dragOverKey: string | null;
  setDragOverKey: (k: string | null) => void;
  setDraggingId: (id: string | null) => void;
  onDropDay: (k: string) => void;
  onSelect: (a: Appointment) => void;
}) {
  const dragEnabled = isStaff && !selectMode;
  return (
    <>
      <div className="grid grid-cols-7 border-b border-navy-100 bg-sand-50/40 text-xs">
        {days.map((d, i) => {
          const isToday = d.toDateString() === new Date().toDateString();
          return (
            <div
              key={i}
              className={cn('flex flex-col items-center gap-0.5 px-3 py-3', isToday && 'bg-marine-50/60')}
            >
              <span className="font-semibold uppercase tracking-widest text-navy-400">{DUTCH_DAYS[i]}</span>
              <span className={cn('text-sm font-semibold', isToday ? 'text-marine-700' : 'text-navy-900')}>
                {d.getDate()}
              </span>
            </div>
          );
        })}
      </div>
      <div className="grid min-h-[460px] grid-cols-7 divide-x divide-navy-100">
        {days.map((d, dayIdx) => {
          const dayKey = localKey(d);
          const slots = byDay[dayKey] ?? [];
          return (
            <div
              key={dayIdx}
              className={cn(
                'space-y-2 p-2 transition',
                dragEnabled && dragOverKey === dayKey && 'bg-marine-50/70 ring-2 ring-inset ring-marine-300'
              )}
              onDragOver={
                dragEnabled
                  ? (e) => {
                      e.preventDefault();
                      if (dragOverKey !== dayKey) setDragOverKey(dayKey);
                    }
                  : undefined
              }
              onDragLeave={dragEnabled ? () => setDragOverKey(dragOverKey === dayKey ? null : dragOverKey) : undefined}
              onDrop={dragEnabled ? () => onDropDay(dayKey) : undefined}
            >
              {slots.length === 0 ? (
                <div className="rounded-md border border-dashed border-navy-100 px-2 py-2 text-center text-[11px] text-navy-400">
                  —
                </div>
              ) : null}
              {slots.map((a) => (
                <SlotCard
                  key={a.id}
                  appt={a}
                  onClick={() => (selectMode ? onTogglePick(a.id) : onSelect(a))}
                  draggable={dragEnabled && isActive(a.status)}
                  onDragStart={() => setDraggingId(a.id)}
                  onDragEnd={() => {
                    setDraggingId(null);
                    setDragOverKey(null);
                  }}
                  selectMode={selectMode}
                  picked={picked.has(a.id)}
                />
              ))}
            </div>
          );
        })}
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Month view                                                         */
/* ------------------------------------------------------------------ */

function MonthView({
  monthFirst,
  gridStart,
  byDay,
  onPickDay,
}: {
  monthFirst: Date;
  gridStart: Date;
  byDay: Record<string, Appointment[]>;
  onPickDay: (d: Date) => void;
}) {
  const cells = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    return d;
  });
  const month = monthFirst.getMonth();
  return (
    <div>
      <div className="grid grid-cols-7 border-b border-navy-100 bg-sand-50/40 text-xs">
        {DUTCH_DAYS.map((dn) => (
          <div key={dn} className="px-3 py-2 text-center font-semibold uppercase tracking-widest text-navy-400">
            {dn}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((d, i) => {
          const key = localKey(d);
          const slots = byDay[key] ?? [];
          const inMonth = d.getMonth() === month;
          const isToday = d.toDateString() === new Date().toDateString();
          return (
            <button
              type="button"
              key={i}
              onClick={() => onPickDay(d)}
              className={cn(
                'flex min-h-[92px] flex-col items-start gap-1 border-b border-r border-navy-100 p-1.5 text-left transition hover:bg-sand-50',
                !inMonth && 'bg-sand-50/40 text-navy-300'
              )}
            >
              <span
                className={cn(
                  'flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold',
                  isToday ? 'bg-marine-600 text-white' : inMonth ? 'text-navy-900' : 'text-navy-300'
                )}
              >
                {d.getDate()}
              </span>
              <div className="flex w-full flex-col gap-0.5">
                {slots.slice(0, 3).map((a) => {
                  const meta = SLOT_TYPES.find((s) => s.id === slotTypeFor(a.service_codes))!;
                  return (
                    <span
                      key={a.id}
                      className={cn(
                        'flex items-center gap-1 truncate rounded px-1 py-0.5 text-[10px]',
                        meta.tone === 'marine' && 'bg-marine-50 text-marine-800',
                        meta.tone === 'gold' && 'bg-gold-50 text-gold-800',
                        meta.tone === 'navy' && 'bg-navy-50 text-navy-800',
                        meta.tone === 'sand' && 'bg-sand-100 text-sand-800',
                        a.status.toLowerCase().includes('cancel') && 'line-through opacity-50'
                      )}
                    >
                      {(a.start_time || '').slice(0, 5)}
                    </span>
                  );
                })}
                {slots.length > 3 ? (
                  <span className="px-1 text-[10px] font-medium text-navy-500">+{slots.length - 3}</span>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Day view                                                           */
/* ------------------------------------------------------------------ */

function DayView({
  slots,
  selectMode,
  picked,
  onTogglePick,
  setDraggingId,
  onSelect,
}: {
  slots: Appointment[];
  selectMode: boolean;
  picked: Set<string>;
  onTogglePick: (id: string) => void;
  setDraggingId: (id: string | null) => void;
  onSelect: (a: Appointment) => void;
}) {
  return (
    <div className="mx-auto max-w-xl space-y-2 p-4">
      {slots.length === 0 ? (
        <div className="rounded-lg border border-dashed border-navy-100 px-4 py-10 text-center text-sm text-navy-400">
          —
        </div>
      ) : (
        slots.map((a) => (
          <SlotCard
            key={a.id}
            appt={a}
            onClick={() => (selectMode ? onTogglePick(a.id) : onSelect(a))}
            draggable={false}
            onDragStart={() => setDraggingId(a.id)}
            onDragEnd={() => setDraggingId(null)}
            selectMode={selectMode}
            picked={picked.has(a.id)}
            wide
          />
        ))
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Agenda view                                                        */
/* ------------------------------------------------------------------ */

function AgendaView({
  from,
  to,
  byDay,
  selectMode,
  picked,
  onTogglePick,
  onSelect,
  emptyLabel,
}: {
  from: Date;
  to: Date;
  byDay: Record<string, Appointment[]>;
  selectMode: boolean;
  picked: Set<string>;
  onTogglePick: (id: string) => void;
  onSelect: (a: Appointment) => void;
  emptyLabel: string;
}) {
  const dayKeys: string[] = [];
  const cursor = new Date(from);
  while (cursor <= to) {
    dayKeys.push(localKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  const populated = dayKeys.filter((k) => (byDay[k]?.length ?? 0) > 0);
  if (populated.length === 0) {
    return <div className="px-5 py-12 text-center text-sm text-navy-400">{emptyLabel}</div>;
  }
  return (
    <div className="divide-y divide-navy-100">
      {populated.map((k) => {
        const d = new Date(`${k}T00:00:00`);
        return (
          <div key={k} className="px-5 py-4">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-navy-400">
              {formatDayLabel(d)}
            </div>
            <div className="space-y-2">
              {(byDay[k] ?? []).map((a) => {
                const meta = SLOT_TYPES.find((s) => s.id === slotTypeFor(a.service_codes))!;
                const boatName = (a.boat as { name?: string } | undefined)?.name ?? '—';
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => (selectMode ? onTogglePick(a.id) : onSelect(a))}
                    className="flex w-full items-center gap-3 rounded-lg border border-navy-100 px-3 py-2 text-left text-sm transition hover:bg-sand-50"
                  >
                    {selectMode ? (
                      <span
                        className={cn(
                          'flex h-4 w-4 shrink-0 items-center justify-center rounded border',
                          picked.has(a.id) ? 'border-marine-600 bg-marine-600 text-white' : 'border-navy-300'
                        )}
                      >
                        {picked.has(a.id) ? <CheckSquare className="h-3 w-3" /> : null}
                      </span>
                    ) : null}
                    <span
                      className={cn(
                        'h-2.5 w-2.5 shrink-0 rounded-full',
                        meta.tone === 'marine' && 'bg-marine-500',
                        meta.tone === 'gold' && 'bg-gold-500',
                        meta.tone === 'navy' && 'bg-navy-900',
                        meta.tone === 'sand' && 'bg-sand-500'
                      )}
                    />
                    <span className="w-12 shrink-0 font-semibold text-navy-900">
                      {(a.start_time || '').slice(0, 5)}
                    </span>
                    <span className="flex-1 truncate text-navy-700">{boatName}</span>
                    {a.assigned_to?.name ? (
                      <span className="hidden shrink-0 text-xs text-navy-400 sm:inline">{a.assigned_to.name}</span>
                    ) : null}
                    <AppointmentStatusBadge status={a.status} statusGeneric={a.status_generic} />
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Bulk action bar                                                    */
/* ------------------------------------------------------------------ */

function BulkBar({
  count,
  staffMembers,
  loading,
  onCancel,
  onAssign,
  onStatus,
  onClear,
}: {
  count: number;
  staffMembers: AdminUser[];
  loading: boolean;
  onCancel: () => void;
  onAssign: (uid: string) => void;
  onStatus: (status: string) => void;
  onClear: () => void;
}) {
  const { t } = useIntl();
  const [assignee, setAssignee] = React.useState('');
  const [status, setStatus] = React.useState('');
  return (
    <div className="sticky bottom-0 z-30 border-t border-navy-100 bg-white/95 backdrop-blur">
      <div className="container-wide flex flex-wrap items-center gap-3 py-3">
        <span className="text-sm font-semibold text-navy-900">
          {t('planning.bulkSelected', { count: String(count) })}
        </span>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1">
            <AdminSelect value={assignee} onChange={setAssignee} className="lg:min-w-[150px]">
              <option value="">{t('planning.bulkAssignPlaceholder')}</option>
              {staffMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </AdminSelect>
            <Button
              variant="outline"
              size="sm"
              disabled={!assignee || loading}
              onClick={() => onAssign(assignee)}
            >
              {t('planning.bulkAssign')}
            </Button>
          </div>
          <div className="flex items-center gap-1">
            <AdminSelect value={status} onChange={setStatus} className="lg:min-w-[150px]">
              <option value="">{t('planning.bulkStatusPlaceholder')}</option>
              <option value="confirmed">{t('planning.statusConfirmed')}</option>
              <option value="completed">{t('planning.statusCompleted')}</option>
            </AdminSelect>
            <Button
              variant="outline"
              size="sm"
              disabled={!status || loading}
              onClick={() => onStatus(status)}
            >
              {t('planning.bulkSetStatus')}
            </Button>
          </div>
          <Button variant="danger" size="sm" disabled={loading} onClick={onCancel}>
            {t('planning.bulkCancel')}
          </Button>
          <button
            type="button"
            onClick={onClear}
            className="rounded-md border border-navy-100 p-1.5 text-navy-500 hover:bg-sand-100"
            aria-label={t('planning.bulkClear')}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Create appointment modal                                           */
/* ------------------------------------------------------------------ */

function CreateAppointmentModal({
  open,
  onClose,
  staffMembers,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  staffMembers: AdminUser[];
  onCreated: () => void | Promise<void>;
}) {
  const { t } = useIntl();
  const { push } = useToast();

  const customersQuery = useQuery<{ data: Customer[] }>(
    [open],
    async () => (open ? customersService.list({ per_page: 200 }) : { data: [] }),
    { immediate: false }
  );
  const boatsQuery = useQuery<{ data: Boat[] }>(
    [open],
    async () => (open ? boatsService.list({ per_page: 200 }) : { data: [] }),
    { immediate: false }
  );
  const locationsQuery = useQuery<BoatLocation[]>(
    [open],
    async () => (open ? calendarService.locations() : []),
    { immediate: false }
  );
  React.useEffect(() => {
    if (open) {
      void customersQuery.refetch();
      void boatsQuery.refetch();
      void locationsQuery.refetch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const customers = customersQuery.data?.data ?? [];
  const allBoats = boatsQuery.data?.data ?? [];
  const locations = locationsQuery.data ?? [];

  const [customerId, setCustomerId] = React.useState('');
  const [boatId, setBoatId] = React.useState('');
  const [serviceCode, setServiceCode] = React.useState('kraan');
  const [date, setDate] = React.useState('');
  const [startTime, setStartTime] = React.useState('09:00');
  const [duration, setDuration] = React.useState('60');
  const [locationId, setLocationId] = React.useState('');
  const [assignee, setAssignee] = React.useState('');

  // Conflict state — block submit until confirmed when conflicts are present.
  const [conflicts, setConflicts] = React.useState<Array<Record<string, unknown>> | null>(null);
  const [confirmAnyway, setConfirmAnyway] = React.useState(false);
  const [checking, setChecking] = React.useState(false);

  const create = useMutation(appointmentsService.create);

  // Reset on open/close.
  React.useEffect(() => {
    if (open) {
      setCustomerId('');
      setBoatId('');
      setServiceCode('kraan');
      setDate('');
      setStartTime('09:00');
      setDuration('60');
      setLocationId('');
      setAssignee('');
      setConflicts(null);
      setConfirmAnyway(false);
    }
  }, [open]);

  // Filter boats by the chosen customer when known.
  const boats = customerId ? allBoats.filter((b) => b.customer_id === customerId) : allBoats;

  // Re-checking conflicts is required whenever the key inputs change.
  React.useEffect(() => {
    setConflicts(null);
    setConfirmAnyway(false);
  }, [date, startTime, duration, locationId]);

  const canSubmit = customerId && boatId && date && startTime && serviceCode;
  const hasConflicts = (conflicts?.length ?? 0) > 0;

  const submit = async () => {
    if (!canSubmit) return;
    // 1) Check conflicts first.
    if (conflicts === null) {
      setChecking(true);
      try {
        const res = await appointmentsService.checkConflicts({
          date,
          start_time: startTime,
          duration_minutes: Number(duration) || undefined,
          location_id: locationId || null,
        });
        setConflicts(res.conflicts ?? []);
        if (res.has_conflicts && (res.conflicts?.length ?? 0) > 0) {
          // Stop — require confirm-anyway.
          setChecking(false);
          return;
        }
      } catch (err) {
        setChecking(false);
        push({ tone: 'error', title: t('planning.actionFailed'), message: getApiErrorMessage(err) });
        return;
      }
      setChecking(false);
    } else if (hasConflicts && !confirmAnyway) {
      return;
    }

    // 2) Create.
    try {
      await create.mutate({
        customer_id: customerId,
        boat_id: boatId,
        service_codes: [serviceCode],
        appointment_date: date,
        start_time: startTime,
        duration_minutes: Number(duration) || undefined,
        location_id: locationId || null,
        assigned_to_user_id: assignee || null,
      });
      await onCreated();
    } catch (err) {
      push({ tone: 'error', title: t('planning.actionFailed'), message: getApiErrorMessage(err) });
    }
  };

  return (
    <Modal open={open} onClose={onClose} size="lg" className="p-6">
      <h3 className="font-display text-xl text-navy-900">{t('planning.createTitle')}</h3>
      <p className="mt-1 text-sm text-navy-500">{t('planning.createSubtitle')}</p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-navy-700">{t('planning.fieldCustomer')}</span>
          <select
            className="input-base w-full"
            value={customerId}
            onChange={(e) => {
              setCustomerId(e.target.value);
              setBoatId('');
            }}
          >
            <option value="">{t('planning.selectPlaceholder')}</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          <span className="mb-1 block font-medium text-navy-700">{t('planning.fieldBoat')}</span>
          <select
            className="input-base w-full"
            value={boatId}
            onChange={(e) => setBoatId(e.target.value)}
          >
            <option value="">{t('planning.selectPlaceholder')}</option>
            {boats.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          <span className="mb-1 block font-medium text-navy-700">{t('planning.fieldService')}</span>
          <select
            className="input-base w-full"
            value={serviceCode}
            onChange={(e) => setServiceCode(e.target.value)}
          >
            {SERVICE_FILTERS.map((s) => (
              <option key={s.code} value={s.code}>
                {t(s.labelKey)}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          <span className="mb-1 block font-medium text-navy-700">{t('planning.fieldLocation')}</span>
          <select
            className="input-base w-full"
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
          >
            <option value="">{t('planning.selectPlaceholder')}</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.code}
              </option>
            ))}
          </select>
        </label>

        <Input
          label={t('planning.fieldDate')}
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <Input
          label={t('planning.fieldStartTime')}
          type="time"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
        />
        <Input
          label={t('planning.fieldDuration')}
          type="number"
          min={15}
          step={15}
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
        />
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-navy-700">{t('planning.fieldAssignee')}</span>
          <select
            className="input-base w-full"
            value={assignee}
            onChange={(e) => setAssignee(e.target.value)}
          >
            <option value="">{t('planning.unassigned')}</option>
            {staffMembers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {hasConflicts ? (
        <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          <div className="font-semibold">{t('planning.conflictTitle')}</div>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs">
            {conflicts!.map((c, i) => {
              const time =
                (c.start_time as string | undefined) ?? (c.appointment_date as string | undefined) ?? '';
              const label =
                (c.boat_name as string | undefined) ??
                (c.customer_name as string | undefined) ??
                (c.id as string | undefined) ??
                t('planning.appointment');
              return (
                <li key={i}>
                  {time ? `${String(time).slice(0, 16)} · ` : ''}
                  {label}
                </li>
              );
            })}
          </ul>
          <label className="mt-2 flex items-center gap-2 text-xs font-medium text-amber-900">
            <input
              type="checkbox"
              checked={confirmAnyway}
              onChange={(e) => setConfirmAnyway(e.target.checked)}
            />
            {t('planning.conflictConfirmAnyway')}
          </label>
        </div>
      ) : null}

      <div className="mt-6 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          {t('planning.cancel')}
        </Button>
        <Button
          variant="gold"
          onClick={() => void submit()}
          disabled={!canSubmit || checking || create.loading || (hasConflicts && !confirmAnyway)}
        >
          {checking ? t('planning.checking') : t('planning.createConfirm')}
        </Button>
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Slot card                                                          */
/* ------------------------------------------------------------------ */

function SlotCard({
  appt,
  onClick,
  draggable,
  onDragStart,
  onDragEnd,
  selectMode,
  picked,
  wide,
}: {
  appt: Appointment;
  onClick: () => void;
  draggable?: boolean;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  selectMode?: boolean;
  picked?: boolean;
  wide?: boolean;
}) {
  const type = slotTypeFor(appt.service_codes);
  const meta = SLOT_TYPES.find((s) => s.id === type)!;
  const Icon = meta.icon;
  const tones: Record<string, string> = {
    marine: 'bg-marine-50 ring-marine-200 text-marine-800',
    gold: 'bg-gold-50 ring-gold-200 text-gold-800',
    navy: 'bg-navy-50 ring-navy-200 text-navy-800',
    sand: 'bg-sand-100 ring-sand-200 text-sand-800',
  };
  const cancelled = appt.status.toLowerCase().includes('cancel');
  const boatName = (appt.boat as { name?: string } | undefined)?.name ?? '—';
  return (
    <button
      type="button"
      onClick={onClick}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={cn(
        'w-full rounded-md p-2 text-left ring-1 ring-inset transition hover:brightness-95',
        wide ? 'text-xs' : 'text-[11px]',
        draggable && 'cursor-grab active:cursor-grabbing',
        tones[meta.tone],
        picked && 'ring-2 ring-marine-500',
        cancelled && 'opacity-50 line-through'
      )}
    >
      <div className="flex items-center gap-1 font-semibold">
        {selectMode ? (
          <span
            className={cn(
              'flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border',
              picked ? 'border-marine-600 bg-marine-600 text-white' : 'border-navy-300 bg-white'
            )}
          >
            {picked ? <CheckSquare className="h-2.5 w-2.5" /> : null}
          </span>
        ) : (
          <Icon className="h-3 w-3" />
        )}
        {(appt.start_time || '').slice(0, 5)}
        <Clock className="ml-auto h-3 w-3 opacity-50" />
      </div>
      <div className="mt-0.5 line-clamp-1 text-navy-700">{boatName}</div>
      {appt.assigned_to?.name ? (
        <div className="mt-0.5 flex items-center gap-1 text-[10px] text-navy-500">
          <User className="h-2.5 w-2.5" />
          <span className="line-clamp-1">{appt.assigned_to.name}</span>
        </div>
      ) : null}
      <div className="mt-1">
        <AppointmentStatusBadge status={appt.status} statusGeneric={appt.status_generic} />
      </div>
    </button>
  );
}
