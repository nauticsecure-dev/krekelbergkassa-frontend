'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Droplets,
  Ship,
  Warehouse,
  Hammer,
} from 'lucide-react';
import { SimpleHero } from '@/components/site/SimpleHero';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useIntl } from '@/i18n/IntlProvider';
import { cn } from '@/lib/cn';

const DUTCH_DAYS = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'];
const SLOT_TYPES = [
  { id: 'crane', label: 'Kraan', icon: Ship, tone: 'marine', count: 18 },
  { id: 'wash', label: 'Afspuiten', icon: Droplets, tone: 'gold', count: 9 },
  { id: 'storage', label: 'Stalling', icon: Warehouse, tone: 'navy', count: 5 },
  { id: 'maintenance', label: 'Onderhoud', icon: Hammer, tone: 'sand', count: 3 },
];

interface Slot {
  day: number; // 1-7
  start: string;
  durationMin: number;
  type: 'crane' | 'wash' | 'storage' | 'maintenance';
  boat: string;
}

const SLOTS: Slot[] = [
  { day: 1, start: '08:30', durationMin: 30, type: 'crane', boat: 'Aquila 8.9m' },
  { day: 1, start: '09:30', durationMin: 20, type: 'wash', boat: 'Aquila 8.9m' },
  { day: 2, start: '10:00', durationMin: 30, type: 'crane', boat: 'Sea Breeze' },
  { day: 2, start: '13:30', durationMin: 45, type: 'storage', boat: 'Atalanta 12.6m' },
  { day: 3, start: '09:00', durationMin: 30, type: 'crane', boat: 'Mistral' },
  { day: 3, start: '11:00', durationMin: 20, type: 'wash', boat: 'Mistral' },
  { day: 4, start: '08:30', durationMin: 60, type: 'maintenance', boat: 'Vento' },
  { day: 5, start: '09:30', durationMin: 30, type: 'crane', boat: 'Aurora' },
  { day: 5, start: '14:00', durationMin: 30, type: 'crane', boat: 'Triton' },
  { day: 6, start: '09:00', durationMin: 20, type: 'wash', boat: 'Calypso' },
];

function startOfWeek(d: Date) {
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1 - day);
  const out = new Date(d);
  out.setDate(d.getDate() + diff);
  out.setHours(0, 0, 0, 0);
  return out;
}

function formatRange(start: Date) {
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const mNL = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
  return `${start.getDate()} ${mNL[start.getMonth()]} – ${end.getDate()} ${mNL[end.getMonth()]} ${end.getFullYear()}`;
}

export default function PlanningPage() {
  const { locale } = useIntl();
  const [base, setBase] = React.useState(() => startOfWeek(new Date()));

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    return d;
  });

  const move = (delta: number) => {
    const next = new Date(base);
    next.setDate(base.getDate() + delta * 7);
    setBase(next);
  };

  return (
    <>
      <SimpleHero
        badge="Planning"
        title="Kraan- en werfplanning"
        subtitle="Bekijk live de werkverdeling op de werf en plan uw afspraak in een open slot."
      />

      {/* Legend stats */}
      <section className="container-wide -mt-10 grid gap-3 sm:grid-cols-4">
        {SLOT_TYPES.map((t) => {
          const Icon = t.icon;
          return (
            <Card key={t.id} className="flex items-center gap-3 p-4">
              <span
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-lg',
                  t.tone === 'marine' && 'bg-marine-50 text-marine-700',
                  t.tone === 'gold' && 'bg-gold-50 text-gold-700',
                  t.tone === 'navy' && 'bg-navy-50 text-navy-700',
                  t.tone === 'sand' && 'bg-sand-100 text-sand-800'
                )}
              >
                <Icon className="h-5 w-5" />
              </span>
              <div className="flex-1">
                <div className="text-xs text-navy-500">{t.label} deze week</div>
                <div className="text-lg font-semibold text-navy-900">
                  {t.count} slots
                </div>
              </div>
              <Badge tone="success" dot>
                Open
              </Badge>
            </Card>
          );
        })}
      </section>

      {/* Calendar */}
      <section className="container-wide py-12">
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-navy-100 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => move(-1)}
                  className="rounded-md border border-navy-100 p-1.5 text-navy-700 hover:bg-sand-100"
                  aria-label="Vorige week"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setBase(startOfWeek(new Date()))}
                  className="rounded-md border border-navy-100 px-3 py-1.5 text-xs font-medium text-navy-700 hover:bg-sand-100"
                >
                  Vandaag
                </button>
                <button
                  onClick={() => move(1)}
                  className="rounded-md border border-navy-100 p-1.5 text-navy-700 hover:bg-sand-100"
                  aria-label="Volgende week"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              <div className="text-sm font-semibold text-navy-900">
                {formatRange(base)}
              </div>
            </div>
            <Link href={`/${locale}/kraanafspraak`}>
              <Button variant="gold" size="sm" rightIcon={<ArrowRight className="h-4 w-4" />}>
                Plan nieuwe afspraak
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-7 border-b border-navy-100 bg-sand-50/40 text-xs">
            {days.map((d, i) => {
              const isToday =
                d.toDateString() === new Date().toDateString();
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

          <div className="grid min-h-[460px] grid-cols-7 divide-x divide-navy-100">
            {days.map((_, dayIdx) => {
              const slots = SLOTS.filter((s) => s.day === dayIdx + 1);
              return (
                <div key={dayIdx} className="space-y-2 p-2">
                  {slots.length === 0 ? (
                    <div className="rounded-md border border-dashed border-navy-100 px-2 py-2 text-center text-[11px] text-navy-400">
                      —
                    </div>
                  ) : null}
                  {slots.map((s, i) => (
                    <SlotCard key={i} slot={s} />
                  ))}
                </div>
              );
            })}
          </div>
        </Card>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-navy-500">
          <div className="flex items-center gap-3">
            {SLOT_TYPES.map((t) => (
              <span key={t.id} className="inline-flex items-center gap-1.5">
                <span
                  className={cn(
                    'h-2.5 w-2.5 rounded-full',
                    t.tone === 'marine' && 'bg-marine-500',
                    t.tone === 'gold' && 'bg-gold-500',
                    t.tone === 'navy' && 'bg-navy-900',
                    t.tone === 'sand' && 'bg-sand-500'
                  )}
                />
                {t.label}
              </span>
            ))}
          </div>
          <div className="inline-flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            Realtime synchronisatie met de werfplanning
          </div>
        </div>
      </section>
    </>
  );
}

function SlotCard({ slot }: { slot: Slot }) {
  const meta = SLOT_TYPES.find((s) => s.id === slot.type)!;
  const Icon = meta.icon;
  const tones: Record<string, string> = {
    marine: 'bg-marine-50 ring-marine-200 text-marine-800',
    gold: 'bg-gold-50 ring-gold-200 text-gold-800',
    navy: 'bg-navy-50 ring-navy-200 text-navy-800',
    sand: 'bg-sand-100 ring-sand-200 text-sand-800',
  };
  return (
    <div
      className={cn(
        'rounded-md p-2 text-[11px] ring-1 ring-inset',
        tones[meta.tone]
      )}
    >
      <div className="flex items-center gap-1 font-semibold">
        <Icon className="h-3 w-3" />
        {slot.start}
        <Clock className="ml-auto h-3 w-3 opacity-50" />
      </div>
      <div className="mt-0.5 line-clamp-1 text-navy-700">{slot.boat}</div>
    </div>
  );
}
