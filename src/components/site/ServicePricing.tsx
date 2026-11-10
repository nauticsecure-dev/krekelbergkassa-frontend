'use client';
import { TranslatedText } from '@/components/cms/TranslatedText';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, CalendarDays, Check, Droplets, Info, Ship, Warehouse } from 'lucide-react';
import { EditableText } from '@/components/cms/EditableText';
import { useCms } from '@/components/cms/CmsProvider';
import { useIntl } from '@/i18n/IntlProvider';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/cn';
import { formatCurrency, intlLocale } from '@/lib/format';
import { useQuery } from '@/lib/hooks/useAsync';
import { portalService, serviceCatalogService, type BookingQuote, type ServiceCatalogService } from '@/lib/services';

export const YARD_SERVICES = [
  { code: 'kranen', product: 'KRANEN', icon: Ship },
  { code: 'afspuiten', product: 'AFSPUITEN', icon: Droplets },
  { code: 'weekje-op-wal', product: 'WEEK-OP-WAL', icon: CalendarDays },
  { code: 'winterstalling', product: 'STALL-WINTER', icon: Warehouse },
] as const;

export type YardService = typeof YARD_SERVICES[number]['code'];

export function yardService(code: string | undefined) {
  return YARD_SERVICES.find((service) => service.code === code)?.code;
}

const tile = 'flex min-h-12 min-w-0 items-center justify-center gap-2 rounded-xl border px-2 py-3 text-center text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500';

