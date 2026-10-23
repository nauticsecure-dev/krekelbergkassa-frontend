import type { EventInput } from '@fullcalendar/core';
import type { Appointment } from '@/lib/api-types';

export type CalendarView = 'day' | 'week' | 'month';

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

const STATUS_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  pending_manual_review: { bg: '#fef3c7', border: '#d97706', text: '#92400e' },
  requested: { bg: '#fef3c7', border: '#d97706', text: '#92400e' },
  confirmed: { bg: '#e0f2fe', border: '#0284c7', text: '#0c4a6e' },
  planned: { bg: '#dbeafe', border: '#1d4ed8', text: '#1e3a8a' },
  started: { bg: '#fef9c3', border: '#ca8a04', text: '#854d0e' },
  out_of_water: { bg: '#ffedd5', border: '#ea580c', text: '#9a3412' },
  in_water: { bg: '#cffafe', border: '#0891b2', text: '#155e75' },
  wash_started: { bg: '#fef9c3', border: '#ca8a04', text: '#854d0e' },
  completed: { bg: '#dcfce7', border: '#16a34a', text: '#166534' },
  cancelled: { bg: '#f1f5f9', border: '#94a3b8', text: '#64748b' },
  no_show: { bg: '#fee2e2', border: '#e11d48', text: '#9f1239' },
};

const LOCKED_STATUSES = new Set(['completed', 'cancelled', 'no_show']);

export function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function formatLocalTime(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function parseDateKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

export function normalizeDateKey(value: string | null | undefined): string {
  if (value && DATE_KEY.test(value)) {
    const parsed = parseDateKey(value);
    if (!Number.isNaN(parsed.getTime()) && localDateKey(parsed) === value) return value;
  }
  return localDateKey(new Date());
}

export function normalizeView(value: string | null | undefined): CalendarView {
  if (value === 'day' || value === 'week' || value === 'month') return value;
  return 'week';
}

export function addDays(date: Date, count: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + count);
  return next;
}

export function startOfWeek(date: Date): Date {
  const start = new Date(date);
  const offset = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - offset);
  start.setHours(0, 0, 0, 0);
  return start;
}

/** Inclusive start and exclusive end, matching FullCalendar's visible range. */
export function calendarQueryRange(anchor: string, view: CalendarView): { from: string; to: string } {
  const date = parseDateKey(anchor);
  if (view === 'day') {
    return { from: localDateKey(date), to: localDateKey(addDays(date, 1)) };
  }
  if (view === 'week') {
    const from = startOfWeek(date);
    return { from: localDateKey(from), to: localDateKey(addDays(from, 7)) };
  }
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const from = startOfWeek(first);
  return { from: localDateKey(from), to: localDateKey(addDays(from, 42)) };
}

export function fcViewName(view: CalendarView): string {
  if (view === 'day') return 'timeGridDay';
  if (view === 'month') return 'dayGridMonth';
  return 'timeGridWeek';
}

export function viewFromFc(type: string): CalendarView {
  if (type === 'timeGridDay') return 'day';
  if (type === 'dayGridMonth') return 'month';
  return 'week';
}

export function appointmentIsLocked(status: string): boolean {
  return LOCKED_STATUSES.has(status);
}

function eventTitle(appointment: Appointment): string {
  const boat = appointment.boat?.name ?? '—';
  const customer = appointment.customer?.name;
  const services = appointment.service_codes?.filter(Boolean).join(', ');
  const who = customer ? `${customer} — ${boat}` : boat;
  return services ? `${who} · ${services}` : who;
}

function clock(value: string | null | undefined, fallback: string): string {
  const sliced = (value || '').slice(0, 5);
  return /^\d{2}:\d{2}$/.test(sliced) ? sliced : fallback;
}

export function appointmentToEvent(appointment: Appointment): EventInput {
  const date = (appointment.appointment_date || '').slice(0, 10) || localDateKey(new Date());
  const startTime = clock(appointment.start_time, '09:00');
  let endTime = clock(appointment.end_time, '');
  if (!endTime) {
    const [hours, minutes] = startTime.split(':').map(Number);
    const total = hours * 60 + minutes + (appointment.duration_minutes || 60);
    endTime = `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
  }
  if (endTime <= startTime) {
    const [hours, minutes] = startTime.split(':').map(Number);
    const total = hours * 60 + minutes + Math.max(appointment.duration_minutes || 30, 30);
    endTime = `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
  }
  const colors = STATUS_COLORS[appointment.status] ?? { bg: '#e2e8f0', border: '#64748b', text: '#1e293b' };
  const locked = appointmentIsLocked(appointment.status);
  return {
    id: appointment.id,
    title: eventTitle(appointment),
    start: `${date}T${startTime}:00`,
    end: `${date}T${endTime}:00`,
    backgroundColor: colors.bg,
    borderColor: colors.border,
    textColor: colors.text,
    editable: !locked,
    startEditable: !locked,
    durationEditable: !locked,
    classNames: locked ? ['is-locked'] : [],
    extendedProps: {
      status: appointment.status,
      locationId: appointment.location_id,
    },
  };
}
