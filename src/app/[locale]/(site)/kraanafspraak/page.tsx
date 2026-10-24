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
  Pencil,
  Ship,
  Sparkles,
  User2,
  X,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { bookingService } from '@/lib/services';
import { useToast } from '@/components/ui/ToastProvider';
import {
  getApiErrorMessage,
  getApiErrorStatus,
  getApiRequestId,
  getApiValidationErrors,
} from '@/lib/api-error';

type BookingField =
  | 'voornaam'
  | 'email'
  | 'straat'
  | 'huisnummer'
  | 'postcode'
  | 'stad'
  | 'length'
  | 'service'
  | 'date'
  | 'time';

const API_FIELD_TO_BOOKING: Record<string, BookingField> = {
  first_name: 'voornaam',
  email: 'email',
  date: 'date',
  start_time: 'time',
  service_codes: 'service',
  'boat.length_m': 'length',
  'boat.length_cm': 'length',
  'address.street': 'straat',
  'address.house_number': 'huisnummer',
  'address.postal_code': 'postcode',
  'address.city': 'stad',
};

const BOOKING_FIELD_I18N: Record<BookingField, string> = {
  voornaam: 'crane.validation.firstName',
  email: 'crane.validation.email',
  straat: 'crane.validation.street',
  huisnummer: 'crane.validation.houseNumber',
  postcode: 'crane.validation.postalCode',
  stad: 'crane.validation.city',
  length: 'crane.validation.length',
  service: 'crane.validation.service',
  date: 'crane.validation.date',
  time: 'crane.validation.time',
};

/** Dutch postcode, or a 4- or 5-digit code for a typed-in BE/DE/FR address. */
const POSTAL_CODE_PATTERN = /^(?:[1-9]\d{3}\s?[A-Za-z]{2}|[1-9]\d{3}|\d{5})$/;
/** Starts with digits; allows a Dutch suffix such as "12 A" or "12-14". */
const HOUSE_NUMBER_PATTERN = /^[0-9]+(?:[A-Za-z]|[\s\-/][0-9A-Za-z]+)*$/;

function isValidHouseNumber(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= 20 && HOUSE_NUMBER_PATTERN.test(trimmed);
}

function isValidPostalCode(value: string) {
  return POSTAL_CODE_PATTERN.test(value.trim());
}

function formatPostalCode(value: string) {
  const compact = value.replace(/\s+/g, '').toUpperCase();
  if (/^[1-9]\d{3}[A-Z]{2}$/.test(compact)) {
    return `${compact.slice(0, 4)} ${compact.slice(4)}`;
  }
  return value.trim();
}
import { generateRequestId } from '@/lib/api';
import { flushTrackEvents, trackEvent } from '@/lib/track-event';
import { useAuth } from '@/lib/auth-context';
import { canAccessAdmin } from '@/lib/auth-routes';
import { useQuery } from '@/lib/hooks/useAsync';
import { serviceCatalogService, type ServiceCatalogService } from '@/lib/services';
import { formatCurrency, intlLocale } from '@/lib/format';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

const CMS_PAGE = 'kraanafspraak';

interface CraneService {
  code: string;
  label: string;
  icon: typeof Ship;
  catalogServiceCodes: string[];
}

const SERVICES: CraneService[] = [
  { code: 'kranen_uit',  label: 'Kranen uit het water',    icon: Ship,     catalogServiceCodes: ['kranen', 'kranen_uit'] },
  { code: 'kranen_in',   label: 'Kranen in het water',     icon: Anchor,   catalogServiceCodes: ['kranen', 'kranen_in'] },
  { code: 'afspuiten',   label: 'Romp afspuiten',          icon: Droplets, catalogServiceCodes: ['afspuiten'] },
  { code: 'antifouling', label: 'Antifouling controle',    icon: Sparkles, catalogServiceCodes: ['antifouling'] },
  { code: 'transport',   label: 'Bok transport',           icon: Hammer,   catalogServiceCodes: ['transport'] },
  { code: 'plaats',      label: 'Plaatsing winterstalling',icon: Hammer,   catalogServiceCodes: ['plaats', 'winterstalling'] },
];

