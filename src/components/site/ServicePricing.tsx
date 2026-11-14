'use client';
import { CanonicalServiceEditor, InlineTariffEditor } from './CanonicalServiceEditor';
import { useCatalogUpdates } from '@/lib/catalog-events';
import { TranslatedText } from '@/components/cms/TranslatedText';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Anchor, ArrowRight, CalendarDays, Check, ChevronDown, Drill, Info, Ship, Warehouse } from 'lucide-react';
import { EditableText } from '@/components/cms/EditableText';
import { useCms } from '@/components/cms/CmsProvider';
import { useIntl } from '@/i18n/IntlProvider';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/cn';
import { formatCurrency, intlLocale } from '@/lib/format';
import { getApiErrorStatus } from '@/lib/api-error';
import { useQuery } from '@/lib/hooks/useAsync';
import { portalService, serviceCatalogService, type BookingQuote, type ServiceCatalogService } from '@/lib/services';

export const YARD_SERVICES = [
  { code: 'kranen', product: 'KRANEN', icon: Anchor },
  { code: 'afspuiten', product: 'AFSPUITEN', icon: Drill },
  { code: 'weekje-op-wal', product: 'WEEK-OP-WAL', icon: CalendarDays },
  { code: 'winterstalling', product: 'STALL-WINTER', icon: Warehouse },
] as const;

export type YardService = typeof YARD_SERVICES[number]['code'];

export function yardService(code: string | undefined) {
  return YARD_SERVICES.find((service) => service.code === code)?.code;
}

const tile = 'flex min-h-12 min-w-0 items-center justify-center gap-2 rounded-xl border px-2 py-3 text-center text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500';

function lengthInCentimetres(text: string, unit: 'cm' | 'm') {
  if (unit === 'cm') return /^[1-9]\d{0,3}$/.test(text) ? Number(text) : 0;
  const decimal = /^(\d{1,2})(?:[.,](\d{1,2}))?$/.exec(text);
  if (!decimal) return 0;
  const [, metres, fraction = ''] = decimal;
  return Number(metres) * 100 + Number(fraction.padEnd(2, '0'));
}

function tariffRange(rule: { range_from_cm: number; range_to_cm: number }) {
  return rule.range_from_cm + (rule.range_to_cm >= 99999 ? '+' : '–' + rule.range_to_cm);
}

function tariffRangeMetres(rule: { range_from_cm: number; range_to_cm: number }, locale: string) {
  const format = new Intl.NumberFormat(intlLocale(locale), { maximumFractionDigits: 2 });
  const from = format.format(rule.range_from_cm / 100);
  return rule.range_to_cm >= 99999 ? from + '+' : `${from} – ${format.format(rule.range_to_cm / 100)}`;
}

