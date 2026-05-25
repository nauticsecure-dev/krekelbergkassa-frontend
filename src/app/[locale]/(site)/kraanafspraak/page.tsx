'use client';

import * as React from 'react';
import { useIntl } from '@/i18n/IntlProvider';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  Anchor,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Droplets,
  Hammer,
  Ship,
  Sparkles,
  User2,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { bookingService } from '@/lib/services';
import { useToast } from '@/components/ui/ToastProvider';

// Services that map to backend pricing service codes
const SERVICES = [
  { code: 'kranen_uit', label: 'Kranen uit het water', baseDuration: 30, basePrice: 145, icon: Ship },
  { code: 'kranen_in', label: 'Kranen in het water', baseDuration: 30, basePrice: 145, icon: Anchor },
  { code: 'afspuiten', label: 'Romp afspuiten', baseDuration: 20, basePrice: 85, icon: Droplets },
  { code: 'antifouling', label: 'Antifouling controle', baseDuration: 20, basePrice: 65, icon: Sparkles },
  { code: 'transport', label: 'Bok transport', baseDuration: 30, basePrice: 95, icon: Hammer },
  { code: 'plaats', label: 'Plaatsing winterstalling', baseDuration: 45, basePrice: 125, icon: Hammer },
];

// Time slots fallback when API unavailable
const TIME_SLOTS_FALLBACK = [
  '08:30', '09:00', '09:30', '10:00', '10:30',
  '11:00', '11:30', '13:30', '14:00', '14:30', '15:00', '15:30',
];

const DUTCH_DAYS = ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo'];
const DUTCH_MONTHS = ['januari','februari','maart','april','mei','juni','juli','augustus','september','oktober','november','december'];

function buildMonth(year: number, month: number) {
  const first = new Date(year, month, 1);
  // Adjust to Monday-first
  const offset = (first.getDay() + 6) % 7;
  const start = new Date(year, month, 1 - offset);
  const cells: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    cells.push(d);
  }
  return cells;
}

