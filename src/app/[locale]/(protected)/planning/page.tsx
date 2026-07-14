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
  Pencil,
  Plus,
  Ship,
  User,
  Users,
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
type ViewMode = 'week' | 'month' | 'day' | 'agenda' | 'employee' | 'crane';

const SLOT_TYPES: { id: SlotType; label: string; icon: typeof Ship; tone: string }[] = [
  { id: 'crane', label: 'Kraan', icon: Ship, tone: 'marine' },
  { id: 'wash', label: 'Afspuiten', icon: Droplets, tone: 'gold' },
  { id: 'storage', label: 'Stalling', icon: Warehouse, tone: 'navy' },
  { id: 'maintenance', label: 'Onderhoud', icon: Hammer, tone: 'sand' },
];

const SERVICE_FILTERS: { code: string; labelKey: string }[] = [
  { code: 'kraan', labelKey: 'planning.serviceCrane' },
  { code: 'afspuiten', labelKey: 'planning.serviceWash' },
  { code: 'stalling', labelKey: 'planning.serviceStorage' },
  { code: 'winterberging', labelKey: 'planning.serviceWinter' },
];

// Time-grid constants
const GRID_START_HOUR = 6;   // 06:00
const GRID_END_HOUR = 20;    // 20:00
const HOUR_HEIGHT_PX = 64;   // px per hour
const GRID_HOURS = Array.from({ length: GRID_END_HOUR - GRID_START_HOUR }, (_, i) => GRID_START_HOUR + i);

function slotTypeFor(codes: string[]): SlotType {
  const c = (codes ?? []).map((x) => x.toLowerCase()).join(' ');
  if (c.includes('kran') || c.includes('crane')) return 'crane';
  if (c.includes('afspuit') || c.includes('wash')) return 'wash';
  if (c.includes('stall') || c.includes('winter') || c.includes('berg')) return 'storage';
  return 'maintenance';
}

