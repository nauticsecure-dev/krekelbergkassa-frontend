'use client';

import * as React from 'react';
import {
  CalendarDays,
  Clock,
  MapPin,
  UtensilsCrossed,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';
import type { BoatLocation, OpeningHour } from '@/lib/api-types';
import { formatTimeRange, parseTimeToMinutes } from '@/lib/time';

const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;
const TIMELINE_START = 6 * 60;
const TIMELINE_END = 20 * 60;
const TIMELINE_RANGE = TIMELINE_END - TIMELINE_START;

function barStyle(from: string | null, until: string | null) {
  const start = parseTimeToMinutes(from);
  const end = parseTimeToMinutes(until);
  if (start == null || end == null || end <= start) return null;
  const clampedStart = Math.max(start, TIMELINE_START);
  const clampedEnd = Math.min(end, TIMELINE_END);
  if (clampedEnd <= clampedStart) return null;
  const left = ((clampedStart - TIMELINE_START) / TIMELINE_RANGE) * 100;
  const width = ((clampedEnd - clampedStart) / TIMELINE_RANGE) * 100;
  return { left: `${left}%`, width: `${width}%` };
}

function shortDay(label: string) {
  return label.slice(0, 2);
}

function formatExceptionDate(value: string | null | undefined, locale?: string) {
  if (!value) return { day: '—', month: '' };
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    const parts = value.slice(0, 10).split('-');
    return { day: parts[2] ?? '—', month: parts[1] ?? '' };
  }
  return {
    day: d.toLocaleDateString(locale, { day: 'numeric' }),
    month: d.toLocaleDateString(locale, { month: 'short', year: 'numeric' }),
  };
}

export function WeeklyHoursGrid({
  regular,
  lunch,
  dayLabel,
  closedLabel,
  todayDay,
  todayLabel,
  onDayClick,
}: {
  regular: OpeningHour[];
  lunch: OpeningHour | null;
  dayLabel: (day: number) => string;
  closedLabel: string;
  todayDay: number;
  todayLabel?: string;
  onDayClick?: (day: number) => void;
}) {
  const byDay = React.useMemo(() => {
    const map = new Map<number, OpeningHour>();
    for (const row of regular) {
      if (row.day_of_week != null) map.set(row.day_of_week, row);
    }
    return map;
  }, [regular]);

  const lunchBar = lunch ? barStyle(lunch.open_from, lunch.open_until) : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-[10px] font-medium uppercase tracking-wider text-navy-400">
        <span>06:00</span>
        <span>12:00</span>
        <span>20:00</span>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        {WEEK_ORDER.map((day) => {
          const row = byDay.get(day);
          const isClosed = !row || row.is_closed;
          const openBar = !isClosed ? barStyle(row.open_from, row.open_until) : null;
          const isToday = day === todayDay;

          return (
            <div
              key={day}
              role={onDayClick ? 'button' : undefined}
              tabIndex={onDayClick ? 0 : undefined}
              onClick={onDayClick ? () => onDayClick(day) : undefined}
              onKeyDown={
                onDayClick
                  ? (e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onDayClick(day);
                      }
                    }
                  : undefined
              }
              className={cn(
                'group relative flex flex-col rounded-xl border p-3 transition',
                onDayClick && 'cursor-pointer',
                isToday
                  ? 'border-marine-300 bg-marine-50/50 shadow-sm ring-1 ring-marine-200/60'
                  : 'border-navy-100 bg-sand-50/40 hover:border-navy-200 hover:bg-white'
              )}
            >
              <div className="mb-3 flex items-center justify-between gap-1">
                <span
                  className={cn(
                    'text-xs font-bold uppercase tracking-wide',
                    isToday ? 'text-marine-800' : 'text-navy-700'
                  )}
                >
                  {shortDay(dayLabel(day))}
                </span>
                {isToday ? (
                  <span className="rounded-full bg-marine-600 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-white">
                    {todayLabel ?? '•'}
                  </span>
                ) : null}
              </div>

              <div className="relative h-24 overflow-hidden rounded-lg bg-navy-100/40">
                <div className="absolute inset-0 opacity-40">
                  {[0, 25, 50, 75, 100].map((p) => (
                    <div
                      key={p}
                      className="absolute inset-y-0 w-px bg-navy-200/80"
                      style={{ left: `${p}%` }}
                    />
                  ))}
                </div>

                {openBar ? (
                  <div
                    className="absolute top-3 bottom-3 rounded-md bg-gradient-to-b from-marine-400 to-marine-600 shadow-sm"
                    style={openBar}
                    title={`${row?.open_from} – ${row?.open_until}`}
                  />
                ) : (
                  <div className="absolute inset-3 flex items-center justify-center rounded-md border border-dashed border-navy-200/80 bg-white/50">
                    <span className="text-[10px] font-medium text-navy-400">{closedLabel}</span>
                  </div>
                )}

                {lunchBar && openBar ? (
                  <div
                    className="absolute top-1 bottom-1 z-10 rounded-sm border border-amber-300/80 bg-amber-300/35"
                    style={lunchBar}
                    aria-hidden
                  />
                ) : null}
              </div>

              <p className="mt-2 text-center text-[11px] font-medium text-navy-600">
                {isClosed
                  ? closedLabel
                  : formatTimeRange(row?.open_from, row?.open_until)}
              </p>
            </div>
          );
        })}
      </div>

      {lunch ? (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200/80 bg-amber-50/60 px-3 py-2 text-xs text-amber-900">
          <UtensilsCrossed className="h-3.5 w-3.5 shrink-0" />
          <span>{formatTimeRange(lunch.open_from, lunch.open_until)}</span>
        </div>
      ) : null}
    </div>
  );
}