export default function KraanAfspraakPage() {
  const { t, locale } = useIntl();
  const { push } = useToast();

  const today = React.useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const [view, setView] = React.useState(() => new Date(today));
  const [picked, setPicked] = React.useState<Date | null>(null);
  const [time, setTime] = React.useState<string | null>(null);

  const [form, setForm] = React.useState({
    name: '',
    phone: '',
    email: '',
    boatName: '',
    length: '',
    width: '',
    weight: '',
  });
  const [selectedServices, setSelectedServices] = React.useState<string[]>(['afspuiten']);
  const [submitting, setSubmitting] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);
  const [openDays, setOpenDays] = React.useState<Record<string, boolean>>({});
  const [timeSlots, setTimeSlots] = React.useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = React.useState(false);

  const month = buildMonth(view.getFullYear(), view.getMonth());
  const monthLabel = `${DUTCH_MONTHS[view.getMonth()]} ${view.getFullYear()}`;
  const lengthM = Number(form.length || 0);

  React.useEffect(() => {
    const from = new Date(view.getFullYear(), view.getMonth(), 1);
    const to = new Date(view.getFullYear(), view.getMonth() + 1, 0);
    void bookingService
      .calendar(from.toISOString(), to.toISOString())
      .then((res) => {
        const map: Record<string, boolean> = {};
        for (const day of res.days) map[day.date.slice(0, 10)] = day.is_open;
        setOpenDays(map);
      })
      .catch(() => setOpenDays({}));
  }, [view]);

  React.useEffect(() => {
    if (!picked || !selectedServices.length || !lengthM) {
      setTimeSlots([]);
      return;
    }
    setLoadingSlots(true);
    const dateIso = new Date(
      picked.getFullYear(),
      picked.getMonth(),
      picked.getDate(),
      12,
      0,
      0
    ).toISOString();
    void bookingService
      .slots({
        date: dateIso,
        length_cm: Math.max(100, Math.round(lengthM * 100)),
        service_codes: selectedServices,
      })
      .then((res) => setTimeSlots(res.is_open ? res.slots : []))
      .catch(() => setTimeSlots(TIME_SLOTS_FALLBACK))
      .finally(() => setLoadingSlots(false));
  }, [picked, selectedServices, lengthM]);

  const toggleService = (code: string) =>
    setSelectedServices((cur) =>
      cur.includes(code) ? cur.filter((c) => c !== code) : [...cur, code]
    );

  const totalDuration = SERVICES.filter((s) => selectedServices.includes(s.code)).reduce(
    (sum, s) => sum + s.baseDuration,
    0
  );
  const totalPrice = SERVICES.filter((s) => selectedServices.includes(s.code)).reduce(
    (sum, s) => sum + s.basePrice,
    0
  );

  const surcharge = lengthM > 12 ? 95 : lengthM > 8 ? 35 : 0;
  const finalPrice = totalPrice + surcharge;
  const manualReview = lengthM > 14 || Number(form.weight || 0) > 15000;

  const isPast = (d: Date) => d.getTime() < today.getTime();
  const isOtherMonth = (d: Date) => d.getMonth() !== view.getMonth();
  const isToday = (d: Date) => d.getTime() === today.getTime();
  const isPicked = (d: Date) => picked?.getTime() === d.getTime();

  const submit = async () => {
    if (!picked || !time || !form.name || !form.email || !form.boatName || !lengthM) return;
    setSubmitting(true);
    try {
      const dateIso = new Date(
        picked.getFullYear(),
        picked.getMonth(),
        picked.getDate(),
        12,
        0,
        0
      ).toISOString();
      await bookingService.book({
        name: form.name,
        email: form.email,
        phone: form.phone || null,
        locale,
        date: dateIso,
        start_time: time,
        notes: manualReview ? t('crane.manualReview') : null,
        boat: {
          name: form.boatName,
          length_m: lengthM,
          width_m: Number(form.width || 0) || null,
        },
        service_codes: selectedServices,
      });
      setSubmitted(true);
      push({ tone: 'success', title: t('crane.submitSuccess') });
    } catch (err) {
      push({
        tone: 'error',
        title: t('crane.submitFailed'),
        message: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const isDayClosed = (d: Date) => {
    const key = d.toISOString().slice(0, 10);
    return key in openDays && !openDays[key];
  };

  return (
    <div className="bg-sand-50/80">
      <div className="container-wide grid gap-8 py-12 lg:grid-cols-[1.55fr_1fr]">
        {/* Left: form */}
        <div>
          <div className="mb-6">
            <Badge tone="gold" className="mb-3">
              Kraanafspraak maken
            </Badge>
            <h1 className="heading-display text-3xl sm:text-4xl">
              {t('crane.title')}
            </h1>
            <p className="mt-2 max-w-2xl text-navy-500">{t('crane.subtitle')}</p>
          </div>

          <Card className="p-6 sm:p-8">
            {/* Section: your data */}
            <SectionTitle icon={<User2 className="h-4 w-4" />}>
              {t('crane.yourData')}
            </SectionTitle>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <Input
                label={t('crane.name')}
                placeholder="Jan Jansen"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              <Input
                label={t('crane.phone')}
                placeholder="06 12345678"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
              <Input
                label={t('crane.email')}
                type="email"
                placeholder="jan@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>

            <SectionTitle icon={<Ship className="h-4 w-4" />} className="mt-8">
              {t('crane.yourBoat')}
            </SectionTitle>
            <div className="mt-4 grid gap-4 sm:grid-cols-4">
              <Input
                className="sm:col-span-2"
                label={t('crane.boatName')}
                placeholder="Aquila"
                value={form.boatName}
                onChange={(e) => setForm({ ...form, boatName: e.target.value })}
              />
              <Input
                label={t('crane.boatLength')}
                placeholder="8.90"
                inputMode="decimal"
                value={form.length}
                onChange={(e) => setForm({ ...form, length: e.target.value })}
              />
              <Input
                label={t('crane.boatWeight')}
                placeholder="3500"
                inputMode="numeric"
                value={form.weight}
                onChange={(e) => setForm({ ...form, weight: e.target.value })}
              />
            </div>

            {/* Section: services */}
            <SectionTitle icon={<Sparkles className="h-4 w-4" />} className="mt-8">
              {t('crane.services')}
            </SectionTitle>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {SERVICES.map((s) => {
                const Icon = s.icon;
                const active = selectedServices.includes(s.code);
                return (
                  <button
                    key={s.code}
                    type="button"
                    onClick={() => toggleService(s.code)}
                    className={cn(
                      'flex items-center gap-3 rounded-xl border p-3.5 text-left transition',
                      active
                        ? 'border-navy-900 bg-navy-900 text-white shadow-card'
                        : 'border-navy-100 bg-white text-navy-900 hover:border-navy-300'
                    )}
                  >
                    <div
                      className={cn(
                        'flex h-10 w-10 items-center justify-center rounded-lg',
                        active ? 'bg-white/10 text-gold-300' : 'bg-sand-100 text-navy-700'
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold">{s.label}</div>
                      <div
                        className={cn(
                          'text-xs',
                          active ? 'text-sand-100/80' : 'text-navy-400'
                        )}
                      >
                        Ca. {s.baseDuration} min
                      </div>
                    </div>
                    <div
                      className={cn(
                        'text-sm font-semibold',
                        active ? 'text-gold-300' : 'text-navy-900'
                      )}
                    >
                      €{s.basePrice}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Footnote */}
            <div className="mt-6 flex items-start gap-2 rounded-lg border border-marine-200/60 bg-marine-50 p-3 text-xs text-marine-800">
              <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
              {t('crane.footerNote')}
            </div>
          </Card>
        </div>

        {/* Right: calendar + summary */}
        <div className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          {/* Calendar */}
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <SectionTitle icon={<CalendarDays className="h-4 w-4" />}>
                {t('crane.availableDays')}
              </SectionTitle>
              <div className="flex items-center gap-1">
                <button
                  onClick={() =>
                    setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))
                  }
                  className="rounded-md p-1.5 text-navy-600 hover:bg-sand-100"
                  aria-label="Vorige maand"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <div className="min-w-[120px] text-center text-sm font-medium capitalize">
                  {monthLabel}
                </div>
                <button
                  onClick={() =>
                    setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))
                  }
                  className="rounded-md p-1.5 text-navy-600 hover:bg-sand-100"
                  aria-label="Volgende maand"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase tracking-wide text-navy-400">
              {DUTCH_DAYS.map((d) => (
                <div key={d}>{d}</div>
              ))}
            </div>
            <div className="mt-2 grid grid-cols-7 gap-1">
              {month.map((d, i) => {
                const disabled = isPast(d) || isOtherMonth(d) || isDayClosed(d);
                return (
                  <button
                    key={i}
                    disabled={disabled}
                    onClick={() => {
                      setPicked(d);
                      setTime(null);
                    }}
                    className={cn(
                      'aspect-square rounded-md text-sm transition',
                      disabled && 'cursor-not-allowed text-navy-200',
                      !disabled && !isPicked(d) && 'text-navy-800 hover:bg-sand-100',
                      isPicked(d) && 'bg-navy-900 font-semibold text-white shadow-card',
                      !isPicked(d) && isToday(d) && 'ring-1 ring-marine-300'
                    )}
                  >
                    {d.getDate()}
                  </button>
                );
              })}
            </div>

            <div className="mt-5 border-t border-navy-100 pt-4">
              <SectionTitle icon={<Clock className="h-4 w-4" />}>
                {picked
                  ? t('crane.timeSlots', {
                      date: `${picked.getDate()} ${DUTCH_MONTHS[picked.getMonth()]}`,
                    })
                  : t('crane.selectDate')}
              </SectionTitle>
              <div className="mt-3 grid grid-cols-4 gap-2">
                {(timeSlots.length ? timeSlots : loadingSlots ? [] : TIME_SLOTS_FALLBACK).map((s) => {
                  const active = time === s;
                  return (
                    <button
                      key={s}
                      disabled={!picked}
                      onClick={() => setTime(s)}
                      className={cn(
                        'rounded-md border px-2 py-1.5 text-xs font-medium transition',
                        !picked && 'cursor-not-allowed border-navy-100 text-navy-300',
                        picked &&
                          (active
                            ? 'border-navy-900 bg-navy-900 text-white'
                            : 'border-navy-100 text-navy-800 hover:border-navy-300')
                      )}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>
          </Card>

          {/* Summary */}
          <Card className="overflow-hidden">
            <div className="border-b border-navy-100 px-5 py-4">
              <div className="text-xs font-semibold uppercase tracking-widest text-navy-400">
                {t('crane.appointment')}
              </div>
            </div>
            <div className="space-y-3 px-5 py-4 text-sm">
              <SummaryRow label={t('crane.boat')} value={form.boatName || '—'} />
              <SummaryRow
                label={t('crane.date')}
                value={
                  picked
                    ? `${picked.getDate()} ${DUTCH_MONTHS[picked.getMonth()]} ${picked.getFullYear()}${time ? ` · ${time}` : ''}`
                    : '—'
                }
              />
              <SummaryRow
                label={t('crane.service')}
                value={
                  selectedServices.length
                    ? `${selectedServices.length} dienst${selectedServices.length > 1 ? 'en' : ''}`
                    : '—'
                }
              />
              <SummaryRow
                label={t('crane.duration')}
                value={totalDuration ? `± ${totalDuration} min` : '—'}
              />
              {manualReview ? (
                <Badge tone="warning" className="mt-1">
                  {t('crane.manualReview')}
                </Badge>
              ) : null}
            </div>
            <div className="bg-navy-900 px-5 py-5 text-white">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-widest text-sand-100/70">
                  {t('crane.estimate')}
                </span>
                <span className="text-2xl font-semibold">
                  €{finalPrice.toFixed(2)}
                </span>
              </div>
            </div>
            <div className="px-5 py-4">
              <Button
                variant="gold"
                size="lg"
                fullWidth
                disabled={submitting || submitted || !picked || !time || !selectedServices.length}
                rightIcon={<ArrowRight className="h-4 w-4" />}
                onClick={submit}
              >
                {submitted ? 'Aanvraag verzonden' : t('crane.submit')}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function SectionTitle({
  icon,
  className,
  children,
}: {
  icon?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-navy-500',
        className
      )}
    >
      {icon}
      {children}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-navy-400">{label}</span>
      <span className="font-medium text-navy-900">{value}</span>
    </div>
  );
}