function catalogServiceFor(
  service: CraneService,
  catalogServices: ServiceCatalogService[] | null,
) {
  return catalogServices?.find((item) =>
    item.visibility?.booking !== false &&
    service.catalogServiceCodes.some((code) =>
      item.service_code === code || item.code === code || item.slug === code
    )
  );
}

function catalogTariffForLength(
  service: ServiceCatalogService | undefined,
  lengthCm: number,
) {
  if (!service?.tariffs?.length) return undefined;
  const cm = Math.max(0, Math.round(lengthCm));
  const tariffs = service.tariffs
    .slice()
    .sort((a, b) => a.range_from_cm - b.range_from_cm);
  return tariffs.find((item) => cm >= item.range_from_cm && cm <= item.range_to_cm)
    ?? (cm < tariffs[0].range_from_cm ? tariffs[0] : tariffs[tariffs.length - 1]);
}

function servicePriceForLength(
  s: CraneService,
  lengthCm: number,
  catalogServices: ServiceCatalogService[] | null,
): number | null {
  const catalogService = catalogServiceFor(s, catalogServices);
  const tariff = catalogTariffForLength(catalogService, lengthCm);
  if (!tariff || tariff.is_on_request) return null;
  return tariff.price_incl_vat_euros
    ?? (tariff.price_incl_vat != null ? tariff.price_incl_vat / 100 : null);
}