export function ServicePricing({
  services, loading, catalogUnavailable = false, active, onActiveChange, single = false, cmsPage,
}: {
  services: ServiceCatalogService[];
  loading: boolean;
  catalogUnavailable?: boolean;
  active: YardService;
  onActiveChange?: (service: YardService) => void;
  single?: boolean;
  cmsPage?: string;
}) {
  const catalogStatus = useCatalogUpdates();
  const { t, locale } = useIntl();
  const router = useRouter();
  const { user, isPortalSession, isDemo } = useAuth();
  const { isCmsEditing } = useCms();
  const customerId = isPortalSession && !isDemo ? user?.id : undefined;
  const boats = useQuery([customerId], async () => customerId ? { customerId, items: await portalService.boats() } : null);
  const ownedBoats = boats.data?.customerId === customerId ? boats.data?.items ?? [] : [];
  const [length, setLength] = React.useState(() => single ? '' : new Intl.NumberFormat(intlLocale(locale), { minimumFractionDigits: 2 }).format(8.2));
  const [lengthUnit, setLengthUnit] = React.useState<'cm' | 'm'>(single ? 'cm' : 'm');
  const [lengthTouched, setLengthTouched] = React.useState(false);
  const [boatId, setBoatId] = React.useState('');
  const [direction, setDirection] = React.useState('out');
  const [operationCounts, setOperationCounts] = React.useState<Partial<Record<YardService, number>>>({});
  const [pricingDate, setPricingDate] = React.useState('');
  const datedCatalog = useQuery([pricingDate, locale], async () => ({
    date: pricingDate, services: (await serviceCatalogService.services(undefined, locale, { date: pricingDate })).services,
  }), { immediate: !!pricingDate });
  const currentServices = pricingDate ? datedCatalog.data?.date === pricingDate ? datedCatalog.data.services : [] : services;
  const [periodFrom, setPeriodFrom] = React.useState('');
  const [periodTo, setPeriodTo] = React.useState('');
  const [width, setWidth] = React.useState('');
  const [weight, setWeight] = React.useState('');
  const [catalogTick, setCatalogTick] = React.useState(0);
  const [extra, setExtra] = React.useState<YardService | null>(null);
  const previousActive = React.useRef(active);
  const [tab, setTab] = React.useState<YardService>(active);
  const [estimate, setEstimate] = React.useState<{ key: string; quote: BookingQuote | null }>();
  const [openingBooking, setOpeningBooking] = React.useState(false);
  const [bookingErrorKey, setBookingErrorKey] = React.useState('');
  const inputId = React.useId();
  const tabRefs = React.useRef<(HTMLButtonElement | null)[]>([]);
  const currency = (cents: number) => formatCurrency(cents / 100, intlLocale(locale));
  const catalog = (code: YardService) => currentServices.find((service) =>
    service.code === YARD_SERVICES.find((item) => item.code === code)?.product,
  );
  const label = (code: YardService) => single ? catalog(code)?.name ?? t('yardPricing.' + code) : t('yardPricing.' + code);
  const enabled = (code: YardService) => !!catalog(code);
  const companion = (catalog(active)?.options?.optional_extras ?? catalog(active)?.options?.compatible_with ?? [])
    .map((code) => yardService(code)).find((code): code is YardService => !!code) ?? null;
  const canCombine = !single && companion && catalog(active)?.options?.compatible_with?.includes(companion) && catalog(companion)?.options?.compatible_with?.includes(active);
  const codes = canCombine && extra === companion ? [active, extra] : [active];
  const selectedBoat = ownedBoats.find((boat) => boat.id === boatId);
  const displayLength = selectedBoat ? String(selectedBoat.length_cm ?? '') : length;
  const displayWidth = selectedBoat?.width_cm ?? width;
  const displayWeight = selectedBoat?.weight_kg ?? weight;
  const text = displayLength.trim();
  const cm = lengthInCentimetres(text, lengthUnit);
  const invalidLength = !cm && (!!text || lengthTouched);
  const craneOptions = catalog('kranen')?.options;
  const maxOperations = (code: YardService) => Math.min(10, catalog(code)?.options?.max_operations ?? 1);
  const directions = (craneOptions?.directions ?? []).filter((option) => option !== 'both' || maxOperations('kranen') >= 2);
  const selectedDirection = directions.includes(direction) ? direction : directions[0];
  const operationCount = (code: YardService) => code === 'kranen' && selectedDirection === 'both' ? 2 : Math.min(operationCounts[code] ?? 1, maxOperations(code));
  const quantities = Object.fromEntries(codes.filter((code) => operationCount(code) > 1).map((code) => [code, operationCount(code)]));
  const options = {
    ...(codes.includes('kranen') && selectedDirection ? { direction: selectedDirection } : {}),
    ...(Object.keys(quantities).length ? { quantities } : {}),
    ...(catalog(active)?.options?.period ? { period_from: periodFrom || undefined, period_to: periodTo || undefined } : {}),
    ...(displayWidth ? { width_cm: Number(displayWidth) } : {}), ...(displayWeight ? { weight_kg: Number(displayWeight) } : {}),
  };
  const key = cm > 0 && codes.every(enabled) && (!boatId || selectedBoat) ? JSON.stringify({ cm, codes, options, date: pricingDate || undefined, boatId: selectedBoat?.id, catalogTick, revisions: currentServices.map((s) => s.tariffs?.map((r) => [r.id, r.revision])) }) : '';
  const current = key && estimate?.key === key ? estimate : undefined;
  const quote = current?.quote;
  const catalogLoading = pricingDate ? datedCatalog.loading || (!datedCatalog.error && datedCatalog.data?.date !== pricingDate) : loading;
  const catalogFailed = pricingDate ? !!datedCatalog.error : catalogUnavailable;
  const priced = quote && quote.price_status !== 'on_request' && !quote.requires_manual_price && !quote.requires_on_request;
  const bookable = priced && quote.total_incl_vat > 0;
  const shownService = catalog(tab);
  const tabs = single ? YARD_SERVICES.filter(({ code }) => code === active) : YARD_SERVICES;

  React.useEffect(() => {
    setBoatId('');
  }, [customerId]);

  React.useEffect(() => {
    setTab(active);
  }, [active]);

  React.useEffect(() => {
    const previous = previousActive.current;
    previousActive.current = active;
    if (extra === active && previous !== active && catalog(active)?.options?.compatible_with?.includes(previous)) {
      setExtra(previous);
    } else if (extra && catalog(active) && !catalog(active)?.options?.compatible_with?.includes(extra)) {
      setExtra(null);
    }
  }, [active, extra, currentServices]); // Catalog changes can also remove compatibility.

  React.useEffect(() => {
    const refresh = () => setCatalogTick((tick) => tick + 1);
    const storage = (event: StorageEvent) => { if (event.key === 'catalog-published') refresh(); };
    window.addEventListener('catalog-published', refresh);
    window.addEventListener('storage', storage);
    window.addEventListener('focus', refresh);
    return () => {
      window.removeEventListener('catalog-published', refresh);
      window.removeEventListener('storage', storage);
      window.removeEventListener('focus', refresh);
    };
  }, []);

  React.useEffect(() => {
    if (single) return;
    const readTab = () => {
      const code = yardService(window.location.hash.slice('#prijzen-'.length));
      if (window.location.hash.startsWith('#prijzen-') && code) setTab(code);
    };
    readTab();
    window.addEventListener('hashchange', readTab);
    return () => window.removeEventListener('hashchange', readTab);
  }, [single]);

  React.useEffect(() => {
    if (!key) return;
    let cancelled = false;
    const selection = JSON.parse(key);
    const timer = window.setTimeout(async () => {
      try {
        const result = await serviceCatalogService.preview(selection.cm, selection.codes, selection.options, selection.date, selection.boatId);
        if (!cancelled) setEstimate({ key, quote: result });
      } catch {
        if (!cancelled) setEstimate({ key, quote: null });
      }
    }, 180);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [key]);

  const changeTab = (code: YardService) => {
    setTab(code);
    window.history.replaceState(window.history.state, '', '#prijzen-' + code);
  };
  const selectService = (code: YardService) => {
    if (code === active) {
      if (extra) {
        onActiveChange?.(extra);
        setExtra(null);
      }
      return;
    }
    setTab(code);
    if (canCombine && code === companion) {
      setExtra(extra === code ? null : code);
    } else {
      setExtra(null);
      onActiveChange?.(code);
    }
  };

  const copy = (name: string) => cmsPage ? (
    <EditableText blockKey={cmsPage + '.pricing.' + name} page={cmsPage} section="prices">
      {t('yardPricing.' + name)}
    </EditableText>
  ) : t('yardPricing.' + name);

  const params = new URLSearchParams({ services: codes.join(',') });
  if (cm) params.set('length_cm', String(cm));
  const cta = '/' + locale + '/contact?' + params;
  const openBooking = async () => {
    if (!quote || !bookable || openingBooking) return;
    setOpeningBooking(true);
    setBookingErrorKey('');
    try {
      const { token, journey } = await serviceCatalogService.createBookingSelection(cm, codes, options, pricingDate || undefined, selectedBoat?.id, quote);
      router.push('/' + locale + (journey === 'storage-request' ? '/diensten/aanvraag' : '/kraanafspraak') + '?selection=' + encodeURIComponent(token));
    } catch (error) {
      if (getApiErrorStatus(error) === 409) {
        setBookingErrorKey('');
        window.dispatchEvent(new Event('catalog-published'));
      } else {
        setBookingErrorKey(key);
      }
    } finally {
      setOpeningBooking(false);
    }
  };
  const ctaClass = 'flex w-full items-center justify-center gap-2 rounded-lg bg-[#ad7320] px-3 py-3 text-center text-sm font-bold text-white hover:bg-gold-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-60';
  const pickedRule = quote?.services.find((line) => line.service_code === tab)?.rule_id;
  const quotedRule = catalog(active)?.tariffs?.find((rule) =>
    rule.id === quote?.services.find((line) => line.service_code === active)?.rule_id && cm >= rule.range_from_cm && cm <= rule.range_to_cm,
  );
  const infoSection = { kranen: 'crane', afspuiten: 'wash', winterstalling: 'storage', 'weekje-op-wal': null }[tab];
  const rangeLabel = quotedRule && (single ? tariffRange(quotedRule) + ' ' + t('yardPricing.unitCm') : tariffRangeMetres(quotedRule, locale) + ' ' + t('yardPricing.unit'));
  return (
    <>
      <section id="prijsberekening" className={cn('scroll-mt-24', !single && 'container-wide relative z-10 sm:-mt-5 lg:px-[4.65%]')}>
        <div className={cn('grid gap-6 rounded-[1.125rem] border border-white bg-gradient-to-b from-white to-[#faf8f5] p-5 shadow-[0_8px_28px_-14px_#50412b80,0_3px_7px_#50412b19] sm:px-6 sm:py-7', single ? 'lg:grid-cols-2' : 'lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1.18fr)_minmax(0,1fr)] lg:gap-7')}>
          <div>
            <p className="mb-1 text-sm font-bold uppercase tracking-wide text-gold-600">{copy('eyebrow')}</p>
            <h2 className="heading-display text-4xl font-bold leading-none sm:text-[2.625rem]">{copy('title')}</h2>
            <p className="mt-4 text-[.8125rem] leading-relaxed text-navy-700">{copy('intro')}</p>
            <ul className="mt-5 grid gap-2.5 text-sm text-navy-700">
              {(['live', 'direct', 'request'] as const).map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <Check aria-hidden="true" className="h-5 w-5 shrink-0 text-gold-800" /> {copy(item)}
                </li>
              ))}
            </ul>
          </div>
          <div className={cn('min-w-0 space-y-3', single && 'lg:col-start-1 lg:row-start-2')}>
            <fieldset>
              <legend className="mb-2 text-sm font-bold">{copy('select')}</legend>
              <div className={cn('grid gap-2.5', !single && 'grid-cols-2')}>
                {tabs.map(({ code, icon: Icon }) => (
                  <button key={code} type="button" aria-pressed={codes.includes(code)} title={catalog(code)?.name}
                    disabled={single || !enabled(code)} onClick={() => selectService(code)}
                    className={cn(tile, 'min-h-[3.875rem] flex-col gap-1 rounded-[.625rem] px-1 py-2 text-xs sm:text-sm', codes.includes(code) ? 'border-gold-500 bg-[#f8f1df] text-navy-950' : 'border-navy-200 bg-white hover:border-gold-600', !enabled(code) && 'opacity-60')}>
                    <Icon aria-hidden="true" className={cn('h-5 w-5 shrink-0', codes.includes(code) ? 'text-gold-600' : 'text-navy-600')} />
                    {single ? label(code) : <TranslatedText textKey={'yardPricing.' + code} />}
                  </button>
                ))}
              </div>
            </fieldset>
            {ownedBoats.length > 0 && (
              <label className="block text-sm font-semibold">
                <TranslatedText textKey={'login.chooseBoat'} />
                <select value={boatId} className="mt-1 block w-full rounded-lg border border-navy-200 bg-white p-2"
                  onChange={(event) => {
                    setBoatId(event.target.value);
                    setLengthUnit('cm');
                    setLength('');
                    setWidth('');
                    setWeight('');
                  }}>
                  <option value="">{t('login.newBoat')}</option>
                  {ownedBoats.map((boat) => <option key={boat.id} value={boat.id}>{boat.name}</option>)}
                </select>
              </label>
            )}
            <div>
              <label htmlFor={inputId} className="mb-1.5 block text-sm font-bold">
                <span aria-hidden="true">{copy('length')}</span>
              </label>
              <div className="flex items-center rounded-lg border border-navy-200 bg-white focus-within:border-gold-600">
                <input id={inputId} value={displayLength} inputMode={lengthUnit === 'm' ? 'decimal' : 'numeric'} placeholder={lengthUnit === 'm' ? '8,20' : '820'} readOnly={!!selectedBoat}
                  aria-label={t(lengthUnit === 'm' ? 'yardPricing.lengthMetres' : 'yardPricing.lengthCm')}
                  aria-invalid={invalidLength} aria-describedby={invalidLength ? inputId + '-error' : undefined}
                  onBlur={() => setLengthTouched(true)}
                  onChange={(event) => {
                    setLength(event.target.value);
                  }}
                  className="min-w-0 flex-1 rounded-lg bg-transparent px-3 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-600" />
                <select className="mr-2 rounded bg-sand-50 p-1.5 text-sm text-navy-900" aria-label={t('yardPricing.lengthUnit')} value={lengthUnit} disabled={!!selectedBoat}
                  onChange={(event) => {
                    const unit = event.target.value === 'm' ? 'm' : 'cm';
                    setLengthUnit(unit);
                    setLength(cm ? unit === 'cm' ? String(cm) : String(cm / 100) : '');
                  }}>
                  <option value="cm"><TranslatedText textKey="siteCopy.77c8e93c6b38736a" fallbackText={"cm"} inline={false} /></option>
                  <option value="m">{t('yardPricing.unit')}</option>
                </select>
              </div>
              {invalidLength && <p id={inputId + '-error'} className="mt-1 text-sm text-red-700"><TranslatedText textKey={lengthUnit === 'm' ? 'yardPricing.invalidMetres' : 'yardPricing.invalidLength'} /></p>}
            </div>
            {isCmsEditing && codes.map((code) => {
              const service = catalog(code);
              return service && <CanonicalServiceEditor key={code} service={service} />;
            })}
            <details className="group/options text-sm">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-xs font-semibold text-navy-600 marker:content-none">
                <TranslatedText textKey="smartServices.options" />
                <ChevronDown aria-hidden="true" className="h-4 w-4 group-open/options:rotate-180" />
              </summary>
              <div className="mt-3 space-y-3">
                {codes.map((code) => (
                  <div key={code} className="space-y-2">
                    {code === 'kranen' && directions.length > 0 && <label className="block"><TranslatedText textKey="smartServices.direction" />
                      <select className="input-base mt-1 w-full" value={selectedDirection} onChange={(event) => setDirection(event.target.value)}>
                        {directions.map((option) => <option key={option} value={option}>{t('smartServices.' + option)}</option>)}
                      </select>
                    </label>}
                    {maxOperations(code) > 1 && <label className="block"><TranslatedText textKey="yardPricing.operations" />
                      <select className="input-base mt-1 w-full" value={operationCount(code)} disabled={code === 'kranen' && selectedDirection === 'both'}
                        onChange={(event) => setOperationCounts((counts) => ({ ...counts, [code]: Number(event.target.value) }))}>
                        {Array.from({ length: maxOperations(code) }, (_, index) => <option key={index + 1}>{index + 1}</option>)}
                      </select>
                    </label>}
                    {catalog(code)?.options?.period && <div className="grid gap-2 min-[420px]:grid-cols-2">
                      <label><TranslatedText textKey="smartServices.periodFrom" /><input className="input-base w-full" type="date" value={periodFrom} onChange={(event) => setPeriodFrom(event.target.value)} /></label>
                      <label><TranslatedText textKey="smartServices.periodTo" /><input className="input-base w-full" type="date" min={periodFrom || undefined} value={periodTo} onChange={(event) => setPeriodTo(event.target.value)} /></label>
                    </div>}
                    {Object.entries(catalog(code)?.tariffs?.find((rule) => cm >= rule.range_from_cm && cm <= rule.range_to_cm)?.included_quantities ?? {}).map(([included, count]) => (
                      <span key={included} className="mr-1 inline-block rounded bg-emerald-50 px-2 py-1 text-emerald-800">
                        {count} × {included} · <TranslatedText textKey="yardPricing.included" />
                      </span>
                    ))}
                  </div>
                ))}
                <label className="block"><TranslatedText textKey="smartServices.pricingDate" /><input type="date" className="input-base mt-1 w-full" value={pricingDate} onChange={(event) => setPricingDate(event.target.value)} /></label>
                <details>
                  <summary className="cursor-pointer"><TranslatedText textKey="smartServices.dimensions" /></summary>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <label className="min-w-0"><TranslatedText textKey="smartServices.width" /><input type="number" min="1" className="input-base w-full" value={displayWidth} readOnly={selectedBoat?.width_cm != null} onChange={(e) => setWidth(e.target.value)} /></label>
                    <label className="min-w-0"><TranslatedText textKey="smartServices.weight" /><input type="number" min="1" className="input-base w-full" value={displayWeight} readOnly={selectedBoat?.weight_kg != null} onChange={(e) => setWeight(e.target.value)} /></label>
                  </div>
                </details>
              </div>
            </details>
          </div>
          <div className={cn('min-w-0 self-start rounded-xl bg-[linear-gradient(150deg,#122d47,#091e34)] p-[1.125rem] text-white', single && 'lg:col-start-2 lg:row-span-2 lg:row-start-1')}>
            <h3 className="text-sm font-bold uppercase tracking-wider">{copy('estimate')}</h3>
            {catalogStatus.changed && <p role="status" className="mt-2 text-sm"><TranslatedText textKey="smartServices.updated" /></p>}
            <div aria-live="polite" aria-atomic="true" className="mt-1.5">
              <p className="heading-display break-words text-4xl font-bold leading-none text-white sm:text-5xl">
                {priced ? currency(quote.total_incl_vat) : quote ? <TranslatedText textKey="yardPricing.priceOnRequest" /> : cm && (catalogLoading || key && !current) ? '…' : '—'}
              </p>
              <p className="mt-2 text-sm text-sand-100">
                {codes.map(label).join(' + ')}
                {rangeLabel && ` (${rangeLabel})`}
              </p>
              {((current && !quote) || (catalogFailed && !quote)) && <p className="mt-2 text-sm text-sand-100"><TranslatedText textKey={'servicePage.pricingUnavailable'} /></p>}
              {quote?.pricing_conditions?.capacity_restricted && <p className="mt-2 text-sm text-sand-100"><TranslatedText textKey="yardPricing.capacityReview" /></p>}
            </div>
            <details className="group/breakdown my-4 border-y border-white/30 text-sm">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-1 py-3.5 font-semibold marker:content-none">
                {copy('breakdown')}
                <ChevronDown aria-hidden="true" className="h-4 w-4 group-open/breakdown:rotate-180" />
              </summary>
              <div className="space-y-3 px-1 pb-3">
                {quote && quote.services.length > 0 && <dl className="space-y-2">
                  {quote.services.map((line) => (
                    <div key={line.service_code} className="flex justify-between gap-2">
                      <dt>{line.quantity && line.quantity > 1 ? line.quantity + ' × ' : ''}{currentServices.find((service) => service.id === line.product_id)?.name ?? line.service_code}</dt>
                      <dd className="text-right">
                        {line.is_on_request || line.is_manual ? t('servicePage.onRequest') : line.included_by && !line.billable_quantity ? t('yardPricing.included') : currency(line.price_incl_vat)}
                        {!line.is_on_request && !line.is_manual && !line.included_by && line.vat_rate !== undefined && (
                          <span className="block text-xs text-sand-100"><TranslatedText textKey={'servicePage.inclVat'} vars={{ rate: line.vat_rate }} /></span>
                        )}
                      </dd>
                    </div>
                  ))}
                  {priced && quote.total_vat !== undefined && (
                    <div className="flex justify-between gap-2"><dt><TranslatedText textKey={'yardPricing.vat'} /></dt><dd>{currency(quote.total_vat)}</dd></div>
                  )}
                </dl>}
                {quote && quote.total_duration_minutes > 0 && <p className="text-xs text-sand-100"><TranslatedText textKey="yardPricing.estimatedDuration" vars={{ minutes: quote.total_duration_minutes }} /></p>}
                <p className="text-xs text-sand-100">{copy('conditions')}</p>
              </div>
            </details>
            {quote?.pricing_conditions?.period_affects_price === false && (options.period_from || options.period_to) && (
              <p className="mb-4 text-xs text-sand-100"><TranslatedText textKey="yardPricing.periodConditions" /></p>
            )}
            {key && bookingErrorKey === key && <p role="alert" className="mb-2 text-sm"><TranslatedText textKey={'servicePage.pricingUnavailable'} /></p>}
            {bookable ? (
              <button type="button" className={ctaClass} disabled={openingBooking || catalogLoading} onClick={openBooking}>
                <TranslatedText textKey={openingBooking ? 'adminNew.common.loading' : (codes.every((c) => catalog(c)?.visibility?.booking) ? 'nav.bookCrane' : 'yardPricing.requestStorage')} /> <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0" />
              </button>
            ) : (
              <Link href={cta} className={ctaClass}>
                <TranslatedText textKey={active === 'winterstalling' ? 'yardPricing.requestStorage' : 'yardPricing.requestQuote'} /> <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0" />
              </Link>
            )}
          </div>
        </div>
      </section>

      <section className={cn('py-8', !single && 'container-wide lg:px-[5.4%]')} aria-labelledby={inputId + '-tariffs'}>
        <div className="mb-5 text-center">
          <p className="mb-1 text-sm font-bold uppercase tracking-wide text-gold-600"><TranslatedText textKey={'servicePage.pricesBadge'} /></p>
          <h2 id={inputId + '-tariffs'} className="heading-display text-4xl font-bold leading-none">{copy('tariffs')}</h2>
          <p className="mt-1.5 text-navy-700">{copy('tariffsIntro')}</p>
          <div className="mx-auto mt-3 h-0.5 w-14 bg-gold-600" />
        </div>
        {!single && (
          <div role="tablist" aria-labelledby={inputId + '-tariffs'} className="mb-5 grid grid-cols-2 gap-1 sm:grid-cols-4">
            {tabs.map(({ code, icon: Icon }, index) => (
              <button key={code} id={'prijzen-' + code} ref={(element) => { tabRefs.current[index] = element; }}
                type="button" role="tab" aria-selected={tab === code} aria-controls={inputId + '-table'} title={catalog(code)?.name}
                tabIndex={tab === code ? 0 : -1} onClick={() => changeTab(code)}
                onKeyDown={(event) => {
                  const next = { ArrowRight: (index + 1) % tabs.length, ArrowLeft: (index + tabs.length - 1) % tabs.length, Home: 0, End: tabs.length - 1 }[event.key];
                  if (next === undefined) return;
                  event.preventDefault();
                  changeTab(tabs[next].code);
                  tabRefs.current[next]?.focus();
                }}
                className={cn(tile, 'scroll-mt-24 rounded-[.875rem] shadow-sm', tab === code ? 'border-[#102940] bg-[#102940] text-sand-100' : 'border-navy-200 bg-navy-50 hover:border-gold-600')}>
                <Icon aria-hidden="true" className={cn('h-6 w-6 shrink-0', tab === code ? 'text-gold-300' : 'text-navy-600')} /><TranslatedText textKey={'yardPricing.' + code} />
              </button>
            ))}
          </div>
        )}
        <div className="grid items-start gap-5 lg:grid-cols-[1.77fr_1fr]">
          <div id={inputId + '-table'} role={single ? undefined : 'tabpanel'} aria-labelledby={single ? undefined : 'prijzen-' + tab} tabIndex={single ? undefined : 0}
            className="min-w-0 overflow-hidden rounded-[.875rem] border border-navy-100 bg-white shadow-card">
            <ServiceTariffTable tariffs={shownService?.tariffs ?? []} cm={cm} ruleId={pickedRule} loading={catalogLoading}
              metres={!single}
              editProductCode={isCmsEditing && user?.permissions?.includes('pricing.update') ? shownService?.code : undefined} />
          </div>
          <aside className="relative isolate min-h-48 overflow-hidden rounded-[.875rem] border border-navy-100 bg-gradient-to-b from-[#f7f4ef] to-navy-50 p-6 text-sm text-navy-800 shadow-card lg:min-h-[19rem]">
            <Ship aria-hidden="true" className="pointer-events-none absolute -bottom-11 right-1 -z-10 h-48 w-48 text-navy-200/55" strokeWidth={1} />
            <h3 className="mb-3 flex items-center gap-2.5 text-base font-bold"><Info aria-hidden="true" className="h-6 w-6 text-gold-600" />{copy('info')}</h3>
            {!single && shownService && infoSection ? (
              <ul className="space-y-2">
                {(['b1', 'b2', 'b3', 'b4'] as const).map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <Check aria-hidden="true" className="h-4 w-4 shrink-0 text-gold-600" />
                    <TranslatedText textKey={`werf.s.${infoSection}.${item}`} />
                  </li>
                ))}
              </ul>
            ) : <p>{shownService?.description ?? t('yardPricing.conditions')}</p>}
            {shownService && <CanonicalServiceEditor service={shownService} />}
            {isCmsEditing && user?.permissions?.includes('products.write') && shownService?.id && (
              <Link className="mt-3 block font-semibold underline" href={`/${locale}/admin/producten/${encodeURIComponent(shownService.id)}`}>
                {shownService.name} · <TranslatedText textKey={'yardPricing.fullEdit'} />
              </Link>
            )}
            {shownService?.slug && !single && (
              <Link className="mt-3 inline-block font-semibold underline" href={'/' + locale + '/diensten/' + encodeURIComponent(shownService.slug)}><TranslatedText textKey={'werf.more'} /></Link>
            )}
          </aside>
        </div>
      </section>
    </>
  );
}

