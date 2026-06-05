'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Droplets,
  Hammer,
  Ship,
  Warehouse,
} from 'lucide-react';
import { SimpleHero } from '@/components/site/SimpleHero';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { LoadingState, ErrorState } from '@/components/admin/DataState';
import { useIntl } from '@/i18n/IntlProvider';
import { useAuth } from '@/lib/auth-context';
import { canAccessAdmin, loginPath } from '@/lib/auth-routes';
import { useQuery, useMutation } from '@/lib/hooks/useAsync';
import { appointmentsService, portalService } from '@/lib/services';
import type { Appointment } from '@/lib/api-types';
import { useToast } from '@/components/ui/ToastProvider';
import { getApiErrorMessage } from '@/lib/api-error';
import { cn } from '@/lib/cn';

const DUTCH_DAYS = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'];

type SlotType = 'crane' | 'wash' | 'storage' | 'maintenance';

const SLOT_TYPES: { id: SlotType; label: string; icon: typeof Ship; tone: string }[] = [
  { id: 'crane', label: 'Kraan', icon: Ship, tone: 'marine' },
  { id: 'wash', label: 'Afspuiten', icon: Droplets, tone: 'gold' },
  { id: 'storage', label: 'Stalling', icon: Warehouse, tone: 'navy' },
  { id: 'maintenance', label: 'Onderhoud', icon: Hammer, tone: 'sand' },
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

function localKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatRange(start: Date) {
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const mNL = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
  return `${start.getDate()} ${mNL[start.getMonth()]} – ${end.getDate()} ${mNL[end.getMonth()]} ${end.getFullYear()}`;
}

function statusTone(status: string): 'success' | 'warning' | 'navy' | 'danger' {
  const s = status.toLowerCase();
  if (s.includes('cancel')) return 'danger';
  if (s.includes('complete')) return 'success';
  if (s.includes('pending') || s.includes('review')) return 'warning';
  return 'navy';
}

function isActive(status: string) {
  const s = status.toLowerCase();
  return !s.includes('cancel') && !s.includes('complete');
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

  const [base, setBase] = React.useState(() => startOfWeek(new Date()));
  const [selected, setSelected] = React.useState<Appointment | null>(null);
  const [cancelFor, setCancelFor] = React.useState<Appointment | null>(null);

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    return d;
  });

  // Staff/admin see all appointments; customers only their own (portal).
  const query = useQuery<{ data: Appointment[] }>(
    [isStaff, Boolean(user)],
    async () => {
      if (!user) return { data: [] };
      return isStaff
        ? appointmentsService.list({ per_page: 200 })
        : portalService.appointments({ per_page: 100 });
    },
    { immediate: Boolean(user) }
  );

  const appointments = React.useMemo(() => query.data?.data ?? [], [query.data]);

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

  // Trello #99: staff drag/drop reschedule between days.
  const [draggingId, setDraggingId] = React.useState<string | null>(null);
  const [dragOverKey, setDragOverKey] = React.useState<string | null>(null);

  const refetch = query.refetch;

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
    next.setDate(base.getDate() + delta * 7);
    setBase(next);
  };

  // Index appointments by day key for the current week.
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

  const weekCounts = React.useMemo(() => {
    const counts: Record<SlotType, number> = { crane: 0, wash: 0, storage: 0, maintenance: 0 };
    const weekKeys = new Set(days.map(localKey));
    for (const a of appointments) {
      if (!isActive(a.status)) continue;
      if (!weekKeys.has((a.appointment_date || '').slice(0, 10))) continue;
      counts[slotTypeFor(a.service_codes)] += 1;
    }
    return counts;
  }, [appointments, days]);

  if (authLoading || !user) {
    return (
      <div className="container-wide py-24">
        <LoadingState label={t('planning.loading')} />
      </div>
    );
  }

  return (
    <>
      <SimpleHero
        badge={t('planning.badge')}
        title={isStaff ? t('planning.titleStaff') : t('planning.titleCustomer')}
        subtitle={isStaff ? t('planning.subtitleStaff') : t('planning.subtitleCustomer')}
      />

      {/* Legend stats — live counts for this week */}
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
                <div className="text-lg font-semibold text-navy-900">
                  {weekCounts[st.id]}
                </div>
              </div>
            </Card>
          );
        })}
      </section>

      {/* Calendar */}
      <section className="container-wide py-12">
        {query.error ? (
          <ErrorState message={query.error} onRetry={refetch} />
        ) : null}
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
                  onClick={() => setBase(startOfWeek(new Date()))}
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
              <div className="text-sm font-semibold text-navy-900">{formatRange(base)}</div>
            </div>
            <Link href={`/${locale}/kraanafspraak`}>
              <Button variant="gold" size="sm" rightIcon={<ArrowRight className="h-4 w-4" />}>
                {t('planning.newAppointment')}
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-7 border-b border-navy-100 bg-sand-50/40 text-xs">
            {days.map((d, i) => {
              const isToday = d.toDateString() === new Date().toDateString();
              return (
                <div
                  key={i}
                  className={cn(
                    'flex flex-col items-center gap-0.5 px-3 py-3',
                    isToday && 'bg-marine-50/60'
                  )}
                >
                  <span className="font-semibold uppercase tracking-widest text-navy-400">
                    {DUTCH_DAYS[i]}
                  </span>
                  <span
                    className={cn(
                      'text-sm font-semibold',
                      isToday ? 'text-marine-700' : 'text-navy-900'
                    )}
                  >
                    {d.getDate()}
                  </span>
                </div>
              );
            })}
          </div>

          {query.loading ? (
            <div className="p-8">
              <LoadingState label={t('planning.loading')} />
            </div>
          ) : (
            <div className="grid min-h-[460px] grid-cols-7 divide-x divide-navy-100">
              {days.map((d, dayIdx) => {
                const dayKey = localKey(d);
                const slots = byDay[dayKey] ?? [];
                return (
                  <div
                    key={dayIdx}
                    className={cn(
                      'space-y-2 p-2 transition',
                      isStaff && dragOverKey === dayKey && 'bg-marine-50/70 ring-2 ring-inset ring-marine-300'
                    )}
                    onDragOver={
                      isStaff
                        ? (e) => {
                            e.preventDefault();
                            if (dragOverKey !== dayKey) setDragOverKey(dayKey);
                          }
                        : undefined
                    }
                    onDragLeave={
                      isStaff
                        ? () => setDragOverKey((k) => (k === dayKey ? null : k))
                        : undefined
                    }
                    onDrop={isStaff ? () => void onDropDay(dayKey) : undefined}
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
                        onClick={() => setSelected(a)}
                        draggable={isStaff && isActive(a.status)}
                        onDragStart={() => setDraggingId(a.id)}
                        onDragEnd={() => {
                          setDraggingId(null);
                          setDragOverKey(null);
                        }}
                      />
                    ))}
                  </div>
                );
              })}
            </div>
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
              </div>
              <Badge tone={statusTone(selected.status)}>{selected.status}</Badge>
            </div>

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
                    onClick={() =>
                      runAction(() => confirm.mutate(selected.id), 'planning.confirmed')
                    }
                    disabled={confirm.loading}
                  >
                    {t('planning.confirm')}
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
                  <Button
                    variant="danger"
                    onClick={() => setCancelFor(selected)}
                  >
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

function SlotCard({
  appt,
  onClick,
  draggable,
  onDragStart,
  onDragEnd,
}: {
  appt: Appointment;
  onClick: () => void;
  draggable?: boolean;
  onDragStart?: () => void;
  onDragEnd?: () => void;
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
        'w-full rounded-md p-2 text-left text-[11px] ring-1 ring-inset transition hover:brightness-95',
        draggable && 'cursor-grab active:cursor-grabbing',
        tones[meta.tone],
        cancelled && 'opacity-50 line-through'
      )}
    >
      <div className="flex items-center gap-1 font-semibold">
        <Icon className="h-3 w-3" />
        {(appt.start_time || '').slice(0, 5)}
        <Clock className="ml-auto h-3 w-3 opacity-50" />
      </div>
      <div className="mt-0.5 line-clamp-1 text-navy-700">{boatName}</div>
    </button>
  );
}