export function ExceptionsStrip({
  exceptions,
  closedLabel,
  openLabel,
  emptyTitle,
  emptyMessage,
  onAdd,
  addLabel,
  dateLocale,
}: {
  exceptions: OpeningHour[];
  closedLabel: string;
  openLabel: string;
  emptyTitle: string;
  emptyMessage: string;
  onAdd: () => void;
  addLabel: string;
  dateLocale?: string;
}) {
  if (exceptions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-navy-200 bg-sand-50/50 px-6 py-10 text-center">
        <CalendarDays className="mb-3 h-8 w-8 text-navy-300" />
        <p className="text-sm font-semibold text-navy-800">{emptyTitle}</p>
        <p className="mt-1 max-w-sm text-xs text-navy-500">{emptyMessage}</p>
        <Button size="sm" variant="outline" className="mt-4" onClick={onAdd}>
          {addLabel}
        </Button>
      </div>
    );
  }

  const sorted = [...exceptions].sort((a, b) => {
    const da = a.specific_date ?? '';
    const db = b.specific_date ?? '';
    return da.localeCompare(db);
  });

  return (
    <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-thin">
      {sorted.map((row) => {
        const { day, month } = formatExceptionDate(row.specific_date, dateLocale);
        return (
          <article
            key={row.id}
            className="min-w-[168px] shrink-0 rounded-xl border border-navy-100 bg-gradient-to-br from-white to-sand-50/80 p-3 shadow-sm"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="rounded-lg bg-navy-900 px-2 py-1 text-center text-white">
                <div className="text-[10px] font-medium uppercase opacity-80">{month}</div>
                <div className="text-lg font-bold leading-none">{day}</div>
              </div>
              <Badge tone={row.is_closed ? 'danger' : 'marine'}>
                {row.is_closed ? closedLabel : openLabel}
              </Badge>
            </div>
            {row.label ? (
              <p className="mt-2 truncate text-xs font-medium text-navy-800">{row.label}</p>
            ) : null}
            <p className="mt-1 flex items-center gap-1 text-[11px] text-navy-500">
              <Clock className="h-3 w-3" />
              {row.is_closed
                ? closedLabel
                : formatTimeRange(row.open_from, row.open_until)}
            </p>
          </article>
        );
      })}
    </div>
  );
}