export function ServiceTariffTable({ tariffs, cm = 0, ruleId, loading, editProductCode, metres = false }: {
  tariffs: NonNullable<ServiceCatalogService['tariffs']>;
  cm?: number;
  ruleId?: string | null;
  loading: boolean;
  editProductCode?: string;
  metres?: boolean;
}) {
  const { t, locale } = useIntl();
  const matching = tariffs.find((rule) => (!ruleId || rule.id === ruleId) && cm > 0 && cm >= rule.range_from_cm && cm <= rule.range_to_cm);
  if (!tariffs.length) return <p role="status" className="p-4 text-sm"><TranslatedText textKey={loading ? 'adminNew.common.loading' : 'servicePage.pricingUnavailable'} /></p>;

  return (
    <table className="w-full text-sm">
      <thead className="bg-[#102940] text-white">
        <tr>
          <th scope="col" className="px-5 py-1.5 text-left"><TranslatedText textKey={metres ? 'yardPricing.lengthMetres' : 'yardPricing.lengthCm'} /></th>
          <th scope="col" className="px-5 py-1.5 text-right"><TranslatedText textKey={'yardPricing.tariff'} /></th>
        </tr>
      </thead>
      <tbody>
        {tariffs.slice().sort((a, b) => a.range_from_cm - b.range_from_cm).map((rule, index) => (
          <tr key={rule.id ? rule.id + ':' + rule.range_from_cm : index} aria-current={matching === rule ? 'true' : undefined}
            className={cn('border-b border-navy-100 last:border-b-0', matching === rule && 'bg-gold-100 font-bold')}>
            <th scope="row" className={cn('px-5 py-1 text-left', matching === rule ? 'font-bold' : 'font-medium')}>
              {metres ? tariffRangeMetres(rule, locale) : tariffRange(rule)} <TranslatedText textKey={metres ? 'yardPricing.unit' : 'yardPricing.unitCm'} />
            </th>
            <td className="relative px-5 py-1 text-right font-semibold tabular-nums sm:pr-12">
              {rule.is_on_request || rule.price_type === 'manual' ? t('servicePage.onRequest') : rule.display_price}
              {matching === rule && <Check aria-hidden="true" className="absolute right-3 top-1.5 hidden h-4 w-4 rounded-full bg-gold-600 p-0.5 text-white sm:block" />}
              {rule.price_type === 'per_meter' && !rule.display_price.endsWith(' / m') && ' / m'}
              <InlineTariffEditor rule={rule} />
              {editProductCode && rule.id && (
                <Link className="mt-1 block underline" href={`/${locale}/admin/calculator/pricing?` + new URLSearchParams({
                  product: editProductCode, rule_id: rule.id, return_to: typeof window !== 'undefined' ? window.location.pathname + window.location.search + window.location.hash : '',
                })}>
                  <TranslatedText textKey={'yardPricing.fullEdit'} />
                </Link>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