function isCraneAppointment(codes: string[]): boolean {
  const c = (codes ?? []).map((x) => x.toLowerCase()).join(' ');
  return c.includes('kranen') || c.includes('kran') || c.includes('crane');
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

/** Convert HH:MM to minutes from midnight */
function timeToMinutes(t: string): number {
  const [h, m] = (t || '00:00').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

/** Top offset in px for a given time string in the time-grid */
function topPx(startTime: string): number {
  const mins = timeToMinutes(startTime) - GRID_START_HOUR * 60;
  return Math.max(0, (mins / 60) * HOUR_HEIGHT_PX);
}

/** Height in px for a given duration in minutes */
function heightPx(durationMinutes: number): number {
  return Math.max(28, (durationMinutes / 60) * HOUR_HEIGHT_PX);
}

export default function PlanningPage() {
  const { t, locale } = useIntl();
  const { user, loading: authLoading, isDemo } = useAuth();
  const router = useRouter();
  const { push } = useToast();

  const isStaff = canAccessAdmin(user?.role, isDemo);

  React.useEffect(() => {
    if (!authLoading && !user) {
      router.replace(loginPath(locale, `/${locale}/planning`));
    }
  }, [authLoading, user, router, locale]);

  const [view, setView] = React.useState<ViewMode>('week');
  const [base, setBase] = React.useState(() => startOfWeek(new Date()));
  const [selected, setSelected] = React.useState<Appointment | null>(null);
  const [cancelFor, setCancelFor] = React.useState<Appointment | null>(null);

  const [employeeFilter, setEmployeeFilter] = React.useState('');
  const [serviceFilter, setServiceFilter] = React.useState('');

  const [selectMode, setSelectMode] = React.useState(false);
  const [picked, setPicked] = React.useState<Set<string>>(new Set());

  const [createOpen, setCreateOpen] = React.useState(false);

  // Staff notes editing state
  const [editNoteId, setEditNoteId] = React.useState<string | null>(null);
  const [staffNote, setStaffNote] = React.useState('');
  const [publicNote, setPublicNote] = React.useState('');

  const range = React.useMemo(() => {
    if (view === 'month') {
      const first = startOfMonth(base);
      const gridStart = startOfWeek(first);
      const gridEnd = new Date(gridStart);
      gridEnd.setDate(gridStart.getDate() + 41);
      return { from: gridStart, to: gridEnd, monthFirst: first };
    }
    if (view === 'day') {
      const d = new Date(base);
      d.setHours(0, 0, 0, 0);
      return { from: d, to: d, monthFirst: d };
    }
    const from = startOfWeek(base);
    const to = new Date(from);
    to.setDate(from.getDate() + 6);
    return { from, to, monthFirst: from };
  }, [view, base]);

  const dateFrom = localKey(range.from);
  const dateTo = localKey(range.to);

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

  // Drag state — used by both week-day drag and time-grid drag
  const [draggingId, setDraggingId] = React.useState<string | null>(null);
  const [dragOverKey, setDragOverKey] = React.useState<string | null>(null);

  // Drop handler: used by old day-column week view (non-time-grid)
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

  // Time-grid drop handler: called with date + new start_time
  const onDropTimeSlot = async (dayKey: string, startTime: string) => {
    const appt = appointments.find((a) => a.id === draggingId);
    setDragOverKey(null);
    setDraggingId(null);
    if (!appt || !isStaff) return;
    const sameDay = (appt.appointment_date || '').slice(0, 10) === dayKey;
    const sameTime = (appt.start_time || '').slice(0, 5) === startTime;
    if (sameDay && sameTime) return;
    try {
      await reschedule.mutate({
        id: appt.id,
        date: dayKey,
        start_time: startTime,
        duration_minutes: appt.duration_minutes ?? undefined,
      });
      push({ tone: 'success', title: t('planning.rescheduled') });
      await refetch();
    } catch (err) {
      push({ tone: 'error', title: t('planning.actionFailed'), message: getApiErrorMessage(err) });
    }
  };

  // Resize handler: called with appointment + new duration
  const onResizeDuration = async (appt: Appointment, newDurationMinutes: number) => {
    try {
      await reschedule.mutate({
        id: appt.id,
        date: (appt.appointment_date || '').slice(0, 10),
        start_time: (appt.start_time || '').slice(0, 5),
        duration_minutes: newDurationMinutes,
      });
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

  const weekDays = React.useMemo(() => {
    const from = startOfWeek(base);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(from);
      d.setDate(from.getDate() + i);
      return d;
    });
  }, [base]);

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
          <StatCard icon={CalendarDays} tone="marine" label={t('planning.statToday')} value={asNumber(stats.today)} loading={statsQuery.loading} />
          <StatCard icon={CalendarRange} tone="gold" label={t('planning.statTomorrow')} value={asNumber(stats.tomorrow)} loading={statsQuery.loading} />
          <StatCard icon={Clock} tone="sand" label={t('planning.statPending')} value={asNumber(stats.pending_review)} loading={statsQuery.loading} />
          <StatCard icon={CheckCircle2} tone="navy" label={t('planning.statCompletedWeek')} value={asNumber(stats.completed_this_week)} loading={statsQuery.loading} />
        </section>
      ) : (
        <section className="container-wide -mt-10 grid gap-3 sm:grid-cols-4">
          {SLOT_TYPES.map((st) => {
            const Icon = st.icon;
            return (
              <Card key={st.id} className="flex items-center gap-3 p-4">
                <span className={cn('flex h-10 w-10 items-center justify-center rounded-lg',
                  st.tone === 'marine' && 'bg-marine-50 text-marine-700',
                  st.tone === 'gold' && 'bg-gold-50 text-gold-700',
                  st.tone === 'navy' && 'bg-navy-50 text-navy-700',
                  st.tone === 'sand' && 'bg-sand-100 text-sand-800')}>
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

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <AdminTabBar<ViewMode>
            tabs={[
              { id: 'week', label: t('planning.viewWeek'), icon: LayoutGrid },
              { id: 'month', label: t('planning.viewMonth'), icon: CalendarRange },
              { id: 'day', label: t('planning.viewDay'), icon: CalendarDays },
              { id: 'agenda', label: t('planning.viewAgenda'), icon: List },
              ...(isStaff ? [
                { id: 'employee' as ViewMode, label: 'Medewerkers', icon: Users },
                { id: 'crane' as ViewMode, label: 'Kraan', icon: Ship },
              ] : []),
            ]}
            active={view}
            onChange={(v) => {
              const now = base;
              if (v === 'month') setBase(startOfMonth(now));
              else if (v === 'week' || v === 'agenda' || v === 'employee' || v === 'crane') setBase(startOfWeek(now));
              setView(v);
            }}
          />

          {isStaff ? (
            <div className="flex flex-wrap items-center gap-2">
              <AdminSelect value={employeeFilter} onChange={setEmployeeFilter} className="lg:min-w-[160px]">
                <option value="">{t('planning.filterAllEmployees')}</option>
                {staffMembers.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </AdminSelect>
              <AdminSelect value={serviceFilter} onChange={setServiceFilter} className="lg:min-w-[150px]">
                <option value="">{t('planning.filterAllServices')}</option>
                {SERVICE_FILTERS.map((s) => (
                  <option key={s.code} value={s.code}>{t(s.labelKey)}</option>
                ))}
              </AdminSelect>
              <Button variant={selectMode ? 'primary' : 'outline'} size="sm" leftIcon={<CheckSquare className="h-4 w-4" />}
                onClick={() => { if (selectMode) clearSelection(); else setSelectMode(true); }}>
                {selectMode ? t('planning.exitSelect') : t('planning.selectMode')}
              </Button>
              <Button variant="outline" size="sm" leftIcon={<Download className="h-4 w-4" />} onClick={() => void onExport()}>
                {t('planning.export')}
              </Button>
              <Button variant="gold" size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setCreateOpen(true)}>
                {t('planning.createAppointment')}
              </Button>
            </div>
          ) : null}
        </div>

        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-navy-100 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <button onClick={() => move(-1)} className="rounded-md border border-navy-100 p-1.5 text-navy-700 hover:bg-sand-100" aria-label={t('planning.prevWeek')}>
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button onClick={goToday} className="rounded-md border border-navy-100 px-3 py-1.5 text-xs font-medium text-navy-700 hover:bg-sand-100">
                  {t('planning.today')}
                </button>
                <button onClick={() => move(1)} className="rounded-md border border-navy-100 p-1.5 text-navy-700 hover:bg-sand-100" aria-label={t('planning.nextWeek')}>
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
            <div className="p-8"><LoadingState label={t('planning.loading')} /></div>
          ) : view === 'week' ? (
            <TimeGridWeekView
              days={weekDays}
              appointments={appointments}
              isStaff={isStaff}
              selectMode={selectMode}
              picked={picked}
              onTogglePick={togglePick}
              draggingId={draggingId}
              setDraggingId={setDraggingId}
              onDropTimeSlot={onDropTimeSlot}
              onResize={onResizeDuration}
              onSelect={setSelected}
            />
          ) : view === 'month' ? (
            <MonthView
              monthFirst={range.monthFirst}
              gridStart={range.from}
              byDay={byDay}
              onPickDay={(d) => { setBase(d); setView('day'); }}
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
          ) : view === 'employee' ? (
            <EmployeeView
              days={weekDays}
              appointments={appointments}
              staffMembers={staffMembers}
              onSelect={setSelected}
            />
          ) : view === 'crane' ? (
            <CraneView
              days={weekDays}
              appointments={appointments.filter((a) => isCraneAppointment(a.service_codes))}
              isStaff={isStaff}
              setDraggingId={setDraggingId}
              onDropTimeSlot={onDropTimeSlot}
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
                <span className={cn('h-2.5 w-2.5 rounded-full',
                  st.tone === 'marine' && 'bg-marine-500',
                  st.tone === 'gold' && 'bg-gold-500',
                  st.tone === 'navy' && 'bg-navy-900',
                  st.tone === 'sand' && 'bg-sand-500')} />
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

      {/* Create appointment modal */}
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

      {/* Appointment detail + actions modal */}
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
                  <span key={c} className="rounded-md bg-sand-100 px-2 py-1 text-xs text-navy-700">{c}</span>
                ))}
              </div>
            ) : null}

            {/* Location */}
            {selected.location_id ? (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-navy-500">
                <Ship className="h-3.5 w-3.5" />
                Dok: {selected.location_id}
              </div>
            ) : null}

            {/* Customer notes */}
            {selected.customer_notes ? (
              <div className="mt-4 rounded-lg border border-navy-100 bg-sand-50/60 p-3">
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-navy-400">Klantnotitie</div>
                <p className="text-sm text-navy-600">{selected.customer_notes}</p>
              </div>
            ) : null}

            {/* Staff notes (read, shown to staff) */}
            {isStaff && selected.staff_notes ? (
              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50/60 p-3">
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-amber-600">Interne notitie</div>
                <p className="whitespace-pre-wrap text-sm text-amber-900">{selected.staff_notes}</p>
              </div>
            ) : null}

            {/* Public notes (staff-writable, customer-visible) */}
            {selected.public_notes ? (
              <div className="mt-3 rounded-lg border border-marine-200 bg-marine-50/40 p-3">
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-marine-600">Klantbericht</div>
                <p className="text-sm text-marine-900">{selected.public_notes}</p>
              </div>
            ) : null}

            {/* Add staff + public note inline (staff only) */}
            {isStaff ? (
              <div className="mt-4 space-y-2">
                {editNoteId === selected.id ? (
                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-navy-700">
                      Interne notitie toevoegen
                      <textarea
                        rows={2}
                        className="mt-1 w-full rounded-lg border border-navy-200 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-marine-300"
                        placeholder="Zichtbaar alleen voor medewerkers…"
                        value={staffNote}
                        onChange={(e) => setStaffNote(e.target.value)}
                      />
                    </label>
                    <label className="block text-xs font-medium text-navy-700">
                      Klantbericht (zichtbaar in portaal)
                      <textarea
                        rows={2}
                        className="mt-1 w-full rounded-lg border border-navy-200 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-marine-300"
                        placeholder="Instructies of updates voor de klant…"
                        value={publicNote}
                        onChange={(e) => setPublicNote(e.target.value)}
                      />
                    </label>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          try {
                            await appointmentsService.updateStatus(selected.id, {
                              status: selected.status,
                              staff_note: staffNote || null,
                              public_note: publicNote || null,
                            });
                            push({ tone: 'success', title: 'Notities opgeslagen' });
                            setEditNoteId(null);
                            setStaffNote('');
                            setPublicNote('');
                            setSelected(null);
                            await refetch();
                          } catch (err) {
                            push({ tone: 'error', title: 'Fout', message: getApiErrorMessage(err) });
                          }
                        }}
                      >
                        Opslaan
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => { setEditNoteId(null); setStaffNote(''); setPublicNote(''); }}>
                        Annuleren
                      </Button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setEditNoteId(selected.id);
                      setPublicNote(selected.public_notes ?? '');
                    }}
                    className="inline-flex items-center gap-1.5 text-xs text-navy-400 hover:text-navy-700"
                  >
                    <Pencil className="h-3 w-3" />
                    Notitie toevoegen / bewerken
                  </button>
                )}
              </div>
            ) : null}

            {/* Action buttons */}
            {isStaff ? (
              <div className="mt-6 flex flex-wrap gap-2">
                {/* Confirm pending/requested */}
                {['pending_manual_review', 'requested'].includes(selected.status) ? (
                  <Button
                    variant="primary"
                    onClick={() => runAction(() => confirm.mutate(selected.id), 'planning.confirmed')}
                    disabled={confirm.loading}
                  >
                    {t('planning.confirm')}
                  </Button>
                ) : null}

                {/* Advance one step using next_status (fixes the 422 bug) */}
                {selected.next_status && !['pending_manual_review', 'requested'].includes(selected.status) ? (
                  <Button
                    variant="primary"
                    onClick={() =>
                      runAction(
                        () => updateStatus.mutate(selected.id, { status: selected.next_status! }),
                        'planning.confirmed'
                      )
                    }
                    disabled={updateStatus.loading}
                  >
                    Volgende stap → {selected.next_status.replace(/_/g, ' ')}
                  </Button>
                ) : null}

                {/* Cancel */}
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

function StatCard({ icon: Icon, tone, label, value, loading }: {
  icon: typeof Ship; tone: 'marine' | 'gold' | 'navy' | 'sand'; label: string; value: number; loading?: boolean;
}) {
  return (
    <Card className="flex items-center gap-3 p-4">
      <span className={cn('flex h-10 w-10 items-center justify-center rounded-lg',
        tone === 'marine' && 'bg-marine-50 text-marine-700',
        tone === 'gold' && 'bg-gold-50 text-gold-700',
        tone === 'navy' && 'bg-navy-50 text-navy-700',
        tone === 'sand' && 'bg-sand-100 text-sand-800')}>
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
/* Time-grid week view (replaces old flat WeekView)                   */
/* Hourly rows 06:00–20:00; cards absolutely positioned.              */
/* ------------------------------------------------------------------ */

function TimeGridWeekView({
  days,
  appointments,
  isStaff,
  selectMode,
  picked,
  onTogglePick,
  draggingId,
  setDraggingId,
  onDropTimeSlot,
  onResize,
  onSelect,
}: {
  days: Date[];
  appointments: Appointment[];
  isStaff: boolean;
  selectMode: boolean;
  picked: Set<string>;
  onTogglePick: (id: string) => void;
  draggingId: string | null;
  setDraggingId: (id: string | null) => void;
  onDropTimeSlot: (dayKey: string, startTime: string) => void;
  onResize: (appt: Appointment, newDurationMinutes: number) => void;
  onSelect: (a: Appointment) => void;
}) {
  const dragEnabled = isStaff && !selectMode;
  const gridHeight = (GRID_END_HOUR - GRID_START_HOUR) * HOUR_HEIGHT_PX;

  const [dragOverSlot, setDragOverSlot] = React.useState<{ dayKey: string; time: string } | null>(null);
  const [resizing, setResizing] = React.useState<{ appt: Appointment; startY: number; startDuration: number } | null>(null);

  React.useEffect(() => {
    if (!resizing) return;
    const onMove = (e: MouseEvent) => {
      const delta = e.clientY - resizing.startY;
      const deltaMins = Math.round((delta / HOUR_HEIGHT_PX) * 60 / 15) * 15;
      const newDuration = Math.max(15, resizing.startDuration + deltaMins);
      // Just visual — actual commit on mouseup
      setResizing((r) => r ? { ...r, currentDuration: newDuration } as typeof r : null);
    };
    const onUp = (e: MouseEvent) => {
      const delta = e.clientY - resizing.startY;
      const deltaMins = Math.round((delta / HOUR_HEIGHT_PX) * 60 / 15) * 15;
      const newDuration = Math.max(15, resizing.startDuration + deltaMins);
      if (newDuration !== resizing.startDuration) {
        void onResize(resizing.appt, newDuration);
      }
      setResizing(null);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resizing]);

  const byDayKey = React.useMemo(() => {
    const map: Record<string, Appointment[]> = {};
    for (const a of appointments) {
      const key = (a.appointment_date || '').slice(0, 10);
      (map[key] ??= []).push(a);
    }
    return map;
  }, [appointments]);

  const getDropTime = (e: React.DragEvent, dayKey: string): string => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const y = e.clientY - rect.top;
    const mins = Math.round((y / HOUR_HEIGHT_PX) * 60 / 15) * 15 + GRID_START_HOUR * 60;
    const clamped = Math.max(GRID_START_HOUR * 60, Math.min((GRID_END_HOUR - 1) * 60, mins));
    const h = Math.floor(clamped / 60);
    const m = clamped % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  return (
    <div className="flex overflow-x-auto">
      {/* Hour gutter */}
      <div className="sticky left-0 z-10 flex-shrink-0 bg-white">
        {/* Header spacer */}
        <div className="h-10 border-b border-r border-navy-100" />
        <div className="relative border-r border-navy-100" style={{ height: gridHeight }}>
          {GRID_HOURS.map((h) => (
            <div
              key={h}
              className="absolute w-12 text-right pr-2 text-[10px] text-navy-400 leading-none"
              style={{ top: (h - GRID_START_HOUR) * HOUR_HEIGHT_PX - 6 }}
            >
              {String(h).padStart(2, '0')}:00
            </div>
          ))}
        </div>
      </div>

      {/* Day columns */}
      <div className="flex min-w-0 flex-1">
        {days.map((d, dayIdx) => {
          const dayKey = localKey(d);
          const isToday = d.toDateString() === new Date().toDateString();
          const slots = byDayKey[dayKey] ?? [];

          return (
            <div key={dayIdx} className="flex flex-1 flex-col border-r border-navy-100 last:border-r-0" style={{ minWidth: 90 }}>
              {/* Day header */}
              <div className={cn('flex h-10 flex-col items-center justify-center border-b border-navy-100 bg-sand-50/40 text-xs',
                isToday && 'bg-marine-50/60')}>
                <span className="font-semibold uppercase tracking-widest text-navy-400">{DUTCH_DAYS[dayIdx]}</span>
                <span className={cn('font-semibold', isToday ? 'text-marine-700' : 'text-navy-900')}>{d.getDate()}</span>
              </div>

              {/* Time grid body */}
              <div
                className={cn('relative', dragEnabled && dragOverSlot?.dayKey === dayKey && 'bg-marine-50/40')}
                style={{ height: gridHeight }}
                onDragOver={dragEnabled ? (e) => {
                  e.preventDefault();
                  const t = getDropTime(e, dayKey);
                  if (!dragOverSlot || dragOverSlot.dayKey !== dayKey || dragOverSlot.time !== t) {
                    setDragOverSlot({ dayKey, time: t });
                  }
                } : undefined}
                onDragLeave={dragEnabled ? () => setDragOverSlot(null) : undefined}
                onDrop={dragEnabled ? (e) => {
                  const t = getDropTime(e, dayKey);
                  setDragOverSlot(null);
                  void onDropTimeSlot(dayKey, t);
                } : undefined}
              >
                {/* Hour lines */}
                {GRID_HOURS.map((h) => (
                  <div
                    key={h}
                    className="pointer-events-none absolute left-0 right-0 border-t border-navy-100/60"
                    style={{ top: (h - GRID_START_HOUR) * HOUR_HEIGHT_PX }}
                  />
                ))}

                {/* Drop indicator */}
                {dragEnabled && dragOverSlot?.dayKey === dayKey ? (
                  <div
                    className="pointer-events-none absolute left-1 right-1 h-0.5 bg-marine-400"
                    style={{ top: topPx(dragOverSlot.time) }}
                  />
                ) : null}

                {/* Appointment cards */}
                {slots.map((a) => {
                  const top = topPx((a.start_time || '09:00').slice(0, 5));
                  const currentDuration = resizing?.appt.id === a.id
                    ? Math.max(15, resizing.startDuration + Math.round(((0) / HOUR_HEIGHT_PX) * 60))
                    : a.duration_minutes;
                  const h = heightPx(currentDuration);
                  const type = slotTypeFor(a.service_codes);
                  const meta = SLOT_TYPES.find((s) => s.id === type)!;
                  const toneClass = {
                    marine: 'bg-marine-50 ring-marine-200 text-marine-800',
                    gold: 'bg-gold-50 ring-gold-200 text-gold-800',
                    navy: 'bg-navy-50 ring-navy-200 text-navy-800',
                    sand: 'bg-sand-100 ring-sand-200 text-sand-800',
                  }[meta.tone];
                  const cancelled = a.status.toLowerCase().includes('cancel');

                  return (
                    <div
                      key={a.id}
                      className={cn(
                        'absolute left-0.5 right-0.5 rounded-md ring-1 ring-inset overflow-hidden cursor-pointer transition hover:brightness-95 select-none',
                        toneClass,
                        cancelled && 'opacity-40',
                        picked.has(a.id) && 'ring-2 ring-marine-500',
                        dragEnabled && isActive(a.status) && 'cursor-grab active:cursor-grabbing',
                      )}
                      style={{ top, height: h }}
                      draggable={dragEnabled && isActive(a.status)}
                      onDragStart={dragEnabled ? () => setDraggingId(a.id) : undefined}
                      onDragEnd={dragEnabled ? () => { setDraggingId(null); setDragOverSlot(null); } : undefined}
                      onClick={() => selectMode ? onTogglePick(a.id) : onSelect(a)}
                    >
                      <div className="p-1 text-[10px] font-semibold leading-tight">
                        {(a.start_time || '').slice(0, 5)}
                      </div>
                      {h > 36 ? (
                        <div className="px-1 text-[10px] leading-tight truncate opacity-80">
                          {(a.boat as { name?: string } | undefined)?.name ?? '—'}
                        </div>
                      ) : null}

                      {/* Resize handle */}
                      {isStaff && isActive(a.status) ? (
                        <div
                          className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize bg-current opacity-20 hover:opacity-40"
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            setResizing({ appt: a, startY: e.clientY, startDuration: a.duration_minutes });
                          }}
                        />
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Employee view                                                      */
/* Side-by-side columns, one per assigned employee.                   */
/* ------------------------------------------------------------------ */

function EmployeeView({
  days,
  appointments,
  staffMembers,
  onSelect,
}: {
  days: Date[];
  appointments: Appointment[];
  staffMembers: AdminUser[];
  onSelect: (a: Appointment) => void;
}) {
  // Today's date string
  const todayKey = localKey(new Date());

  // Focus on today or the first day of the week
  const focusDay = days.find((d) => localKey(d) === todayKey) ?? days[0]!;
  const focusKey = localKey(focusDay);

  const todaySlots = appointments.filter((a) => (a.appointment_date || '').slice(0, 10) === focusKey);

  // Group by employee (unassigned in a separate column)
  const employeeIds = staffMembers.map((m) => m.id);
  const columns: Array<{ id: string | null; name: string; slots: Appointment[] }> = [
    ...staffMembers.map((m) => ({
      id: m.id,
      name: m.name,
      slots: todaySlots.filter((a) => a.assigned_to_user_id === m.id),
    })),
    {
      id: null,
      name: 'Niet toegewezen',
      slots: todaySlots.filter((a) => !a.assigned_to_user_id || !employeeIds.includes(a.assigned_to_user_id ?? '')),
    },
  ].filter((c) => c.slots.length > 0 || c.id !== null);

  const gridHeight = (GRID_END_HOUR - GRID_START_HOUR) * HOUR_HEIGHT_PX;

  return (
    <div>
      <div className="border-b border-navy-100 bg-sand-50/40 px-4 py-2 text-sm font-semibold text-navy-700">
        Medewerkers — {formatDayLabel(focusDay)}
      </div>
      <div className="flex overflow-x-auto">
        {/* Hour gutter */}
        <div className="sticky left-0 z-10 flex-shrink-0 bg-white border-r border-navy-100" style={{ width: 48 }}>
          <div className="h-10 border-b border-navy-100" />
          <div className="relative" style={{ height: gridHeight }}>
            {GRID_HOURS.map((h) => (
              <div key={h} className="absolute w-full text-right pr-1.5 text-[9px] text-navy-400"
                style={{ top: (h - GRID_START_HOUR) * HOUR_HEIGHT_PX - 6 }}>
                {String(h).padStart(2, '0')}
              </div>
            ))}
          </div>
        </div>

        {/* Employee columns */}
        {columns.map((col) => (
          <div key={col.id ?? 'unassigned'} className="flex flex-1 flex-col border-r border-navy-100 last:border-r-0" style={{ minWidth: 140 }}>
            <div className="flex h-10 items-center justify-center border-b border-navy-100 bg-sand-50/40 px-2 text-xs font-semibold text-navy-700 truncate">
              <User className="mr-1 h-3 w-3 shrink-0" />
              {col.name}
            </div>
            <div className="relative" style={{ height: gridHeight }}>
              {GRID_HOURS.map((h) => (
                <div key={h} className="pointer-events-none absolute left-0 right-0 border-t border-navy-100/60"
                  style={{ top: (h - GRID_START_HOUR) * HOUR_HEIGHT_PX }} />
              ))}
              {col.slots.map((a) => {
                const top = topPx((a.start_time || '09:00').slice(0, 5));
                const h = heightPx(a.duration_minutes);
                const type = slotTypeFor(a.service_codes);
                const meta = SLOT_TYPES.find((s) => s.id === type)!;
                const toneClass = { marine: 'bg-marine-100 text-marine-900', gold: 'bg-gold-100 text-gold-900',
                  navy: 'bg-navy-100 text-navy-900', sand: 'bg-sand-200 text-sand-900' }[meta.tone];
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => onSelect(a)}
                    className={cn('absolute left-0.5 right-0.5 rounded-md p-1 text-left text-[10px] font-semibold overflow-hidden hover:brightness-95', toneClass)}
                    style={{ top, height: h }}
                  >
                    {(a.start_time || '').slice(0, 5)} {(a.boat as { name?: string } | undefined)?.name ?? ''}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Crane view                                                         */
/* Filtered to crane appointments; shows location/dock.               */
/* ------------------------------------------------------------------ */

function CraneView({
  days,
  appointments,
  isStaff,
  setDraggingId,
  onDropTimeSlot,
  onSelect,
}: {
  days: Date[];
  appointments: Appointment[];
  isStaff: boolean;
  setDraggingId: (id: string | null) => void;
  onDropTimeSlot: (dayKey: string, time: string) => void;
  onSelect: (a: Appointment) => void;
}) {
  const gridHeight = (GRID_END_HOUR - GRID_START_HOUR) * HOUR_HEIGHT_PX;
  const byDay = React.useMemo(() => {
    const map: Record<string, Appointment[]> = {};
    for (const a of appointments) {
      const k = (a.appointment_date || '').slice(0, 10);
      (map[k] ??= []).push(a);
    }
    return map;
  }, [appointments]);

  const [dragOver, setDragOver] = React.useState<{ dayKey: string; time: string } | null>(null);

  const getTime = (e: React.DragEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const y = e.clientY - rect.top;
    const mins = Math.round((y / HOUR_HEIGHT_PX) * 60 / 15) * 15 + GRID_START_HOUR * 60;
    const c = Math.max(GRID_START_HOUR * 60, Math.min((GRID_END_HOUR - 1) * 60, mins));
    return `${String(Math.floor(c / 60)).padStart(2, '0')}:${String(c % 60).padStart(2, '0')}`;
  };

  return (
    <div>
      <div className="border-b border-navy-100 bg-marine-50/40 px-4 py-2 text-sm font-semibold text-marine-800 flex items-center gap-2">
        <Ship className="h-4 w-4" />
        Kraanafspraken — {formatWeekRange(days[0]!)}
      </div>
      {appointments.length === 0 ? (
        <div className="px-5 py-12 text-center text-sm text-navy-400">Geen kraanafspraken deze week</div>
      ) : (
        <div className="flex overflow-x-auto">
          <div className="sticky left-0 z-10 flex-shrink-0 bg-white border-r border-navy-100" style={{ width: 48 }}>
            <div className="h-10 border-b border-navy-100" />
            <div className="relative" style={{ height: gridHeight }}>
              {GRID_HOURS.map((h) => (
                <div key={h} className="absolute w-full text-right pr-1.5 text-[9px] text-navy-400"
                  style={{ top: (h - GRID_START_HOUR) * HOUR_HEIGHT_PX - 6 }}>
                  {String(h).padStart(2, '0')}
                </div>
              ))}
            </div>
          </div>
          {days.map((d, i) => {
            const dayKey = localKey(d);
            const slots = byDay[dayKey] ?? [];
            const isToday = d.toDateString() === new Date().toDateString();
            return (
              <div key={i} className="flex flex-1 flex-col border-r border-navy-100 last:border-r-0" style={{ minWidth: 90 }}>
                <div className={cn('flex h-10 flex-col items-center justify-center border-b border-navy-100 text-xs',
                  isToday ? 'bg-marine-50/80' : 'bg-sand-50/40')}>
                  <span className="font-semibold uppercase tracking-widest text-navy-400">{DUTCH_DAYS[i]}</span>
                  <span className={cn('font-semibold', isToday ? 'text-marine-700' : 'text-navy-900')}>{d.getDate()}</span>
                </div>
                <div
                  className="relative"
                  style={{ height: gridHeight }}
                  onDragOver={isStaff ? (e) => { e.preventDefault(); const t = getTime(e); setDragOver({ dayKey, time: t }); } : undefined}
                  onDragLeave={isStaff ? () => setDragOver(null) : undefined}
                  onDrop={isStaff ? (e) => { const t = getTime(e); setDragOver(null); void onDropTimeSlot(dayKey, t); } : undefined}
                >
                  {GRID_HOURS.map((h) => (
                    <div key={h} className="pointer-events-none absolute left-0 right-0 border-t border-navy-100/60"
                      style={{ top: (h - GRID_START_HOUR) * HOUR_HEIGHT_PX }} />
                  ))}
                  {dragOver?.dayKey === dayKey ? (
                    <div className="pointer-events-none absolute left-1 right-1 h-0.5 bg-marine-400"
                      style={{ top: topPx(dragOver.time) }} />
                  ) : null}
                  {slots.map((a) => {
                    const top = topPx((a.start_time || '09:00').slice(0, 5));
                    const h = heightPx(a.duration_minutes);
                    const loc = a.location;
                    return (
                      <button
                        key={a.id}
                        type="button"
                        draggable={isStaff && isActive(a.status)}
                        onDragStart={isStaff ? () => setDraggingId(a.id) : undefined}
                        onDragEnd={isStaff ? () => setDraggingId(null) : undefined}
                        onClick={() => onSelect(a)}
                        className="absolute left-0.5 right-0.5 rounded-md bg-marine-100 ring-1 ring-marine-300 text-marine-900 overflow-hidden hover:brightness-95 cursor-pointer"
                        style={{ top, height: h }}
                      >
                        <div className="p-1 text-[10px] font-semibold">{(a.start_time || '').slice(0, 5)}</div>
                        {h > 36 ? <div className="px-1 text-[10px] truncate">{(a.boat as { name?: string } | undefined)?.name ?? '—'}</div> : null}
                        {h > 52 && loc?.code ? <div className="px-1 text-[10px] text-marine-600">Dok: {loc.code}</div> : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Month view                                                         */
/* ------------------------------------------------------------------ */

function MonthView({ monthFirst, gridStart, byDay, onPickDay }: {
  monthFirst: Date; gridStart: Date; byDay: Record<string, Appointment[]>; onPickDay: (d: Date) => void;
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
          <div key={dn} className="px-3 py-2 text-center font-semibold uppercase tracking-widest text-navy-400">{dn}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((d, i) => {
          const key = localKey(d);
          const slots = byDay[key] ?? [];
          const inMonth = d.getMonth() === month;
          const isToday = d.toDateString() === new Date().toDateString();
          return (
            <button type="button" key={i} onClick={() => onPickDay(d)}
              className={cn('flex min-h-[92px] flex-col items-start gap-1 border-b border-r border-navy-100 p-1.5 text-left transition hover:bg-sand-50', !inMonth && 'bg-sand-50/40 text-navy-300')}>
              <span className={cn('flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold',
                isToday ? 'bg-marine-600 text-white' : inMonth ? 'text-navy-900' : 'text-navy-300')}>
                {d.getDate()}
              </span>
              <div className="flex w-full flex-col gap-0.5">
                {slots.slice(0, 3).map((a) => {
                  const meta = SLOT_TYPES.find((s) => s.id === slotTypeFor(a.service_codes))!;
                  return (
                    <span key={a.id} className={cn('flex items-center gap-1 truncate rounded px-1 py-0.5 text-[10px]',
                      meta.tone === 'marine' && 'bg-marine-50 text-marine-800',
                      meta.tone === 'gold' && 'bg-gold-50 text-gold-800',
                      meta.tone === 'navy' && 'bg-navy-50 text-navy-800',
                      meta.tone === 'sand' && 'bg-sand-100 text-sand-800',
                      a.status.toLowerCase().includes('cancel') && 'line-through opacity-50')}>
                      {(a.start_time || '').slice(0, 5)}
                    </span>
                  );
                })}
                {slots.length > 3 ? <span className="px-1 text-[10px] font-medium text-navy-500">+{slots.length - 3}</span> : null}
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

function DayView({ slots, selectMode, picked, onTogglePick, setDraggingId, onSelect }: {
  slots: Appointment[]; selectMode: boolean; picked: Set<string>;
  onTogglePick: (id: string) => void; setDraggingId: (id: string | null) => void; onSelect: (a: Appointment) => void;
}) {
  return (
    <div className="mx-auto max-w-xl space-y-2 p-4">
      {slots.length === 0 ? (
        <div className="rounded-lg border border-dashed border-navy-100 px-4 py-10 text-center text-sm text-navy-400">—</div>
      ) : (
        slots.map((a) => (
          <SlotCard key={a.id} appt={a}
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

function AgendaView({ from, to, byDay, selectMode, picked, onTogglePick, onSelect, emptyLabel }: {
  from: Date; to: Date; byDay: Record<string, Appointment[]>; selectMode: boolean; picked: Set<string>;
  onTogglePick: (id: string) => void; onSelect: (a: Appointment) => void; emptyLabel: string;
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
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-navy-400">{formatDayLabel(d)}</div>
            <div className="space-y-2">
              {(byDay[k] ?? []).map((a) => {
                const meta = SLOT_TYPES.find((s) => s.id === slotTypeFor(a.service_codes))!;
                const boatName = (a.boat as { name?: string } | undefined)?.name ?? '—';
                return (
                  <button key={a.id} type="button"
                    onClick={() => (selectMode ? onTogglePick(a.id) : onSelect(a))}
                    className="flex w-full items-center gap-3 rounded-lg border border-navy-100 px-3 py-2 text-left text-sm transition hover:bg-sand-50">
                    {selectMode ? (
                      <span className={cn('flex h-4 w-4 shrink-0 items-center justify-center rounded border',
                        picked.has(a.id) ? 'border-marine-600 bg-marine-600 text-white' : 'border-navy-300')}>
                        {picked.has(a.id) ? <CheckSquare className="h-3 w-3" /> : null}
                      </span>
                    ) : null}
                    <span className={cn('h-2.5 w-2.5 shrink-0 rounded-full',
                      meta.tone === 'marine' && 'bg-marine-500',
                      meta.tone === 'gold' && 'bg-gold-500',
                      meta.tone === 'navy' && 'bg-navy-900',
                      meta.tone === 'sand' && 'bg-sand-500')} />
                    <span className="w-12 shrink-0 font-semibold text-navy-900">{(a.start_time || '').slice(0, 5)}</span>
                    <span className="flex-1 truncate text-navy-700">{boatName}</span>
                    {a.assigned_to?.name ? <span className="hidden shrink-0 text-xs text-navy-400 sm:inline">{a.assigned_to.name}</span> : null}
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

function BulkBar({ count, staffMembers, loading, onCancel, onAssign, onStatus, onClear }: {
  count: number; staffMembers: AdminUser[]; loading: boolean;
  onCancel: () => void; onAssign: (uid: string) => void; onStatus: (status: string) => void; onClear: () => void;
}) {
  const { t } = useIntl();
  const [assignee, setAssignee] = React.useState('');
  const [status, setStatus] = React.useState('');
  return (
    <div className="sticky bottom-0 z-30 border-t border-navy-100 bg-white/95 backdrop-blur">
      <div className="container-wide flex flex-wrap items-center gap-3 py-3">
        <span className="text-sm font-semibold text-navy-900">{t('planning.bulkSelected', { count: String(count) })}</span>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1">
            <AdminSelect value={assignee} onChange={setAssignee} className="lg:min-w-[150px]">
              <option value="">{t('planning.bulkAssignPlaceholder')}</option>
              {staffMembers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </AdminSelect>
            <Button variant="outline" size="sm" disabled={!assignee || loading} onClick={() => onAssign(assignee)}>
              {t('planning.bulkAssign')}
            </Button>
          </div>
          <div className="flex items-center gap-1">
            <AdminSelect value={status} onChange={setStatus} className="lg:min-w-[150px]">
              <option value="">{t('planning.bulkStatusPlaceholder')}</option>
              <option value="confirmed">{t('planning.statusConfirmed')}</option>
              <option value="planned">Ingepland</option>
              <option value="completed">{t('planning.statusCompleted')}</option>
            </AdminSelect>
            <Button variant="outline" size="sm" disabled={!status || loading} onClick={() => onStatus(status)}>
              {t('planning.bulkSetStatus')}
            </Button>
          </div>
          <Button variant="danger" size="sm" disabled={loading} onClick={onCancel}>{t('planning.bulkCancel')}</Button>
          <button type="button" onClick={onClear} className="rounded-md border border-navy-100 p-1.5 text-navy-500 hover:bg-sand-100" aria-label={t('planning.bulkClear')}>
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

function CreateAppointmentModal({ open, onClose, staffMembers, onCreated }: {
  open: boolean; onClose: () => void; staffMembers: AdminUser[]; onCreated: () => void | Promise<void>;
}) {
  const { t } = useIntl();
  const { push } = useToast();

  const customersQuery = useQuery<{ data: Customer[] }>([open], async () => (open ? customersService.list({ per_page: 200 }) : { data: [] }), { immediate: false });
  const boatsQuery = useQuery<{ data: Boat[] }>([open], async () => (open ? boatsService.list({ per_page: 200 }) : { data: [] }), { immediate: false });
  const locationsQuery = useQuery<BoatLocation[]>([open], async () => (open ? calendarService.locations() : []), { immediate: false });

  React.useEffect(() => {
    if (open) { void customersQuery.refetch(); void boatsQuery.refetch(); void locationsQuery.refetch(); }
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
  const [conflicts, setConflicts] = React.useState<Array<Record<string, unknown>> | null>(null);
  const [confirmAnyway, setConfirmAnyway] = React.useState(false);
  const [checking, setChecking] = React.useState(false);
  const create = useMutation(appointmentsService.create);

  React.useEffect(() => {
    if (open) { setCustomerId(''); setBoatId(''); setServiceCode('kraan'); setDate(''); setStartTime('09:00'); setDuration('60'); setLocationId(''); setAssignee(''); setConflicts(null); setConfirmAnyway(false); }
  }, [open]);

  React.useEffect(() => { setConflicts(null); setConfirmAnyway(false); }, [date, startTime, duration, locationId]);

  const boats = customerId ? allBoats.filter((b) => b.customer_id === customerId) : allBoats;
  const canSubmit = customerId && boatId && date && startTime && serviceCode;
  const hasConflicts = (conflicts?.length ?? 0) > 0;

  const submit = async () => {
    if (!canSubmit) return;
    if (conflicts === null) {
      setChecking(true);
      try {
        const res = await appointmentsService.checkConflicts({ date, start_time: startTime, duration_minutes: Number(duration) || undefined, location_id: locationId || null });
        setConflicts(res.conflicts ?? []);
        if (res.has_conflicts && (res.conflicts?.length ?? 0) > 0) { setChecking(false); return; }
      } catch (err) { setChecking(false); push({ tone: 'error', title: t('planning.actionFailed'), message: getApiErrorMessage(err) }); return; }
      setChecking(false);
    } else if (hasConflicts && !confirmAnyway) return;

    try {
      await create.mutate({ customer_id: customerId, boat_id: boatId, service_codes: [serviceCode], appointment_date: date, start_time: startTime, duration_minutes: Number(duration) || undefined, location_id: locationId || null, assigned_to_user_id: assignee || null });
      await onCreated();
    } catch (err) { push({ tone: 'error', title: t('planning.actionFailed'), message: getApiErrorMessage(err) }); }
  };

  return (
    <Modal open={open} onClose={onClose} size="lg" className="p-6">
      <h3 className="font-display text-xl text-navy-900">{t('planning.createTitle')}</h3>
      <p className="mt-1 text-sm text-navy-500">{t('planning.createSubtitle')}</p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-navy-700">{t('planning.fieldCustomer')}</span>
          <select className="input-base w-full" value={customerId} onChange={(e) => { setCustomerId(e.target.value); setBoatId(''); }}>
            <option value="">{t('planning.selectPlaceholder')}</option>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-navy-700">{t('planning.fieldBoat')}</span>
          <select className="input-base w-full" value={boatId} onChange={(e) => setBoatId(e.target.value)}>
            <option value="">{t('planning.selectPlaceholder')}</option>
            {boats.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-navy-700">{t('planning.fieldService')}</span>
          <select className="input-base w-full" value={serviceCode} onChange={(e) => setServiceCode(e.target.value)}>
            {SERVICE_FILTERS.map((s) => <option key={s.code} value={s.code}>{t(s.labelKey)}</option>)}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-navy-700">{t('planning.fieldLocation')}</span>
          <select className="input-base w-full" value={locationId} onChange={(e) => setLocationId(e.target.value)}>
            <option value="">{t('planning.selectPlaceholder')}</option>
            {locations.map((l) => <option key={l.id} value={l.id}>{l.code}</option>)}
          </select>
        </label>
        <Input label={t('planning.fieldDate')} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <Input label={t('planning.fieldStartTime')} type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
        <Input label={t('planning.fieldDuration')} type="number" min={15} step={15} value={duration} onChange={(e) => setDuration(e.target.value)} />
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-navy-700">{t('planning.fieldAssignee')}</span>
          <select className="input-base w-full" value={assignee} onChange={(e) => setAssignee(e.target.value)}>
            <option value="">{t('planning.unassigned')}</option>
            {staffMembers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </label>
      </div>
      {hasConflicts ? (
        <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          <div className="font-semibold">{t('planning.conflictTitle')}</div>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs">
            {conflicts!.map((c, i) => {
              const time = (c.start_time as string | undefined) ?? (c.appointment_date as string | undefined) ?? '';
              const label = (c.boat_name as string | undefined) ?? (c.customer_name as string | undefined) ?? (c.id as string | undefined) ?? t('planning.appointment');
              return <li key={i}>{time ? `${String(time).slice(0, 16)} · ` : ''}{label}</li>;
            })}
          </ul>
          <label className="mt-2 flex items-center gap-2 text-xs font-medium text-amber-900">
            <input type="checkbox" checked={confirmAnyway} onChange={(e) => setConfirmAnyway(e.target.checked)} />
            {t('planning.conflictConfirmAnyway')}
          </label>
        </div>
      ) : null}
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>{t('planning.cancel')}</Button>
        <Button variant="gold" onClick={() => void submit()} disabled={!canSubmit || checking || create.loading || (hasConflicts && !confirmAnyway)}>
          {checking ? t('planning.checking') : t('planning.createConfirm')}
        </Button>
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Slot card (used in Day view / Agenda)                              */
/* ------------------------------------------------------------------ */

function SlotCard({ appt, onClick, draggable, onDragStart, onDragEnd, selectMode, picked, wide }: {
  appt: Appointment; onClick: () => void; draggable?: boolean; onDragStart?: () => void; onDragEnd?: () => void;
  selectMode?: boolean; picked?: boolean; wide?: boolean;
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
    <button type="button" onClick={onClick} draggable={draggable} onDragStart={onDragStart} onDragEnd={onDragEnd}
      className={cn('w-full rounded-md p-2 text-left ring-1 ring-inset transition hover:brightness-95',
        wide ? 'text-xs' : 'text-[11px]',
        draggable && 'cursor-grab active:cursor-grabbing',
        tones[meta.tone],
        picked && 'ring-2 ring-marine-500',
        cancelled && 'opacity-50 line-through')}>
      <div className="flex items-center gap-1 font-semibold">
        {selectMode ? (
          <span className={cn('flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border', picked ? 'border-marine-600 bg-marine-600 text-white' : 'border-navy-300 bg-white')}>
            {picked ? <CheckSquare className="h-2.5 w-2.5" /> : null}
          </span>
        ) : <Icon className="h-3 w-3" />}
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
