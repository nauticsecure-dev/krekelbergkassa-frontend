'use client';

import * as React from 'react';
import {
  Banknote,
  Barcode,
  Bolt,
  ChevronDown,
  CreditCard,
  Droplets,
  FileText,
  Filter,
  Hammer,
  MapPin,
  Minus,
  MoreHorizontal,
  Plus,
  Receipt,
  Search,
  Ship,
  Sparkles,
  Star,
  Trash2,
  Users,
  Warehouse,
  X,
} from 'lucide-react';
import { useIntl } from '@/i18n/IntlProvider';
import { AdminPageHeader } from '@/components/admin/AdminShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/cn';

interface Product {
  id: string;
  fromCm: number;
  toCm: number;
  price: number;
}

const PRODUCTS: Product[] = Array.from({ length: 24 }, (_, i) => {
  const from = i * 50;
  const to = from + 49;
  const price = 14 + i * 2 + (i % 3) * 0.7;
  return { id: `p${i}`, fromCm: from, toCm: to, price: Math.round(price * 10) / 10 };
});

const POPULAR_IDS = ['p17', 'p19', 'p15', 'p20'];

const RECENT_LAST = { id: 'p17', price: 29.9 };

export default function KassaPage() {
  const { t } = useIntl();
  const TABS = [
    { id: 'afspuiten', label: t('admin.kassa.afspuiten'), icon: Droplets },
    { id: 'kranen', label: t('admin.kassa.kranen'), icon: Ship },
    { id: 'stalling', label: t('admin.kassa.stalling'), icon: Warehouse },
    { id: 'extra', label: t('adminKassa.tabOther'), icon: MoreHorizontal },
  ];
  const [tab, setTab] = React.useState('afspuiten');
  const [query, setQuery] = React.useState('afspuiten 880');
  const [cart, setCart] = React.useState<{ id: string; qty: number }[]>([
    { id: 'p17', qty: 1 },
  ]);
  const [payment, setPayment] = React.useState<'cash' | 'pin' | 'card' | 'invoice' | 'deposit'>('pin');

  const queryNum = Number(query.replace(/[^0-9]/g, '')) || 0;
  const matchedId = queryNum
    ? PRODUCTS.find((p) => queryNum >= p.fromCm && queryNum <= p.toCm)?.id
    : null;

  const addToCart = (id: string) => {
    setCart((c) => {
      const found = c.find((it) => it.id === id);
      if (found) return c.map((it) => (it.id === id ? { ...it, qty: it.qty + 1 } : it));
      return [...c, { id, qty: 1 }];
    });
  };

  const subtotal = cart.reduce((s, c) => {
    const p = PRODUCTS.find((x) => x.id === c.id);
    return s + (p?.price ?? 0) * c.qty;
  }, 0);
  const vat = subtotal * 0.21;
  const total = subtotal + vat;

  return (
    <>
      <AdminPageHeader
        title={t('admin.kassa.title')}
        subtitle={t('admin.kassa.subtitle')}
        rightSlot={
          <>
            <Button variant="outline" size="sm" leftIcon={<Bolt className="h-4 w-4" />}>
              {t('adminKassa.quickAdd')}
            </Button>
            <Button variant="outline" size="sm" leftIcon={<Barcode className="h-4 w-4" />}>
              {t('admin.kassa.scanBarcode')}
            </Button>
          </>
        }
      >
        {/* Service tabs */}
        <div className="mt-4 flex flex-nowrap gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {TABS.map((tb) => {
            const Icon = tb.icon;
            const active = tab === tb.id;
            return (
              <button
                key={tb.id}
                onClick={() => setTab(tb.id)}
                className={cn(
                  'inline-flex shrink-0 items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition',
                  active
                    ? 'border-marine-600 bg-marine-600 text-white shadow-sm'
                    : 'border-navy-100 bg-white text-navy-700 hover:bg-sand-100'
                )}
              >
                <Icon className="h-4 w-4" />
                {tb.label}
              </button>
            );
          })}
        </div>
      </AdminPageHeader>

      <div className="px-4 py-5 sm:px-6">
        <div className="grid gap-6 xl:grid-cols-[1fr_22rem] 2xl:grid-cols-[1fr_25rem]">
          {/* LEFT: products */}
          <div className="min-w-0">
            {/* Search row */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="input-base pl-9 pr-9"
                  placeholder={t('admin.kassa.searchBoat')}
                />
                {query ? (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-navy-400 hover:bg-sand-100 hover:text-navy-700"
                    aria-label="clear"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </div>
              <Button variant="outline" size="md" leftIcon={<Filter className="h-4 w-4" />}>
                {t('admin.common.filter')}
              </Button>
            </div>

            {/* Results heading */}
            <div className="mt-5 flex items-end justify-between">
              <h2 className="text-lg font-semibold text-navy-900">
                {t('adminKassa.resultsTitleN', {
                  category: t('admin.kassa.afspuiten'),
                  n: matchedId ? '1' : '0',
                })}
              </h2>
              <button className="inline-flex items-center gap-1 rounded-md border border-navy-100 px-2.5 py-1.5 text-xs font-medium text-navy-700 hover:bg-sand-100">
                {t('adminKassa.sortBy')}
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Grid of products */}
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {PRODUCTS.slice(0, 20).map((p) => {
                const isMatch = p.id === matchedId;
                const inCart = cart.find((c) => c.id === p.id);
                return (
                  <button
                    key={p.id}
                    onClick={() => addToCart(p.id)}
                    className={cn(
                      'group relative flex flex-col items-start rounded-2xl border bg-white p-3.5 text-left transition hover:border-navy-300',
                      isMatch
                        ? 'border-marine-600 bg-marine-50/60 ring-2 ring-marine-200'
                        : 'border-navy-100'
                    )}
                  >
                    <div className="flex w-full items-center justify-between">
                      <div className="text-sm font-semibold text-navy-900">
                        {p.fromCm} – {p.toCm} cm
                      </div>
                      <Ship className="h-4 w-4 text-navy-300 group-hover:text-navy-500" />
                    </div>
                    <div className="mt-3 flex items-baseline gap-1">
                      <span className="text-lg font-semibold text-navy-900">
                        € {p.price.toFixed(2).replace('.', ',')}
                      </span>
                    </div>
                    {/* Subtle bottom border for selection feel */}
                    <span
                      aria-hidden
                      className={cn(
                        'absolute inset-x-3 bottom-0 h-[3px] rounded-full',
                        isMatch ? 'bg-marine-600' : 'bg-marine-200/40 group-hover:bg-marine-300'
                      )}
                    />
                    {inCart ? (
                      <span className="absolute right-2.5 top-2.5 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-navy-900 px-1.5 text-[10px] font-bold text-white">
                        {inCart.qty}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>

            {/* Meest gekozen */}
            <div className="mt-7">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-navy-900">
                  {t('adminKassa.mostChosen')}
                </h3>
                <Link className="text-xs font-medium text-marine-700 hover:underline" href="#">
                  {t('adminKassa.showMore')}
                </Link>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {POPULAR_IDS.map((id) => {
                  const p = PRODUCTS.find((x) => x.id === id)!;
                  return (
                    <button
                      key={id}
                      onClick={() => addToCart(id)}
                      className="flex items-center gap-3 rounded-xl border border-navy-100 bg-white px-3 py-2.5 text-left transition hover:border-navy-300"
                    >
                      <span className="flex h-8 w-8 items-center justify-center rounded-md bg-gold-50 text-gold-600">
                        <Star className="h-4 w-4 fill-current" />
                      </span>
                      <div className="min-w-0">
                        <div className="truncate text-xs font-semibold text-navy-900">
                          {p.fromCm} – {p.toCm} cm
                        </div>
                        <div className="truncate text-[11px] text-navy-500">
                          € {p.price.toFixed(2).replace('.', ',')}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Stats strip */}
            <div className="mt-7 grid gap-3 rounded-2xl border border-navy-100 bg-white p-3 sm:grid-cols-4">
              <BottomStat
                icon={Star}
                label={t('adminKassa.lastSale')}
                primary={`Afspuiten ${PRODUCTS.find((p) => p.id === RECENT_LAST.id)?.fromCm}-${PRODUCTS.find((p) => p.id === RECENT_LAST.id)?.toCm} cm`}
                secondary={`€ ${RECENT_LAST.price.toFixed(2).replace('.', ',')}`}
                tone="gold"
              />
              <BottomStat
                icon={Banknote}
                label={t('adminKassa.totalToday')}
                primary="€ 1.245,60"
                secondary="+12% vs gisteren"
                tone="success"
              />
              <BottomStat
                icon={Receipt}
                label={t('adminKassa.totalTx')}
                primary="23"
                secondary={t('adminKassa.completed')}
                tone="navy"
              />
              <BottomStat
                icon={Users}
                label={t('adminKassa.knownCustomer')}
                primary={t('adminKassa.chooseExisting')}
                secondary={t('adminKassa.searchCustomer')}
                tone="marine"
                arrow
              />
            </div>
          </div>

          {/* RIGHT: Cart panel */}
          <aside className="xl:sticky xl:top-24 xl:max-h-[calc(100vh-7rem)] xl:overflow-hidden">
            <Card className="flex max-h-full flex-col overflow-hidden p-0">
              <div className="flex items-center justify-between border-b border-navy-100 px-5 py-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-navy-900">
                  {t('admin.kassa.cart')}
                  <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-marine-600 px-1.5 text-[11px] font-bold text-white">
                    {cart.length}
                  </span>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">
                {/* Cart items */}
                <div className="space-y-2 p-4">
                  {cart.length === 0 ? (
                    <div className="rounded-lg bg-sand-50 p-6 text-center text-sm text-navy-400">
                      {t('admin.kassa.cartEmpty')}
                    </div>
                  ) : (
                    cart.map((c) => {
                      const p = PRODUCTS.find((x) => x.id === c.id)!;
                      return (
                        <div
                          key={c.id}
                          className="flex items-center gap-3 rounded-xl border border-navy-100 p-3"
                        >
                          <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-cover bg-center" style={{ backgroundImage: 'url(/img/krek/verkoop-schip.webp)' }} />
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-semibold text-navy-900">
                              {t('admin.kassa.afspuiten')} {p.fromCm} – {p.toCm} cm
                            </div>
                            <div className="text-[11px] text-navy-400">
                              {t('adminKassa.boatN', { value: String(queryNum || 880) })}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() =>
                                setCart((cur) =>
                                  cur
                                    .map((it) =>
                                      it.id === c.id ? { ...it, qty: Math.max(0, it.qty - 1) } : it
                                    )
                                    .filter((it) => it.qty > 0)
                                )
                              }
                              className="rounded-md border border-navy-100 p-1 text-navy-600 hover:bg-sand-100"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <span className="min-w-[20px] text-center text-sm font-semibold">
                              {c.qty}
                            </span>
                            <button
                              onClick={() => addToCart(c.id)}
                              className="rounded-md border border-navy-100 p-1 text-navy-600 hover:bg-sand-100"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <div className="w-16 text-right text-sm font-semibold text-navy-900">
                            € {(p.price * c.qty).toFixed(2).replace('.', ',')}
                          </div>
                          <button
                            onClick={() => setCart((cur) => cur.filter((it) => it.id !== c.id))}
                            className="text-navy-400 hover:text-rose-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Totals */}
                <div className="border-t border-navy-100 px-5 py-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-navy-500">{t('adminKassa.totalExcl')}</span>
                    <span className="font-medium text-navy-900">
                      € {subtotal.toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-center justify-between text-sm">
                    <span className="text-navy-500">{t('admin.kassa.vat', { rate: '21' })}</span>
                    <span className="font-medium text-navy-900">
                      € {vat.toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-navy-100 pt-3">
                    <span className="text-base font-semibold text-navy-900">
                      {t('admin.kassa.total')}
                    </span>
                    <span className="text-xl font-semibold text-navy-900">
                      € {total.toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button className="flex items-center justify-center gap-1.5 rounded-md border border-navy-100 px-2.5 py-1.5 text-xs font-medium text-navy-700 hover:bg-sand-100">
                      <FileText className="h-3.5 w-3.5" />
                      {t('adminKassa.addNote')}
                    </button>
                    <button
                      onClick={() => setCart([])}
                      className="flex items-center justify-center gap-1.5 rounded-md border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      {t('admin.kassa.clear')}
                    </button>
                  </div>
                </div>

                {/* Customer */}
                <div className="border-t border-navy-100 px-5 py-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-widest text-navy-500">
                      {t('admin.kassa.customer')}
                    </span>
                    <span className="text-[10px] text-navy-400">
                      {t('adminKassa.searchByNameEmailPhone')}
                    </span>
                  </div>
                  <button className="mt-2 flex w-full items-center justify-between rounded-lg border border-dashed border-navy-200 bg-sand-50/60 px-3 py-2.5 text-sm text-navy-700 hover:bg-sand-100">
                    <span className="inline-flex items-center gap-2">
                      <Users className="h-3.5 w-3.5" />
                      {t('adminKassa.addNewCustomer')}
                    </span>
                    <Plus className="h-3.5 w-3.5" />
                  </button>

                  <div className="mt-3 space-y-2 text-xs">
                    <MicroField label={t('adminKassa.nameRequired')} placeholder="Bijv. Jansen" />
                    <MicroField label={t('adminKassa.emailRequired')} placeholder="naam@email.nl" />
                    <MicroField label={t('adminKassa.phoneOptional')} placeholder="06 12345678" />
                    <MicroField
                      label={t('adminKassa.location')}
                      placeholder={t('adminKassa.searchAddress')}
                    />
                  </div>

                  <div className="mt-3 relative h-28 overflow-hidden rounded-lg bg-gradient-to-br from-marine-50 to-sand-100">
                    <div className="absolute inset-0 opacity-30 mix-blend-overlay">
                      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full">
                        <defs>
                          <pattern id="kassa-dot" width="6" height="6" patternUnits="userSpaceOnUse">
                            <circle cx="1" cy="1" r="0.6" fill="#5a87a3" />
                          </pattern>
                        </defs>
                        <rect width="100" height="100" fill="url(#kassa-dot)" />
                      </svg>
                    </div>
                    <div className="absolute left-1/2 top-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-navy-900 shadow-card">
                      <MapPin className="h-4 w-4" />
                    </div>
                    <button className="absolute bottom-2 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-md border border-navy-100 bg-white/95 px-2.5 py-1 text-[11px] font-medium text-navy-700 backdrop-blur hover:bg-white">
                      <MapPin className="h-3 w-3" />
                      {t('adminKassa.useLocation')}
                    </button>
                  </div>
                  <p className="mt-2 text-[11px] text-navy-400">
                    <span className="text-emerald-600">✓</span> {t('adminKassa.accountAutoCreated')}
                  </p>
                </div>

                {/* Payment methods */}
                <div className="border-t border-navy-100 px-5 py-4">
                  <span className="text-xs font-semibold uppercase tracking-widest text-navy-500">
                    {t('admin.kassa.paymentMethod')}
                  </span>
                  <div className="mt-3 space-y-2">
                    <PayRow icon={Banknote} active={payment === 'cash'} onClick={() => setPayment('cash')} label={t('admin.kassa.cash')} tone="green" />
                    <PayRow icon={CreditCard} active={payment === 'pin'} onClick={() => setPayment('pin')} label={t('admin.kassa.pin')} tone="blue" />
                    <PayRow icon={CreditCard} active={payment === 'card'} onClick={() => setPayment('card')} label={t('adminKassa.creditcard')} tone="purple" />
                    <PayRow icon={FileText} active={payment === 'invoice'} onClick={() => setPayment('invoice')} label={t('admin.kassa.invoice')} tone="orange" />
                    <PayRow icon={Sparkles} active={payment === 'deposit'} onClick={() => setPayment('deposit')} label={t('adminKassa.deposit')} tone="violet" />
                  </div>
                </div>
              </div>

              {/* Sticky checkout */}
              <div className="border-t border-navy-100 bg-white p-4">
                <button className="flex w-full items-center justify-between gap-2 rounded-xl bg-marine-600 px-5 py-3.5 text-white shadow-card hover:bg-marine-700">
                  <span className="inline-flex items-center gap-2 text-sm font-semibold">
                    <Receipt className="h-4 w-4" />
                    {t('admin.kassa.checkout')}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-base font-semibold">
                    € {total.toFixed(2).replace('.', ',')}
                    <span className="opacity-80">→</span>
                  </span>
                </button>
              </div>
            </Card>
          </aside>
        </div>
      </div>
    </>
  );
}

function BottomStat({
  icon: Icon,
  label,
  primary,
  secondary,
  tone,
  arrow,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  primary: string;
  secondary: string;
  tone: 'gold' | 'success' | 'navy' | 'marine';
  arrow?: boolean;
}) {
  const map: Record<string, string> = {
    gold: 'bg-gold-50 text-gold-600',
    success: 'bg-emerald-50 text-emerald-600',
    navy: 'bg-navy-50 text-navy-700',
    marine: 'bg-marine-50 text-marine-700',
  };
  return (
    <div className="flex items-start gap-3 rounded-xl px-3 py-2.5">
      <span
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
          map[tone]
        )}
      >
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[11px] uppercase tracking-wide text-navy-400">
          {label}
        </div>
        <div className="truncate text-sm font-semibold text-navy-900">
          {primary}
        </div>
        <div className="truncate text-[11px] text-navy-500">{secondary}</div>
      </div>
      {arrow ? <span className="text-navy-400">›</span> : null}
    </div>
  );
}

function MicroField({
  label,
  placeholder,
}: {
  label: string;
  placeholder: string;
}) {
  return (
    <label className="block">
      <span className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wide text-navy-500">
        {label}
      </span>
      <input className="input-base h-8 text-xs" placeholder={placeholder} />
    </label>
  );
}

function PayRow({
  icon: Icon,
  label,
  active,
  onClick,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active: boolean;
  onClick: () => void;
  tone: 'green' | 'blue' | 'purple' | 'orange' | 'violet';
}) {
  const map: Record<string, string> = {
    green: 'bg-emerald-500',
    blue: 'bg-marine-600',
    purple: 'bg-fuchsia-500',
    orange: 'bg-amber-500',
    violet: 'bg-violet-500',
  };
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition',
        active
          ? 'border-navy-900 bg-white shadow-sm'
          : 'border-navy-100 bg-white hover:border-navy-300'
      )}
    >
      <span
        className={cn(
          'flex h-9 w-12 items-center justify-center rounded-md text-white',
          map[tone]
        )}
      >
        <Icon className="h-4 w-4" />
      </span>
      <span className="flex-1 text-sm font-semibold text-navy-900">{label}</span>
      <span
        className={cn(
          'inline-flex h-4 w-4 items-center justify-center rounded-full border',
          active ? 'border-navy-900 bg-navy-900 text-white' : 'border-navy-200'
        )}
      >
        {active ? '✓' : ''}
      </span>
    </button>
  );
}

// Tiny Link shim — using anchor to avoid extra import for one-off
function Link({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <a href={href} className={className}>
      {children}
    </a>
  );
}
