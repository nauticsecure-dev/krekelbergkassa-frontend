'use client';

import * as React from 'react';
import Script from 'next/script';
import { useIntl } from '@/i18n/IntlProvider';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import Link from 'next/link';
import { useRegisterCmsPage } from '@/components/cms/CmsProvider';
import { EditableText } from '@/components/cms/EditableText';
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
  Image as ImageIcon,
  MapPin,
  Ship,
  Sparkles,
  User2,
  X,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { bookingService } from '@/lib/services';
import { useToast } from '@/components/ui/ToastProvider';
import { getApiErrorMessage } from '@/lib/api-error';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import {
  scaledPrice,
  tariffPrice,
  type TariffColumn,
} from '@/lib/pricing-table';

const CMS_PAGE = 'kraanafspraak';

interface CraneService {
  code: string;
  label: string;
  baseDuration: number;
  basePrice: number;
  icon: typeof Ship;
  tariff?: TariffColumn;
}

const SERVICES: CraneService[] = [
  { code: 'kranen_uit',  label: 'Kranen uit het water',    baseDuration: 30, basePrice: 65,  icon: Ship,    tariff: 'kranen' },
  { code: 'kranen_in',   label: 'Kranen in het water',     baseDuration: 30, basePrice: 65,  icon: Anchor,  tariff: 'kranen' },
  { code: 'afspuiten',   label: 'Romp afspuiten',          baseDuration: 20, basePrice: 50,  icon: Droplets,tariff: 'afspuiten' },
  { code: 'antifouling', label: 'Antifouling controle',    baseDuration: 20, basePrice: 65,  icon: Sparkles },
  { code: 'transport',   label: 'Bok transport',           baseDuration: 30, basePrice: 95,  icon: Hammer },
  { code: 'plaats',      label: 'Plaatsing winterstalling',baseDuration: 45, basePrice: 125, icon: Hammer },
];

function servicePriceForLength(s: CraneService, lengthCm: number): number {
  if (s.tariff) return tariffPrice(s.tariff, lengthCm) ?? s.basePrice;
  return lengthCm ? scaledPrice(s.basePrice, lengthCm) : s.basePrice;
}

const DUTCH_DAYS   = ['ma','di','wo','do','vr','za','zo'];
const DUTCH_MONTHS = ['januari','februari','maart','april','mei','juni','juli','augustus','september','oktober','november','december'];

function buildMonth(year: number, month: number) {
  const first  = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7;
  const start  = new Date(year, month, 1 - offset);
  const cells: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    cells.push(d);
  }
  return cells;
}

const MAX_IMAGES = 5;