export function LunchTimeline({
  lunch,
  closedLabel,
  noLunchLabel,
}: {
  lunch: OpeningHour | null;
  closedLabel: string;
  noLunchLabel: string;
}) {
  if (!lunch) {
    return (
      <div className="flex h-full min-h-[120px] flex-col items-center justify-center rounded-xl border border-dashed border-navy-200 bg-sand-50/40 px-4 text-center">
        <UtensilsCrossed className="mb-2 h-7 w-7 text-navy-300" />
        <p className="text-sm text-navy-500">{noLunchLabel}</p>
      </div>
    );
  }

  const bar = barStyle(lunch.open_from, lunch.open_until);

  return (
    <div className="space-y-3">
      <div className="relative h-14 overflow-hidden rounded-xl bg-navy-100/40">
        <div className="absolute inset-0 opacity-40">
          {[0, 25, 50, 75, 100].map((p) => (
            <div
              key={p}
              className="absolute inset-y-0 w-px bg-navy-200/80"
              style={{ left: `${p}%` }}
            />
          ))}
        </div>
        {bar ? (
          <div
            className="absolute top-2 bottom-2 rounded-lg border border-amber-300 bg-gradient-to-r from-amber-200 to-amber-300 shadow-sm"
            style={bar}
          />
        ) : (
          <div className="absolute inset-2 flex items-center justify-center text-xs text-navy-400">
            {closedLabel}
          </div>
        )}
      </div>
      <p className="text-center text-sm font-semibold text-navy-800">
        {formatTimeRange(lunch.open_from, lunch.open_until)}
      </p>
    </div>
  );
}

const DIFFICULTY_TONE: Record<string, 'success' | 'warning' | 'danger' | 'marine'> = {
  easy: 'success',
  medium: 'warning',
  difficult: 'danger',
  hall: 'marine',
};

export function LocationCardGrid({
  locations,
  onEdit,
  editLabel,
  blockedLabel,
  openLabel,
}: {
  locations: BoatLocation[];
  onEdit: (row: BoatLocation) => void;
  editLabel: string;
  blockedLabel: string;
  openLabel: string;
}) {
  if (locations.length === 0) return null;

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {locations.map((row) => (
        <article
          key={row.id}
          className={cn(
            'group relative overflow-hidden rounded-xl border p-4 transition hover:-translate-y-0.5 hover:shadow-md',
            row.is_blocked
              ? 'border-rose-200 bg-rose-50/30'
              : 'border-navy-100 bg-white hover:border-marine-200'
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-lg',
                  row.is_blocked ? 'bg-rose-100 text-rose-700' : 'bg-marine-50 text-marine-700'
                )}
              >
                <MapPin className="h-4 w-4" />
              </span>
              <div>
                <div className="font-display text-lg font-semibold text-navy-900">{row.code}</div>
                {row.section ? (
                  <div className="text-xs text-navy-500">{row.section}</div>
                ) : null}
              </div>
            </div>
            <Badge tone={row.is_blocked ? 'danger' : 'success'}>
              {row.is_blocked ? blockedLabel : openLabel}
            </Badge>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge tone={DIFFICULTY_TONE[row.difficulty] ?? 'navy'}>{row.difficulty}</Badge>
            {row.extra_minutes > 0 ? (
              <span className="text-[11px] text-navy-500">+{row.extra_minutes} min</span>
            ) : null}
          </div>

          {row.notes ? (
            <p className="mt-2 line-clamp-2 text-xs text-navy-500">{row.notes}</p>
          ) : null}

          <Button
            size="sm"
            variant="ghost"
            className="mt-3 w-full opacity-80 group-hover:opacity-100"
            onClick={() => onEdit(row)}
          >
            {editLabel}
          </Button>
        </article>
      ))}
    </div>
  );
}