export function ServicePricing({
  services, loading, active, onActiveChange, single = false, cmsPage,
}: {
  services: ServiceCatalogService[];
  loading: boolean;
  active: YardService;
  onActiveChange?: (service: YardService) => void;
  single?: boolean;
  cmsPage?: string;
}) {
  const { t, locale } = useIntl();
  const router = useRouter();
  const { user, isPortalSession, isDemo } = useAuth();
  const { isCmsEditing } = useCms();
  const customerId = isPortalSession && !isDemo ? user?.id : undefined;
  const boats = useQuery([customerId], async () => customerId ? { customerId, items: await portalService.boats() } : null);
  const ownedBoats = boats.data?.customerId === customerId ? boats.data?.items ?? [] : [];
  const [length, setLength] = React.useState('');
  const [boatId, setBoatId] = React.useState('');
  const [extra, setExtra] = React.useState<YardService | null>(null);
  const [tab, setTab] = React.useState<YardService>(active);
  const [estimate, setEstimate] = React.useState<{ key: string; quote: BookingQuote | null }>();
  const [openingBooking, setOpeningBooking] = React.useState(false);
  const [bookingErrorKey, setBookingErrorKey] = React.useState('');
  const inputId = React.useId();
  const tabRefs = React.useRef<(HTMLButtonElement | null)[]>([]);
  const currency = (cents: number) => formatCurrency(cents / 100, intlLocale(locale));
  const catalog = (code: YardService) => services.find((service) =>
    service.code === YARD_SERVICES.find((item) => item.code === code)?.product,
  );
  const label = (code: YardService) => catalog(code)?.name ?? t('yardPricing.' + code);
  const enabled = (code: YardService) => !!catalog(code);
  const companion = active === 'kranen' ? 'afspuiten' : active === 'afspuiten' ? 'kranen' : null;
  const canCombine = !single && companion && catalog(active)?.visibility?.booking && catalog(companion)?.visibility?.booking;
  const codes = canCombine && extra === companion ? [active, extra] : [active];
  const text = length.trim();
  const cm = /^[1-9]\d{0,3}$/.test(text) ? Number(text) : 0;
  const key = cm > 0 && codes.every(enabled) ? cm + ':' + codes.join(',') : '';
  const current = key && estimate?.key === key ? estimate : undefined;
  const quote = current?.quote;
  const priced = quote && !quote.requires_manual_price && !quote.requires_on_request;
  const bookable = priced && quote.total_incl_vat > 0
    && codes.every((code) => (code === 'kranen' || code === 'afspuiten') && catalog(code)?.visibility?.booking);
  const shownService = catalog(tab);
  const tabs = single ? YARD_SERVICES.filter(({ code }) => code === active) : YARD_SERVICES;

  React.useEffect(() => {
    setTab(active);
    setExtra(null);
  }, [active]);

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
    const [lengthCm, serviceCodes] = key.split(':');
    const timer = window.setTimeout(async () => {
      try {
        const result = await serviceCatalogService.preview(Number(lengthCm), serviceCodes.split(','));
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
    setOpeningBooking(true);
    setBookingErrorKey('');
    try {
      const { token } = await serviceCatalogService.createBookingSelection(cm, codes);
      // Only the opaque selection token travels in the URL.
      if (boatId) window.sessionStorage.setItem('booking-boat:' + token, boatId);
      router.push('/' + locale + '/kraanafspraak?selection=' + encodeURIComponent(token));
    } catch {
      setBookingErrorKey(key);
    } finally {
      setOpeningBooking(false);
    }
  };
  const ctaClass = 'mt-auto flex items-center justify-center gap-2 rounded-lg bg-gold-500 px-3 py-3 text-center text-sm font-bold text-navy-950 hover:bg-gold-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-60';
  const pickedRule = quote?.services.find((line) => line.service_code === tab)?.rule_id;
  const quotedRule = catalog(active)?.tariffs?.find((rule) => rule.id === quote?.services[0]?.rule_id);
  return (
    <>
      <section id={single ? undefined : 'prijsberekening'} className={cn('scroll-mt-24', !single && 'container-wide relative z-10 sm:-mt-4')}>
        <div className="grid gap-6 rounded-2xl border border-navy-100 bg-gradient-to-b from-white to-sand-50 p-5 shadow-elev sm:p-7 lg:grid-cols-[1.18fr_1fr_.9fr]">
          <div>
            <p className="mb-1 text-sm font-bold uppercase tracking-wider text-gold-800">{copy('eyebrow')}</p>
            <h2 className="heading-display text-3xl sm:text-4xl">{copy('title')}</h2>
            <p className="mt-3 text-sm leading-relaxed text-navy-700">{copy('intro')}</p>
            <ul className="mt-5 space-y-2 text-sm text-navy-700">
              {(['live', 'direct', 'request'] as const).map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <Check aria-hidden="true" className="h-5 w-5 shrink-0 text-gold-800" /> {copy(item)}
                </li>
              ))}
            </ul>
          </div>
          <div className="min-w-0 space-y-4">
            <fieldset>
              <legend className="mb-2 text-sm font-bold">{copy('select')}</legend>
              <div className={cn('grid gap-2', !single && 'grid-cols-2')}>
                {tabs.map(({ code, icon: Icon }) => (
                  <button key={code} type="button" aria-pressed={codes.includes(code)}
                    disabled={single || !enabled(code)} onClick={() => selectService(code)}
                    className={cn(tile, 'flex-col', codes.includes(code) ? 'border-gold-600 bg-gold-50 text-navy-950' : 'border-navy-200 bg-white hover:border-gold-600', !enabled(code) && 'opacity-60')}>
                    <Icon aria-hidden="true" className="h-5 w-5" />{label(code)}
                  </button>
                ))}
              </div>
            </fieldset>
            {ownedBoats.length > 0 && (
              <label className="block text-sm font-semibold">
                <TranslatedText textKey={'login.chooseBoat'} />
                <select value={boatId} className="mt-1 block w-full rounded-lg border border-navy-200 bg-white p-2"
                  onChange={(event) => {
                    const boat = ownedBoats.find((item) => item.id === event.target.value);
                    setBoatId(event.target.value);
                    setLength(boat?.length_cm ? String(boat.length_cm) : '');
                  }}>
                  <option value="">{t('login.newBoat')}</option>
                  {ownedBoats.map((boat) => <option key={boat.id} value={boat.id}>{boat.name}</option>)}
                </select>
              </label>
            )}
            <div>
              <label htmlFor={inputId} className="mb-2 block text-sm font-bold"><TranslatedText textKey={'yardPricing.lengthCm'} /></label>
              <div className="flex items-center rounded-lg border border-navy-200 bg-white focus-within:border-gold-600">
                <input id={inputId} value={length} inputMode="numeric" placeholder="820"
                  aria-invalid={!!text && !cm} aria-describedby={text && !cm ? inputId + '-error' : undefined}
                  onChange={(event) => {
                    setBoatId('');
                    setLength(event.target.value);
                  }}
                  className="min-w-0 flex-1 rounded-lg bg-transparent px-3 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-600" />
                <span className="px-3 text-xs text-navy-700">cm</span>
              </div>
              {cm > 0 && <p className="mt-1 text-sm text-navy-700">= {new Intl.NumberFormat(intlLocale(locale), { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(cm / 100)} <TranslatedText textKey={'yardPricing.unit'} /></p>}
              {text && !cm && <p id={inputId + '-error'} className="mt-1 text-sm text-red-700"><TranslatedText textKey={'yardPricing.invalidLength'} /></p>}
            </div>
          </div>
          <div className="flex min-w-0 flex-col rounded-xl bg-navy-950 p-5 text-white">
            <h3 className="text-sm font-bold uppercase tracking-wider">{copy('estimate')}</h3>
            <div aria-live="polite" aria-atomic="true" className="mt-2">
              <p className="heading-display break-words text-3xl text-white sm:text-4xl">
                {priced ? currency(quote.total_incl_vat) : cm ? (loading || key && !current ? '…' : t('servicePage.onRequest')) : '—'}
              </p>
              <p className="mt-2 text-sm text-sand-100">
                {codes.map(label).join(' + ')}
                {quotedRule && ` · ${quotedRule.range_from_cm}–${quotedRule.range_to_cm} cm`}
              </p>
              {current && !quote && <p className="mt-2 text-sm text-sand-100"><TranslatedText textKey={'servicePage.pricingUnavailable'} /></p>}
            </div>
            {quote && quote.services.length > 0 && (
              <div className="my-3 border-y border-white/25 py-3 text-sm">
                <p className="font-semibold">{copy('breakdown')}</p>
                <dl className="mt-2 space-y-2">
                  {quote.services.map((line) => (
                    <div key={line.service_code} className="flex justify-between gap-2">
                      <dt>{label(yardService(line.service_code) ?? active)}</dt>
                      <dd className="text-right">
                        {line.is_on_request || line.is_manual ? t('servicePage.onRequest') : line.included_by ? t('yardPricing.included') : currency(line.price_incl_vat)}
                        {!line.is_on_request && !line.is_manual && !line.included_by && line.vat_rate !== undefined && (
                          <span className="block text-xs text-sand-100"><TranslatedText textKey={'servicePage.inclVat'} vars={{ rate: line.vat_rate }} /></span>
                        )}
                      </dd>
                    </div>
                  ))}
                  {priced && quote.total_vat !== undefined && (
                    <div className="flex justify-between gap-2"><dt><TranslatedText textKey={'yardPricing.vat'} /></dt><dd>{currency(quote.total_vat)}</dd></div>
                  )}
                </dl>
              </div>
            )}
            <p className="mb-4 mt-3 text-xs text-sand-100">{copy('conditions')}</p>
            {key && bookingErrorKey === key && <p role="alert" className="mb-2 text-sm"><TranslatedText textKey={'servicePage.pricingUnavailable'} /></p>}
            {bookable ? (
              <button type="button" className={ctaClass} disabled={openingBooking} onClick={openBooking}>
                <TranslatedText textKey={openingBooking ? 'adminNew.common.loading' : 'nav.bookCrane'} /> <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0" />
              </button>
            ) : (
              <Link href={cta} className={ctaClass}>
                <TranslatedText textKey={active === 'winterstalling' ? 'yardPricing.requestStorage' : 'yardPricing.requestQuote'} /> <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0" />
              </Link>
            )}
          </div>
        </div>
      </section>

      <section className={cn('py-9', !single && 'container-wide')} aria-labelledby={inputId + '-tariffs'}>
        <div className="mb-5 text-center">
          <p className="mb-1 text-sm font-bold uppercase tracking-wider text-gold-800"><TranslatedText textKey={'servicePage.pricesBadge'} /></p>
          <h2 id={inputId + '-tariffs'} className="heading-display text-3xl">{copy('tariffs')}</h2>
          <p className="mt-1 text-sm text-navy-700">{copy('tariffsIntro')}</p>
          <div className="mx-auto mt-3 h-0.5 w-14 bg-gold-600" />
        </div>
        {!single && (
          <div role="tablist" aria-labelledby={inputId + '-tariffs'} className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {tabs.map(({ code, icon: Icon }, index) => (
              <button key={code} id={'prijzen-' + code} ref={(element) => { tabRefs.current[index] = element; }}
                type="button" role="tab" aria-selected={tab === code} aria-controls={inputId + '-table'}
                tabIndex={tab === code ? 0 : -1} onClick={() => changeTab(code)}
                onKeyDown={(event) => {
                  const next = { ArrowRight: (index + 1) % tabs.length, ArrowLeft: (index + tabs.length - 1) % tabs.length, Home: 0, End: tabs.length - 1 }[event.key];
                  if (next === undefined) return;
                  event.preventDefault();
                  changeTab(tabs[next].code);
                  tabRefs.current[next]?.focus();
                }}
                className={cn(tile, 'scroll-mt-24', tab === code ? 'border-navy-950 bg-navy-950 text-sand-100' : 'border-navy-100 bg-white hover:border-gold-600')}>
                <Icon aria-hidden="true" className="h-5 w-5 shrink-0" />{label(code)}
              </button>
            ))}
          </div>
        )}
        <div className="grid items-start gap-4 lg:grid-cols-[1.75fr_1fr]">
          <div id={inputId + '-table'} role={single ? undefined : 'tabpanel'} aria-labelledby={single ? undefined : 'prijzen-' + tab} tabIndex={single ? undefined : 0}
            className="min-w-0 overflow-hidden rounded-xl border border-navy-100 bg-white shadow-card">
            <ServiceTariffTable tariffs={shownService?.tariffs ?? []} cm={cm} ruleId={pickedRule} loading={loading}
              editProductCode={isCmsEditing && user?.permissions?.includes('pricing.update') ? shownService?.code : undefined} />
          </div>
          <aside className="rounded-xl border border-navy-100 bg-sand-50 p-5 text-sm text-navy-800 shadow-card">
            <h3 className="mb-2 flex items-center gap-2 font-bold"><Info aria-hidden="true" className="h-5 w-5 text-gold-800" />{copy('info')}</h3>
            <p>{shownService?.description ?? t('yardPricing.conditions')}</p>
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

export function ServiceTariffTable({ tariffs, cm = 0, ruleId, loading, editProductCode }: {
  tariffs: NonNullable<ServiceCatalogService['tariffs']>;
  cm?: number;
  ruleId?: string | null;
  loading: boolean;
  editProductCode?: string;
}) {
  const { t, locale } = useIntl();
  const matching = ruleId ? tariffs.find((rule) => rule.id === ruleId) : tariffs.find((rule) => cm > 0 && cm >= rule.range_from_cm && cm <= rule.range_to_cm);
  if (!tariffs.length) return <p role="status" className="p-4 text-sm"><TranslatedText textKey={loading ? 'adminNew.common.loading' : 'servicePage.pricingUnavailable'} /></p>;

  return (
    <table className="w-full text-sm">
      <thead className="bg-navy-950 text-white">
        <tr>
          <th scope="col" className="px-4 py-2 text-left"><TranslatedText textKey={'yardPricing.lengthCm'} /></th>
          <th scope="col" className="px-4 py-2 text-right"><TranslatedText textKey={'yardPricing.tariff'} /></th>
        </tr>
      </thead>
      <tbody>
        {tariffs.slice().sort((a, b) => a.range_from_cm - b.range_from_cm).map((rule, index) => (
          <tr key={rule.id ?? index} aria-current={matching === rule ? 'true' : undefined}
            className={cn('border-b border-navy-100 last:border-b-0', matching === rule && 'bg-gold-100 font-bold')}>
            <th scope="row" className="px-4 py-1.5 text-left font-medium">{rule.range_from_cm}–{rule.range_to_cm} cm</th>
            <td className="px-4 py-1.5 text-right font-semibold">{rule.is_on_request || rule.price_type === 'manual' ? t('servicePage.onRequest') : rule.display_price}
              {rule.price_type === 'per_meter' && ' / ' + t('yardPricing.unit')}
              {editProductCode && rule.id && (
                <Link className="mt-1 block underline" href={`/${locale}/admin/calculator/pricing?` + new URLSearchParams({
                  product: editProductCode, rule_id: rule.id,
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