export default function KraanAfspraakPage() {
  const { t, locale } = useIntl();
  const { push } = useToast();
  useRegisterCmsPage(CMS_PAGE);

  const today = React.useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const [view, setView]                     = React.useState(() => new Date(today));
  const [picked, setPicked]                 = React.useState<Date | null>(null);
  const [time, setTime]                     = React.useState<string | null>(null);
  const [selectedServices, setSelectedServices] = React.useState<string[]>(['afspuiten']);
  const [submitting, setSubmitting]         = React.useState(false);
  const [submitted, setSubmitted]           = React.useState(false);
  const [confirmSubmit, setConfirmSubmit]   = React.useState(false);
  const [openDays, setOpenDays]             = React.useState<Record<string, boolean>>({});
  const [timeSlots, setTimeSlots]           = React.useState<string[]>([]);
  const [loadingSlots, setLoadingSlots]     = React.useState(false);
  const [slotsError, setSlotsError]         = React.useState<'closed' | 'error' | null>(null);
  const [images, setImages]                 = React.useState<File[]>([]);
  const [googleLoaded, setGoogleLoaded]     = React.useState(false);
  const addressRef                          = React.useRef<HTMLInputElement>(null);
  const fileInputRef                        = React.useRef<HTMLInputElement>(null);

  const [form, setForm] = React.useState({
    voornaam: '',
    achternaam: '',
    straat: '',
    huisnummer: '',
    postcode: '',
    stad: '',
    phone: '',
    email: '',
    // Boat
    boatName: '',
    boatBrand: '',
    boatModel: '',
    boatEngine: '',
    boatYear: '',
    length: '',
    width: '',
    draft: '',
    weight: '',
    notes: '',
  });

  const setField = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [key]: e.target.value }));

  // Google Places autocomplete
  React.useEffect(() => {
    if (!googleLoaded || !addressRef.current) return;
    const g = (window as unknown as { google?: { maps?: { places?: { Autocomplete: new (el: HTMLInputElement, opts: object) => { addListener: (evt: string, cb: () => void) => void; getPlace: () => { address_components?: { long_name: string; types: string[] }[] } } } } } }).google;
    if (!g?.maps?.places) return;

    const ac = new g.maps.places.Autocomplete(addressRef.current, {
      types: ['address'],
      componentRestrictions: { country: ['nl', 'be', 'de', 'fr'] },
      fields: ['address_components'],
    });

    ac.addListener('place_changed', () => {
      const place = ac.getPlace();
      const comps = place.address_components ?? [];
      const get = (type: string) => comps.find(c => c.types.includes(type))?.long_name ?? '';
      setForm(prev => ({
        ...prev,
        straat:     get('route'),
        huisnummer: get('street_number'),
        postcode:   get('postal_code'),
        stad:       get('locality') || get('administrative_area_level_2'),
      }));
    });
  }, [googleLoaded]);

  const month      = buildMonth(view.getFullYear(), view.getMonth());
  const monthLabel = `${DUTCH_MONTHS[view.getMonth()]} ${view.getFullYear()}`;
  const lengthCm   = Number(form.length || 0);
  const lengthM    = lengthCm / 100;

  React.useEffect(() => {
    const from = new Date(view.getFullYear(), view.getMonth(), 1);
    const to   = new Date(view.getFullYear(), view.getMonth() + 1, 0);
    void bookingService
      .calendar(from.toISOString(), to.toISOString())
      .then(res => {
        const map: Record<string, boolean> = {};
        for (const day of res.days) map[day.date.slice(0, 10)] = day.is_open;
        setOpenDays(map);
      })
      .catch(() => setOpenDays({}));
  }, [view]);

  React.useEffect(() => {
    if (!picked || !selectedServices.length || !lengthCm) {
      setTimeSlots([]);
      setSlotsError(null);
      setTime(null);
      return;
    }
    setLoadingSlots(true);
    setSlotsError(null);
    setTime(null);
    const dateIso = new Date(picked.getFullYear(), picked.getMonth(), picked.getDate(), 12).toISOString();
    void bookingService
      .slots({ date: dateIso, length_cm: Math.max(100, lengthCm), service_codes: selectedServices })
      .then(res => {
        if (res.is_open) {
          setTimeSlots(res.slots);
          setSlotsError(null);
        } else {
          setTimeSlots([]);
          setSlotsError('closed');
        }
      })
      .catch(() => {
        setTimeSlots([]);
        setSlotsError('error');
      })
      .finally(() => setLoadingSlots(false));
  }, [picked, selectedServices, lengthCm]);

  const toggleService = (code: string) =>
    setSelectedServices(cur => cur.includes(code) ? cur.filter(c => c !== code) : [...cur, code]);

  const totalDuration = SERVICES.filter(s => selectedServices.includes(s.code)).reduce((sum, s) => sum + s.baseDuration, 0);
  const finalPrice    = SERVICES.filter(s => selectedServices.includes(s.code)).reduce((sum, s) => sum + servicePriceForLength(s, lengthCm), 0);

  const isPast       = (d: Date) => d.getTime() < today.getTime();
  const isOtherMonth = (d: Date) => d.getMonth() !== view.getMonth();
  const isToday      = (d: Date) => d.getTime() === today.getTime();
  const isPicked     = (d: Date) => picked?.getTime() === d.getTime();
  const toLocalDateKey = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const isDayClosed  = (d: Date) => {
    const key = toLocalDateKey(d);
    return key in openDays && !openDays[key];
  };

  const handleImages = (files: FileList | null) => {
    if (!files) return;
    const next = [...images];
    for (const f of Array.from(files)) {
      if (next.length >= MAX_IMAGES) break;
      if (f.type.startsWith('image/')) next.push(f);
    }
    setImages(next);
  };

  const removeImage = (idx: number) =>
    setImages(prev => prev.filter((_, i) => i !== idx));

  const canSubmit =
    !submitting && !submitted && !!picked && !!time &&
    !!selectedServices.length && !!lengthCm &&
    !!form.voornaam && !!form.email;

  const submit = async () => {
    if (!canSubmit || !picked || !time) return;
    setSubmitting(true);
    try {
      const dateIso = new Date(picked.getFullYear(), picked.getMonth(), picked.getDate(), 12).toISOString();
      const result = await bookingService.book({
        first_name:  form.voornaam,
        last_name:   form.achternaam,
        phone:       form.phone || null,
        email:       form.email,
        locale,
        date:        dateIso,
        start_time:  time,
        notes:       form.notes || null,
        address: {
          street:      form.straat || null,
          house_number: form.huisnummer || null,
          postal_code: form.postcode || null,
          city:        form.stad || null,
        },
        boat: {
          name:        form.boatName,
          brand:       form.boatBrand || null,
          model:       form.boatModel || null,
          engine:      form.boatEngine || null,
          build_year:  form.boatYear ? Number(form.boatYear) : null,
          length_m:    lengthM,
          width_m:     form.width ? Number(form.width) / 100 : null,
          draft_m:     form.draft ? Number(form.draft) / 100 : null,
          weight_kg:   form.weight ? Number(form.weight) : null,
        },
        service_codes: selectedServices,
      });

      // Upload images if any
      if (images.length && result && typeof result === 'object' && 'appointment_id' in result) {
        const fd = new FormData();
        images.forEach(img => fd.append('photos[]', img));
        await bookingService.uploadBookingPhotos(result.appointment_id as string, fd).catch(() => null);
      }

      setSubmitted(true);
      push({ tone: 'success', title: t('crane.submitSuccess') });
    } catch (err) {
      push({ tone: 'error', title: t('crane.submitFailed'), message: getApiErrorMessage(err) });
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="bg-sand-50/80">
        <div className="container-wide flex min-h-[60vh] items-center justify-center py-24">
          <Card className="mx-auto max-w-lg p-8 text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </div>
            <Badge tone="gold" className="mb-4">Aanvraag ontvangen</Badge>
            <h2 className="font-display text-2xl font-bold text-navy-900">Uw aanvraag is verzonden</h2>
            <p className="mt-3 text-sm leading-relaxed text-navy-500">
              Wij bekijken uw aanvraag zo snel mogelijk en bevestigen de afspraak per e-mail.
              U kunt de status volgen via het klantportaal.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link href={`/${locale}/dashboard/afspraken`}>
                <Button variant="gold" rightIcon={<ArrowRight className="h-4 w-4" />}>
                  Bekijk uw afspraken
                </Button>
              </Link>
              <Button variant="outline" onClick={() => setSubmitted(false)}>Nieuwe aanvraag</Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <>
      {process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY && (
        <Script
          src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`}
          onLoad={() => setGoogleLoaded(true)}
        />
      )}

      <div className="bg-sand-50/80">
        <div className="container-wide grid gap-8 py-12 lg:grid-cols-[1.55fr_1fr]">
          {/* Left: form */}
          <div>
            <div className="mb-6">
              <Badge tone="gold" className="mb-3">
                <EditableText blockKey="kraanafspraak.hero.badge" page={CMS_PAGE} section="hero">
                  Kraanafspraak maken
                </EditableText>
              </Badge>
              <h1 className="heading-display text-3xl sm:text-4xl">
                <EditableText blockKey="kraanafspraak.hero.title" page={CMS_PAGE} section="hero" type="heading">
                  {t('crane.title')}
                </EditableText>
              </h1>
              <p className="mt-2 max-w-2xl text-navy-500">
                <EditableText blockKey="kraanafspraak.hero.subtitle" page={CMS_PAGE} section="hero" type="paragraph">
                  {t('crane.subtitle')}
                </EditableText>
              </p>
            </div>

            <Card className="p-6 sm:p-8">
              {/* Personal data */}
              <SectionTitle icon={<User2 className="h-4 w-4" />}>Uw gegevens</SectionTitle>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Input
                  label="Voornaam"
                  placeholder="Jan"
                  required
                  value={form.voornaam}
                  onChange={setField('voornaam')}
                />
                <Input
                  label="Achternaam"
                  placeholder="Jansen"
                  value={form.achternaam}
                  onChange={setField('achternaam')}
                />
                <Input
                  label="Telefoonnummer"
                  placeholder="06 12345678"
                  type="tel"
                  value={form.phone}
                  onChange={setField('phone')}
                />
                <Input
                  label="E-mailadres"
                  type="email"
                  placeholder="jan@voorbeeld.nl"
                  required
                  value={form.email}
                  onChange={setField('email')}
                />
              </div>

              {/* Address */}
              <SectionTitle icon={<MapPin className="h-4 w-4" />} className="mt-8">Adres</SectionTitle>
              <div className="mt-4 grid gap-4 sm:grid-cols-12">
                <div className="sm:col-span-8">
                  <label className="mb-1.5 block text-sm font-medium text-navy-800">
                    Straat
                  </label>
                  <input
                    ref={addressRef}
                    className="input-base w-full"
                    placeholder="Havenstraat"
                    value={form.straat}
                    onChange={setField('straat')}
                  />
                </div>
                <Input
                  className="sm:col-span-4"
                  label="Huisnummer"
                  placeholder="12 A"
                  value={form.huisnummer}
                  onChange={setField('huisnummer')}
                />
                <Input
                  className="sm:col-span-4"
                  label="Postcode"
                  placeholder="6041 AB"
                  value={form.postcode}
                  onChange={setField('postcode')}
                />
                <Input
                  className="sm:col-span-8"
                  label="Stad"
                  placeholder="Roermond"
                  value={form.stad}
                  onChange={setField('stad')}
                />
              </div>

              {/* Boat */}
              <SectionTitle icon={<Ship className="h-4 w-4" />} className="mt-8">Uw boot</SectionTitle>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Input
                  label="Naam boot"
                  placeholder="Aquila"
                  value={form.boatName}
                  onChange={setField('boatName')}
                />
                <Input
                  label="Motor"
                  placeholder="Volvo Penta D4"
                  value={form.boatEngine}
                  onChange={setField('boatEngine')}
                />
                <Input
                  label="Merk"
                  placeholder="Bavaria"
                  value={form.boatBrand}
                  onChange={setField('boatBrand')}
                />
                <Input
                  label="Model"
                  placeholder="Cruiser 34"
                  value={form.boatModel}
                  onChange={setField('boatModel')}
                />
                <Input
                  label="Bouwjaar"
                  placeholder="2015"
                  inputMode="numeric"
                  value={form.boatYear}
                  onChange={setField('boatYear')}
                />
                <Input
                  label="Lengte (cm)"
                  placeholder="890"
                  inputMode="numeric"
                  required
                  hint="In centimeters, bijv. 890 voor 8,90 m"
                  value={form.length}
                  onChange={setField('length')}
                />
                <Input
                  label="Breedte (cm)"
                  placeholder="300"
                  inputMode="numeric"
                  hint="In centimeters"
                  value={form.width}
                  onChange={setField('width')}
                />
                <Input
                  label="Diepgang (cm)"
                  placeholder="110"
                  inputMode="numeric"
                  hint="In centimeters"
                  value={form.draft}
                  onChange={setField('draft')}
                />
                <Input
                  className="sm:col-span-2"
                  label="Gewicht (kg)"
                  placeholder="4500"
                  inputMode="numeric"
                  value={form.weight}
                  onChange={setField('weight')}
                />
              </div>

              {/* Services */}
              <SectionTitle icon={<Sparkles className="h-4 w-4" />} className="mt-8">
                {t('crane.services')}
              </SectionTitle>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {SERVICES.map(s => {
                  const Icon   = s.icon;
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
                      <div className={cn(
                        'flex h-10 w-10 items-center justify-center rounded-lg',
                        active ? 'bg-white/10 text-gold-300' : 'bg-sand-100 text-navy-700'
                      )}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-semibold">{s.label}</div>
                        <div className={cn('text-xs', active ? 'text-sand-100/80' : 'text-navy-400')}>
                          Ca. {s.baseDuration} min
                        </div>
                      </div>
                      <div className={cn('text-sm font-semibold', active ? 'text-gold-300' : 'text-navy-900')}>
                        €{servicePriceForLength(s, lengthCm)}
                        {!lengthCm ? (
                          <span className={cn('ml-0.5 text-[10px] font-normal', active ? 'text-sand-100/70' : 'text-navy-400')}>
                            v.a.
                          </span>
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Notes */}
              <div className="mt-8">
                <label htmlFor="booking-notes" className="mb-1.5 block text-sm font-medium text-navy-800">
                  {t('crane.notes')}
                </label>
                <textarea
                  id="booking-notes"
                  className="input-base min-h-[88px] resize-y"
                  maxLength={1000}
                  placeholder={t('crane.placeholders.notes')}
                  value={form.notes}
                  onChange={setField('notes')}
                />
              </div>

              {/* Image upload */}
              <SectionTitle icon={<ImageIcon aria-hidden className="h-4 w-4" />} className="mt-8">
                {"Foto's van uw boot (optioneel)"}
              </SectionTitle>
              <div className="mt-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={e => handleImages(e.target.files)}
                />
                {images.length < MAX_IMAGES && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-navy-200 bg-sand-50 py-6 text-sm text-navy-500 transition hover:border-navy-400 hover:bg-sand-100"
                  >
                    <ImageIcon aria-hidden className="h-5 w-5" />
                    {`Foto's toevoegen (${images.length}/${MAX_IMAGES})`}
                  </button>
                )}
                {images.length > 0 && (
                  <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {images.map((img, i) => (
                      <div key={i} className="group relative overflow-hidden rounded-lg border border-navy-100">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={URL.createObjectURL(img)}
                          alt={img.name}
                          className="h-24 w-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(i)}
                          className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-navy-900/80 text-white opacity-0 transition group-hover:opacity-100"
                        >
                          <X className="h-3 w-3" />
                        </button>
                        <p className="truncate px-2 py-1 text-[10px] text-navy-500">{img.name}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer note */}
              <div className="mt-6 flex items-start gap-2 rounded-lg border border-marine-200/60 bg-marine-50 p-3 text-xs text-marine-800">
                <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
                {t('crane.footerNote')}
              </div>
            </Card>
          </div>

          {/* Right: calendar + summary */}
          <div className="space-y-6 lg:sticky lg:top-24 lg:self-start">
            <Card className="p-5">
              <div className="mb-4 flex items-center justify-between">
                <SectionTitle icon={<CalendarDays className="h-4 w-4" />}>
                  {t('crane.availableDays')}
                </SectionTitle>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))}
                    className="rounded-md p-1.5 text-navy-600 hover:bg-sand-100"
                    aria-label="Vorige maand"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <div className="min-w-[120px] text-center text-sm font-medium capitalize">{monthLabel}</div>
                  <button
                    onClick={() => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))}
                    className="rounded-md p-1.5 text-navy-600 hover:bg-sand-100"
                    aria-label="Volgende maand"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase tracking-wide text-navy-400">
                {DUTCH_DAYS.map(d => <div key={d}>{d}</div>)}
              </div>
              <div className="mt-2 grid grid-cols-7 gap-1">
                {month.map((d, i) => {
                  const disabled = isPast(d) || isOtherMonth(d) || isDayClosed(d);
                  return (
                    <button
                      key={i}
                      disabled={disabled}
                      onClick={() => { setPicked(d); setTime(null); }}
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
                    ? t('crane.timeSlots', { date: `${picked.getDate()} ${DUTCH_MONTHS[picked.getMonth()]}` })
                    : t('crane.selectDate')}
                </SectionTitle>
                {slotsError === 'closed' && (
                  <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
                    De werf is gesloten op deze dag. Kies een andere datum.
                  </p>
                )}
                {slotsError === 'error' && (
                  <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-800">
                    Tijdsloten konden niet worden geladen. Bel ons op <strong>0475 315 661</strong>.
                  </p>
                )}
                {!slotsError && !loadingSlots && picked && !lengthCm && (
                  <p className="mt-3 rounded-lg border border-navy-100 bg-sand-50 px-3 py-2.5 text-xs text-navy-500">
                    Voer eerst de lengte van uw boot in om beschikbare tijden te zien.
                  </p>
                )}
                {!slotsError && (
                  <div className="mt-3 grid grid-cols-4 gap-2">
                    {(loadingSlots ? [] : timeSlots).map(s => {
                      const active = time === s;
                      return (
                        <button
                          key={s}
                          onClick={() => setTime(s)}
                          className={cn(
                            'rounded-md border px-2 py-1.5 text-xs font-medium transition',
                            active
                              ? 'border-navy-900 bg-navy-900 text-white'
                              : 'border-navy-100 text-navy-800 hover:border-navy-300'
                          )}
                        >
                          {s}
                        </button>
                      );
                    })}
                    {!loadingSlots && timeSlots.length === 0 && picked && lengthCm && !slotsError && (
                      <p className="col-span-4 text-xs text-navy-400">Geen beschikbare tijden op deze dag.</p>
                    )}
                  </div>
                )}
              </div>
            </Card>

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
                  value={selectedServices.length ? `${selectedServices.length} dienst${selectedServices.length > 1 ? 'en' : ''}` : '—'}
                />
                <SummaryRow label={t('crane.duration')} value={totalDuration ? `± ${totalDuration} min` : '—'} />
                {images.length > 0 && (
                  <SummaryRow label="Foto's" value={`${images.length} toegevoegd`} />
                )}
              </div>
              <div className="bg-navy-900 px-5 py-5 text-white">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium uppercase tracking-widest text-sand-100/70">
                    {t('crane.estimate')}
                  </span>
                  <span className="text-2xl font-semibold">€{finalPrice.toFixed(2)}</span>
                </div>
              </div>
              <div className="px-5 py-4">
                <Button
                  variant="gold"
                  size="lg"
                  fullWidth
                  disabled={!canSubmit}
                  rightIcon={<ArrowRight className="h-4 w-4" />}
                  onClick={() => setConfirmSubmit(true)}
                >
                  {submitted ? 'Aanvraag verzonden' : t('crane.submit')}
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>

      <ConfirmModal
        open={confirmSubmit}
        onClose={() => setConfirmSubmit(false)}
        onConfirm={async () => { await submit(); setConfirmSubmit(false); }}
        title={t('crane.submit')}
        message={t('crane.confirmSubmit')}
        confirmLabel={t('crane.submit')}
        cancelLabel={t('adminNew.common.cancel')}
        variant="primary"
        icon={CalendarDays}
        loading={submitting}
      />
    </>
  );
}

function SectionTitle({ icon, className, children }: { icon?: React.ReactNode; className?: string; children: React.ReactNode }) {
  return (
    <div className={cn('flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-navy-500', className)}>
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