function serviceDurationForLength(
  service: CraneService,
  lengthCm: number,
  catalogServices: ServiceCatalogService[] | null,
) {
  const catalogService = catalogServiceFor(service, catalogServices);
  return catalogTariffForLength(catalogService, lengthCm)?.duration_minutes ?? null;
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
  const { user, isDemo } = useAuth();
  const canManageProducts = canAccessAdmin(user?.role, isDemo);
  const currencyLocale = intlLocale(locale);
  useRegisterCmsPage(CMS_PAGE);
  const catalogQuery = useQuery(
    [],
    async () => (await serviceCatalogService.services()).services,
  );
  const catalogServices = catalogQuery.data;
  const bookableServices = React.useMemo(
    () => catalogServices
      ? SERVICES.filter((service) => catalogServiceFor(service, catalogServices))
      : [],
    [catalogServices],
  );

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
  const [slotsErrorMessage, setSlotsErrorMessage] = React.useState<string | null>(null);
  const [submitError, setSubmitError]       = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors]       = React.useState<Partial<Record<BookingField, string>>>({});
  const [images, setImages]                 = React.useState<File[]>([]);
  const [googleLoaded, setGoogleLoaded]     = React.useState(false);
  const [googleError, setGoogleError]       = React.useState(
    () => !process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
  );
  const addressRef                          = React.useRef<HTMLInputElement>(null);

  const releaseStreetField = React.useCallback(() => {
    const input = addressRef.current;
    if (!input) return;
    input.disabled = false;
    input.readOnly = false;
  }, []);

  if (typeof window !== 'undefined') {
    (window as Window & { gm_authFailure?: () => void }).gm_authFailure = () => {
      setGoogleError(true);
      releaseStreetField();
    };
  }

  React.useEffect(() => {
    if (!googleError) return;
    const timers = [0, 50, 250, 1000].map((ms) => window.setTimeout(releaseStreetField, ms));
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [googleError, releaseStreetField]);
  const fileInputRef                        = React.useRef<HTMLInputElement>(null);
  const submitErrorRef                      = React.useRef<HTMLDivElement>(null);
  const slotsErrorRef                       = React.useRef<HTMLParagraphElement>(null);
  const fieldRefs = React.useRef<Partial<Record<BookingField, HTMLElement | null>>>({});

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

  const clearFieldError = (key: BookingField) =>
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });

  const setField = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
    if (
      key === 'voornaam' || key === 'email' || key === 'length' ||
      key === 'straat' || key === 'huisnummer' || key === 'postcode' || key === 'stad'
    ) {
      clearFieldError(key);
    }
  };

  // Google Places autocomplete on the street field. Manual typing still works
  // when the script is missing or the address is not in the suggestion list.
  React.useEffect(() => {
    if (googleError || !googleLoaded || !addressRef.current) return;
    const g = (window as unknown as {
      google?: {
        maps?: {
          event?: { clearInstanceListeners: (instance: object) => void };
          places?: {
            Autocomplete: new (el: HTMLInputElement, opts: object) => {
              addListener: (evt: string, cb: () => void) => void;
              getPlace: () => { address_components?: { long_name: string; types: string[] }[] };
            };
          };
        };
      };
    }).google;
    if (!g?.maps?.places) {
      setGoogleError(true);
      return;
    }

    let ac: {
      addListener: (evt: string, cb: () => void) => void;
      getPlace: () => { address_components?: { long_name: string; types: string[] }[] };
    };
    try {
      ac = new g.maps.places.Autocomplete(addressRef.current, {
        types: ['address'],
        componentRestrictions: { country: 'nl' },
        fields: ['address_components'],
      });
    } catch {
      setGoogleError(true);
      return;
    }

    const applyPlace = () => {
      const place = ac.getPlace();
      const comps = place.address_components ?? [];
      if (!comps.length) return;
      const get = (type: string) => comps.find(c => c.types.includes(type))?.long_name ?? '';
      const street = get('route');
      const houseNumber = get('street_number');
      const postalCode = get('postal_code');
      const city = get('locality') || get('postal_town') || get('administrative_area_level_2');

      setForm(prev => ({
        ...prev,
        ...(street ? { straat: street } : {}),
        ...(houseNumber ? { huisnummer: houseNumber } : {}),
        ...(postalCode ? { postcode: formatPostalCode(postalCode) } : {}),
        ...(city ? { stad: city } : {}),
      }));
      setFieldErrors(prev => {
        const next = { ...prev };
        if (street) delete next.straat;
        if (houseNumber) delete next.huisnummer;
        if (postalCode) delete next.postcode;
        if (city) delete next.stad;
        return next;
      });
    };

    ac.addListener('place_changed', () => {
      applyPlace();
      // Places writes the full prediction back into the input after this event.
      window.setTimeout(applyPlace, 0);
    });

    return () => {
      g.maps?.event?.clearInstanceListeners(ac);
      releaseStreetField();
    };
  }, [googleError, googleLoaded, releaseStreetField]);

  const month      = buildMonth(view.getFullYear(), view.getMonth());
  const monthLabel = `${DUTCH_MONTHS[view.getMonth()]} ${view.getFullYear()}`;
  const lengthCm   = Number(form.length || 0);
  const lengthM    = lengthCm / 100;
  const toLocalDateKey = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  React.useEffect(() => {
    const from = new Date(view.getFullYear(), view.getMonth(), 1);
    const to   = new Date(view.getFullYear(), view.getMonth() + 1, 0);
    void bookingService
      .calendar(toLocalDateKey(from), toLocalDateKey(to))
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
      setSlotsErrorMessage(null);
      setTime(null);
      return;
    }
    setLoadingSlots(true);
    setSlotsError(null);
    setSlotsErrorMessage(null);
    setTime(null);
    const dateKey = toLocalDateKey(picked);
    void bookingService
      .slots({ date: dateKey, length_cm: Math.max(100, lengthCm), service_codes: selectedServices })
      .then(res => {
        if (res.is_open) {
          setTimeSlots(res.slots);
          setSlotsError(null);
          setSlotsErrorMessage(null);
        } else {
          setTimeSlots([]);
          setSlotsError('closed');
          setSlotsErrorMessage(null);
        }
      })
      .catch((err) => {
        setTimeSlots([]);
        setSlotsError('error');
        setSlotsErrorMessage(getApiErrorMessage(err, t('crane.slotsLoadFailed')));
      })
      .finally(() => setLoadingSlots(false));
  }, [picked, selectedServices, lengthCm, t]);

  const toggleService = (code: string) => {
    clearFieldError('service');
    setSelectedServices((cur) => (cur.includes(code) ? cur.filter((c) => c !== code) : [...cur, code]));
  };

  React.useEffect(() => {
    if (!catalogServices) return;
    const availableCodes = new Set(bookableServices.map((service) => service.code));
    setSelectedServices((current) => current.filter((code) => availableCodes.has(code)));
  }, [bookableServices, catalogServices]);

  const selectedBookableServices = bookableServices.filter((service) =>
    selectedServices.includes(service.code)
  );
  const totalDuration = selectedBookableServices.reduce((sum, service) => {
    return sum + (serviceDurationForLength(service, lengthCm, catalogServices) ?? 0);
  }, 0);
  const selectedPrices = selectedBookableServices.map((service) =>
    servicePriceForLength(service, lengthCm, catalogServices)
  );
  const finalPrice = selectedPrices.length && selectedPrices.every((price) => price != null)
    ? selectedPrices.reduce<number>((sum, price) => sum + (price ?? 0), 0)
    : null;

  const isPast       = (d: Date) => d.getTime() < today.getTime();
  const isOtherMonth = (d: Date) => d.getMonth() !== view.getMonth();
  const isToday      = (d: Date) => d.getTime() === today.getTime();
  const isPicked     = (d: Date) => picked?.getTime() === d.getTime();

  const isDayClosed  = (d: Date) => {
    const key = toLocalDateKey(d);
    return key in openDays && !openDays[key];
  };

  const requiredMsg = (field: BookingField) =>
    t('crane.validation.required', { field: t(BOOKING_FIELD_I18N[field]) });

  const invalidMsg = (field: BookingField) =>
    t('crane.validation.invalid', { field: t(BOOKING_FIELD_I18N[field]) });

  const collectClientErrors = (): Partial<Record<BookingField, string>> => {
    const errors: Partial<Record<BookingField, string>> = {};
    if (!form.voornaam.trim()) errors.voornaam = requiredMsg('voornaam');
    if (!form.email.trim()) errors.email = requiredMsg('email');
    if (!form.straat.trim()) errors.straat = requiredMsg('straat');
    if (!form.huisnummer.trim()) errors.huisnummer = requiredMsg('huisnummer');
    else if (!isValidHouseNumber(form.huisnummer)) errors.huisnummer = invalidMsg('huisnummer');
    if (!form.postcode.trim()) errors.postcode = requiredMsg('postcode');
    else if (!isValidPostalCode(form.postcode)) errors.postcode = invalidMsg('postcode');
    if (!form.stad.trim()) errors.stad = requiredMsg('stad');
    if (!lengthCm) errors.length = requiredMsg('length');
    if (!selectedBookableServices.length) errors.service = requiredMsg('service');
    if (!picked) errors.date = requiredMsg('date');
    if (!time) errors.time = requiredMsg('time');
    return errors;
  };

  const clientValidationMessage = (errors: Partial<Record<BookingField, string>> = collectClientErrors()) => {
    const labels = (Object.keys(errors) as BookingField[]).map((key) => t(BOOKING_FIELD_I18N[key]));
    if (!labels.length) return null;
    return t('crane.validation.incomplete', { fields: labels.join(', ') });
  };

  const scrollToError = (el: HTMLElement | null) => {
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (typeof el.focus === 'function') {
      try {
        el.focus({ preventScroll: true });
      } catch {
        /* ignore non-focusable */
      }
    }
  };

  const focusFirstFieldError = (errors: Partial<Record<BookingField, string>>) => {
    const order: BookingField[] = ['voornaam', 'email', 'straat', 'huisnummer', 'postcode', 'stad', 'length', 'service', 'date', 'time'];
    const first = order.find((key) => errors[key]);
    if (!first) {
      scrollToError(submitErrorRef.current);
      return;
    }
    scrollToError(fieldRefs.current[first] ?? submitErrorRef.current);
  };

  const showSubmitError = (
    message: string,
    errors: Partial<Record<BookingField, string>> = {},
  ) => {
    setFieldErrors(errors);
    setSubmitError(message);
    window.setTimeout(() => {
      if (Object.keys(errors).length) focusFirstFieldError(errors);
      else scrollToError(submitErrorRef.current);
    }, 40);
  };

  const translateApiBookingError = (err: unknown): { message: string; fields: Partial<Record<BookingField, string>> } => {
    const apiErrors = getApiValidationErrors(err);
    const fields: Partial<Record<BookingField, string>> = {};
    const messages: string[] = [];

    for (const [apiKey, apiMessages] of Object.entries(apiErrors)) {
      const field = API_FIELD_TO_BOOKING[apiKey];
      if (field) {
        const apiMessage = apiMessages[0] ?? '';
        const looksRequired = /required|verplicht|erforderlich|obligatoire/i.test(apiMessage);
        const msg = looksRequired || !apiMessage ? requiredMsg(field) : invalidMsg(field);
        fields[field] = msg;
        messages.push(msg);
        continue;
      }
      if (apiMessages[0]) messages.push(apiMessages[0]);
    }

    if (messages.length) {
      return { message: messages.join(' '), fields };
    }

    return {
      message: getApiErrorMessage(err, t('crane.submitFailed')),
      fields: {},
    };
  };

  React.useEffect(() => {
    if (!slotsError) return;
    const id = window.setTimeout(() => scrollToError(slotsErrorRef.current), 0);
    return () => window.clearTimeout(id);
  }, [slotsError, slotsErrorMessage]);

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

  const addressComplete =
    !!form.straat.trim() &&
    isValidHouseNumber(form.huisnummer) &&
    isValidPostalCode(form.postcode) &&
    !!form.stad.trim();

  const canSubmit =
    !submitting && !submitted && !!picked && !!time &&
    !!selectedBookableServices.length && !!lengthCm &&
    !!form.voornaam.trim() && !!form.email.trim() &&
    addressComplete;

  const submitBlockReason = (): string => {
    const reasons: string[] = [];
    if (submitting) reasons.push('submitting');
    if (submitted) reasons.push('already_submitted');
    if (!picked) reasons.push('missing_date');
    if (!time) reasons.push('missing_time');
    if (!selectedBookableServices.length) reasons.push('missing_service');
    if (!lengthCm) reasons.push('missing_length');
    if (!form.voornaam) reasons.push('missing_first_name');
    if (!form.email) reasons.push('missing_email');
    if (!form.straat.trim()) reasons.push('missing_street');
    if (!isValidHouseNumber(form.huisnummer)) reasons.push('invalid_house_number');
    if (!isValidPostalCode(form.postcode)) reasons.push('invalid_postal_code');
    if (!form.stad.trim()) reasons.push('missing_city');
    return reasons.join(',') || 'unknown';
  };

  const submit = async () => {
    if (!canSubmit || !picked || !time) return;
    const requestId = generateRequestId();
    setSubmitError(null);
    setSubmitting(true);
    trackEvent('booking_submit_clicked', {
      request_id: requestId,
      intent: 'crane_booking',
      api_method: 'POST',
      api_endpoint: '/v1/booking',
    });
    try {
      const result = await bookingService.book({
        first_name:  form.voornaam,
        last_name:   form.achternaam,
        phone:       form.phone || null,
        email:       form.email,
        locale,
        date:        toLocalDateKey(picked),
        start_time:  time,
        notes:       form.notes || null,
        address: {
          street:      form.straat.trim(),
          house_number: form.huisnummer.trim(),
          postal_code: formatPostalCode(form.postcode),
          city:        form.stad.trim(),
          country:     'NL',
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
      }, { requestId });
      const correlatedRequestId = result.requestId || requestId;
      const appointmentId = result.data?.appointment_id;

      if (images.length && appointmentId) {
        const fd = new FormData();
        images.forEach(img => fd.append('photos[]', img));
        try {
          await bookingService.uploadBookingPhotos(appointmentId, fd, { requestId: correlatedRequestId });
        } catch (photoErr) {
          console.error('Booking photo upload failed', photoErr);
          trackEvent('photo_upload_failed', {
            request_id: correlatedRequestId,
            intent: 'crane_booking',
            entity_type: 'booking',
            entity_id: appointmentId,
            api_method: 'POST',
            api_endpoint: `/v1/booking/${appointmentId}/photos`,
            http_status: getApiErrorStatus(photoErr),
            metadata: { message: getApiErrorMessage(photoErr) },
          });
        }
      }

      trackEvent('booking_succeeded', {
        request_id: correlatedRequestId,
        intent: 'crane_booking',
        http_status: result.status,
        entity_type: 'booking',
        entity_id: appointmentId,
        api_method: 'POST',
        api_endpoint: '/v1/booking',
      });
      setSubmitted(true);
      push({ tone: 'success', title: t('crane.submitSuccess') });
    } catch (err) {
      const failedRequestId = getApiRequestId(err) ?? requestId;
      const translated = translateApiBookingError(err);
      const message = translated.message;
      trackEvent('booking_failed', {
        request_id: failedRequestId,
        intent: 'crane_booking',
        http_status: getApiErrorStatus(err),
        api_method: 'POST',
        api_endpoint: '/v1/booking',
        metadata: { message },
      });
      trackEvent('frontend_error_shown', {
        request_id: failedRequestId,
        intent: 'crane_booking',
        http_status: getApiErrorStatus(err),
        api_method: 'POST',
        api_endpoint: '/v1/booking',
        metadata: { message },
      });
      showSubmitError(message, translated.fields);
      push({ tone: 'error', title: t('crane.submitFailed'), message });
    } finally {
      flushTrackEvents();
      setSubmitting(false);
    }
  };

  const onSubmitClick = () => {
    if (submitting || submitted) return;
    if (!canSubmit) {
      const errors = collectClientErrors();
      const message = clientValidationMessage(errors) ?? t('crane.submitFailed');
      showSubmitError(message, errors);
      trackEvent('booking_submit_blocked', {
        intent: 'crane_booking',
        api_method: 'POST',
        api_endpoint: '/v1/booking',
        metadata: { reason: submitBlockReason() },
      });
      flushTrackEvents();
      return;
    }
    setSubmitError(null);
    setFieldErrors({});
    setConfirmSubmit(true);
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
      {process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? (
        <Script
          src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`}
          onLoad={() => setGoogleLoaded(true)}
          onError={() => setGoogleError(true)}
        />
      ) : null}

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
                  ref={(el) => { fieldRefs.current.voornaam = el; }}
                  label={t('crane.validation.firstName')}
                  placeholder="Jan"
                  required
                  value={form.voornaam}
                  onChange={setField('voornaam')}
                  error={fieldErrors.voornaam}
                  title={fieldErrors.voornaam}
                />
                <Input
                  label="Achternaam"
                  placeholder="Jansen"
                  value={form.achternaam}
                  onChange={setField('achternaam')}
                />
                <Input
                  label={t('crane.phone')}
                  placeholder="06 12345678"
                  type="tel"
                  value={form.phone}
                  onChange={setField('phone')}
                />
                <Input
                  ref={(el) => { fieldRefs.current.email = el; }}
                  label={t('crane.email')}
                  type="email"
                  placeholder="jan@voorbeeld.nl"
                  required
                  value={form.email}
                  onChange={setField('email')}
                  error={fieldErrors.email}
                  title={fieldErrors.email}
                />
              </div>

              {/* Address — four full-width fields. Street is the Places search box. */}
              <SectionTitle icon={<MapPin className="h-4 w-4" />} className="mt-8">
                {t('crane.address.title')}
              </SectionTitle>
              {googleError ? (
                <p id="address-manual-hint" role="status" className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  {t('crane.address.manualFallback')}
                </p>
              ) : null}
              <div className="mt-4 flex flex-col gap-4">
                <Input
                  ref={(el) => {
                    addressRef.current = el;
                    fieldRefs.current.straat = el;
                  }}
                  id="street"
                  name="street"
                  label={t('crane.address.street')}
                  placeholder={t('crane.address.streetPlaceholder')}
                  required
                  autoComplete="off"
                  className="h-14 px-4 text-base"
                  value={form.straat}
                  onChange={setField('straat')}
                  error={fieldErrors.straat}
                  title={fieldErrors.straat}
                  hint={googleError ? undefined : t('crane.address.autocompleteHint')}
                  aria-describedby={googleError ? 'address-manual-hint' : undefined}
                />
                <Input
                  ref={(el) => { fieldRefs.current.huisnummer = el; }}
                  id="house_number"
                  name="house_number"
                  label={t('crane.address.houseNumber')}
                  placeholder={t('crane.address.housePlaceholder')}
                  required
                  autoComplete="off"
                  className="h-14 px-4 text-base"
                  value={form.huisnummer}
                  onChange={setField('huisnummer')}
                  error={fieldErrors.huisnummer}
                  title={fieldErrors.huisnummer}
                />
                <Input
                  ref={(el) => { fieldRefs.current.postcode = el; }}
                  id="postal_code"
                  name="postal_code"
                  label={t('crane.address.postalCode')}
                  placeholder={t('crane.address.postalPlaceholder')}
                  required
                  autoComplete="postal-code"
                  className="h-14 px-4 text-base"
                  value={form.postcode}
                  onChange={setField('postcode')}
                  error={fieldErrors.postcode}
                  title={fieldErrors.postcode}
                />
                <Input
                  ref={(el) => { fieldRefs.current.stad = el; }}
                  id="city"
                  name="city"
                  label={t('crane.address.city')}
                  placeholder={t('crane.address.cityPlaceholder')}
                  required
                  autoComplete="address-level2"
                  className="h-14 px-4 text-base"
                  value={form.stad}
                  onChange={setField('stad')}
                  error={fieldErrors.stad}
                  title={fieldErrors.stad}
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
                <div className="sm:col-span-2">
                  <p className="mb-1.5 text-sm font-medium text-navy-800">Merk en model</p>
                  <div className="grid gap-4 sm:grid-cols-2">
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
                  </div>
                </div>
                <Input
                  label="Bouwjaar"
                  placeholder="2015"
                  inputMode="numeric"
                  value={form.boatYear}
                  onChange={setField('boatYear')}
                />
                <Input
                  ref={(el) => { fieldRefs.current.length = el; }}
                  label={t('crane.boatLength')}
                  placeholder="890"
                  inputMode="numeric"
                  required
                  hint={t('crane.boatLengthHint')}
                  value={form.length}
                  onChange={setField('length')}
                  error={fieldErrors.length}
                  title={fieldErrors.length}
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
              {catalogQuery.error ? (
                <p role="status" className="mt-2 text-xs text-amber-700">
                  {t('crane.catalogUnavailable')}
                </p>
              ) : null}
              {!catalogQuery.loading && !catalogQuery.error && bookableServices.length === 0 ? (
                <p role="status" className="mt-2 text-xs text-navy-500">
                  {t('crane.noBookableServices')}
                </p>
              ) : null}
              <div
                ref={(el) => { fieldRefs.current.service = el; }}
                tabIndex={-1}
                className={cn('mt-8 scroll-mt-28 outline-none', fieldErrors.service && 'rounded-xl ring-2 ring-rose-300')}
              >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <SectionTitle icon={<Sparkles className="h-4 w-4" />}>
                  {t('crane.services')}
                </SectionTitle>
                {canManageProducts ? (
                  <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold">
                    <Link
                      href={`/${locale}/admin/producten`}
                      className="text-marine-700 underline-offset-2 hover:underline"
                    >
                      {t('adminModules.hubs.servicesPricing.services')}
                    </Link>
                    <Link
                      href={`/${locale}/admin/calculator/pricing`}
                      className="text-marine-700 underline-offset-2 hover:underline"
                    >
                      {t('adminModules.hubs.servicesPricing.rules')}
                    </Link>
                  </div>
                ) : null}
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {bookableServices.map(s => {
                  const Icon   = s.icon;
                  const active = selectedServices.includes(s.code);
                  const catalogService = catalogServiceFor(s, catalogServices);
                  const productSearch = catalogService?.code ?? catalogService?.service_code ?? s.catalogServiceCodes[0];
                  const price = servicePriceForLength(s, lengthCm, catalogServices);
                  const duration = serviceDurationForLength(s, lengthCm, catalogServices);
                  return (
                    <div key={s.code} className="flex items-stretch gap-2">
                      <button
                        type="button"
                        onClick={() => toggleService(s.code)}
                        className={cn(
                          'flex min-w-0 flex-1 items-center gap-3 rounded-xl border p-3.5 text-left transition',
                          active
                            ? 'border-navy-900 bg-navy-900 text-white shadow-card'
                            : 'border-navy-100 bg-white text-navy-900 hover:border-navy-300'
                        )}
                      >
                        <div className={cn(
                          'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
                          active ? 'bg-white/10 text-gold-300' : 'bg-sand-100 text-navy-700'
                        )}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold">{s.label}</div>
                          <div className={cn('text-xs', active ? 'text-sand-100/80' : 'text-navy-400')}>
                            {duration != null ? `Ca. ${duration} min` : '—'}
                          </div>
                        </div>
                        <div className={cn('shrink-0 text-sm font-semibold', active ? 'text-gold-300' : 'text-navy-900')}>
                          {price == null ? t('servicePage.onRequest') : formatCurrency(price, currencyLocale)}
                          {price != null && !lengthCm ? (
                            <span className={cn('ml-0.5 text-[10px] font-normal', active ? 'text-sand-100/70' : 'text-navy-400')}>
                              v.a.
                            </span>
                          ) : null}
                        </div>
                      </button>
                      {canManageProducts ? (
                        <Link
                          href={`/${locale}/admin/producten?search=${encodeURIComponent(productSearch)}`}
                          aria-label={`Beheer product voor ${s.label}`}
                          title={`Beheer product voor ${s.label}`}
                          className="inline-flex w-10 shrink-0 items-center justify-center rounded-xl border border-navy-100 bg-white text-navy-500 transition hover:border-marine-300 hover:text-marine-700"
                        >
                          <Pencil className="h-4 w-4" />
                        </Link>
                      ) : null}
                    </div>
                  );
                })}
              </div>
              {fieldErrors.service ? (
                <p className="mt-2 text-xs text-rose-600" title={fieldErrors.service}>{fieldErrors.service}</p>
              ) : null}
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
            <div
              ref={(el) => { fieldRefs.current.date = el; }}
              tabIndex={-1}
              className={cn('scroll-mt-28 outline-none', fieldErrors.date && 'rounded-xl ring-2 ring-rose-300')}
            >
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
                      onClick={() => {
                        clearFieldError('date');
                        clearFieldError('time');
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
              {fieldErrors.date ? (
                <p className="mt-2 text-xs text-rose-600" title={fieldErrors.date}>{fieldErrors.date}</p>
              ) : null}

              <div
                ref={(el) => { fieldRefs.current.time = el; }}
                tabIndex={-1}
                className={cn('mt-5 scroll-mt-28 border-t border-navy-100 pt-4 outline-none', fieldErrors.time && 'rounded-lg ring-2 ring-rose-300')}
              >
                <SectionTitle icon={<Clock className="h-4 w-4" />}>
                  {picked
                    ? t('crane.timeSlots', { date: `${picked.getDate()} ${DUTCH_MONTHS[picked.getMonth()]}` })
                    : t('crane.selectDate')}
                </SectionTitle>
                {slotsError === 'closed' && (
                  <p
                    ref={slotsErrorRef}
                    tabIndex={-1}
                    role="alert"
                    className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800 outline-none ring-rose-300 focus-visible:ring-2"
                  >
                    {t('crane.dayClosed')}
                  </p>
                )}
                {slotsError === 'error' && (
                  <p
                    ref={slotsErrorRef}
                    tabIndex={-1}
                    role="alert"
                    className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-800 outline-none ring-rose-300 focus-visible:ring-2"
                  >
                    {slotsErrorMessage ?? t('crane.slotsLoadFailed')}
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
                          onClick={() => {
                            clearFieldError('time');
                            setTime(s);
                          }}
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
                {fieldErrors.time ? (
                  <p className="mt-2 text-xs text-rose-600" title={fieldErrors.time}>{fieldErrors.time}</p>
                ) : null}
              </div>
            </Card>
            </div>

            <Card className="overflow-visible">
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
                  <span className="text-2xl font-semibold">
                    {finalPrice == null ? t('servicePage.onRequest') : `€${finalPrice.toFixed(2)}`}
                  </span>
                </div>
              </div>
              <div className="px-5 py-4">
                {submitError ? (
                  <div
                    ref={submitErrorRef}
                    tabIndex={-1}
                    role="alert"
                    className="mb-3 scroll-mt-28 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-800 outline-none ring-rose-300 focus-visible:ring-2"
                  >
                    {submitError}
                  </div>
                ) : (
                  <div ref={submitErrorRef} className="sr-only" aria-hidden />
                )}
                <div className="group relative">
                  {!canSubmit && !submitting && !submitted ? (
                    <div
                      role="tooltip"
                      className="pointer-events-none absolute bottom-full left-0 right-0 z-20 mb-2 hidden rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-left text-xs text-rose-800 shadow-md group-hover:block group-focus-within:block"
                    >
                      {clientValidationMessage() ?? t('crane.validation.hoverHint')}
                    </div>
                  ) : null}
                  <Button
                    type="button"
                    variant="gold"
                    size="lg"
                    fullWidth
                    disabled={submitting || submitted}
                    rightIcon={<ArrowRight className="h-4 w-4" />}
                    title={
                      !canSubmit && !submitting && !submitted
                        ? (clientValidationMessage() ?? t('crane.validation.hoverHint'))
                        : undefined
                    }
                    onClick={onSubmitClick}
                  >
                    {submitted ? t('crane.submitSuccess') : t('crane.submit')}
                  </Button>
                </div>
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
