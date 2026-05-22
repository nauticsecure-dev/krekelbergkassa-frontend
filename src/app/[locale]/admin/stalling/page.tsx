'use client';

import * as React from 'react';
import {
  AlertCircle,
  ArrowRight,
  Calendar,
  ChevronDown,
  Coins,
  Download,
  FilePlus2,
  Filter,
  MapPin,
  MoreHorizontal,
  Plus,
  Search,
  Ship,
  TrendingUp,
  Users,
} from 'lucide-react';
import { useIntl } from '@/i18n/IntlProvider';
import { AdminPageHeader } from '@/components/admin/AdminShell';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';

interface Row {
  id: number;
  boat: string;
  imgColor: string;
  type: 'Motor' | 'Zeilboot' | 'Speed';
  length: string;
  owner: string;
  ownerEmail: string;
  location: string;
  category: 'Winter' | 'Zomer' | 'Jaar';
  start: string;
  end: string;
  amount: string;
  status: 'Betaald' | 'Open' | 'Verloopt' | 'Achterstallig';
}

const ROWS: Row[] = [
  { id: 1, boat: 'Sea Breeze', imgColor: 'from-marine-400 to-marine-700', type: 'Motor', length: '8.80m', owner: 'Jan Jansen', ownerEmail: 'jan@example.com', location: 'B-12', category: 'Winter', start: '01 nov', end: '30 apr', amount: '€ 650,00', status: 'Betaald' },
  { id: 2, boat: 'Mistral', imgColor: 'from-amber-400 to-rose-500', type: 'Zeilboot', length: '11.4m', owner: 'Maria de Vries', ownerEmail: 'maria@vries.nl', location: 'A-04', category: 'Winter', start: '01 nov', end: '30 apr', amount: '€ 820,00', status: 'Open' },
  { id: 3, boat: 'Vento', imgColor: 'from-emerald-400 to-marine-600', type: 'Speed', length: '6.10m', owner: 'Henk Bakker', ownerEmail: 'h.bakker@email.nl', location: 'C-22', category: 'Jaar', start: '15 mrt', end: '14 mrt', amount: '€ 1.245,00', status: 'Verloopt' },
  { id: 4, boat: 'Atalanta', imgColor: 'from-purple-400 to-marine-700', type: 'Zeilboot', length: '12.6m', owner: 'Cornelia Smit', ownerEmail: 'c.smit@example.nl', location: 'A-09', category: 'Winter', start: '01 nov', end: '30 apr', amount: '€ 950,00', status: 'Achterstallig' },
  { id: 5, boat: 'Aurora', imgColor: 'from-pink-400 to-fuchsia-600', type: 'Motor', length: '9.20m', owner: 'Pieter de Lange', ownerEmail: 'p.delange@email.nl', location: 'B-07', category: 'Winter', start: '01 nov', end: '30 apr', amount: '€ 720,00', status: 'Betaald' },
  { id: 6, boat: 'Triton', imgColor: 'from-sky-400 to-navy-700', type: 'Zeilboot', length: '10.1m', owner: 'Roel Visser', ownerEmail: 'roel.v@example.nl', location: 'A-11', category: 'Winter', start: '01 nov', end: '30 apr', amount: '€ 760,00', status: 'Betaald' },
  { id: 7, boat: 'Najade', imgColor: 'from-teal-400 to-emerald-700', type: 'Motor', length: '8.40m', owner: 'Sandra Hofman', ownerEmail: 's.hofman@email.nl', location: 'C-15', category: 'Zomer', start: '01 mei', end: '31 okt', amount: '€ 480,00', status: 'Betaald' },
  { id: 8, boat: 'Calypso', imgColor: 'from-orange-400 to-rose-600', type: 'Zeilboot', length: '11.0m', owner: 'Jeroen Klaassen', ownerEmail: 'j.klaassen@email.nl', location: 'A-02', category: 'Winter', start: '01 nov', end: '30 apr', amount: '€ 800,00', status: 'Open' },
];

const STATUS_TONES: Record<Row['status'], 'success' | 'warning' | 'danger' | 'navy'> = {
  Betaald: 'success',
  Open: 'navy',
  Verloopt: 'warning',
  Achterstallig: 'danger',
};

export default function StallingPage() {
  const { t } = useIntl();
  const [tab, setTab] = React.useState('all');
  const [selected, setSelected] = React.useState<number | null>(1);

  const TABS = [
    { id: 'all', label: t('admin.stalling.allBoats'), count: 198 },
    { id: 'winter', label: t('admin.stalling.winter'), count: 121 },
    { id: 'summer', label: t('admin.stalling.summer'), count: 32 },
    { id: 'expiring', label: t('admin.stalling.expiring'), count: 21 },
  ];

  const STATS: { label: string; value: string; delta: string; tone: 'navy' | 'success' | 'warning' | 'danger' | 'gold'; icon: React.ComponentType<{ className?: string }> }[] = [
    { label: t('admin.stalling.stats.total'), value: '198', delta: '+12', tone: 'navy', icon: Ship },
    { label: t('admin.stalling.stats.active'), value: '153', delta: '78%', tone: 'success', icon: TrendingUp },
    { label: t('admin.stalling.stats.expiring'), value: '21', delta: '+3', tone: 'warning', icon: AlertCircle },
    { label: t('admin.stalling.stats.overdue'), value: '24', delta: '€ 2.450', tone: 'danger', icon: Coins },
    { label: t('admin.stalling.stats.revenue'), value: '€ 12.450', delta: '+8%', tone: 'gold', icon: TrendingUp },
  ];

  const filtered = ROWS.filter((r) => {
    if (tab === 'all') return true;
    if (tab === 'winter') return r.category === 'Winter';
    if (tab === 'summer') return r.category === 'Zomer';
    if (tab === 'expiring') return r.status === 'Verloopt' || r.status === 'Achterstallig';
    return true;
  });

  const detail = ROWS.find((r) => r.id === selected) ?? ROWS[0];

  return (
    <>
      <AdminPageHeader
        title={t('admin.stalling.title')}
        subtitle={t('admin.stalling.subtitle')}
        rightSlot={
          <>
            <Button variant="outline" size="sm" leftIcon={<Download className="h-4 w-4" />}>
              {t('admin.common.export')}
            </Button>
            <Button variant="primary" size="sm" leftIcon={<Plus className="h-4 w-4" />}>
              {t('admin.stalling.newContract')}
            </Button>
          </>
        }
      >
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {STATS.map((s) => (
            <StatCard key={s.label} {...s} />
          ))}
        </div>
      </AdminPageHeader>

      <div className="px-4 py-5 sm:px-6">
        {/* Tabs */}
        <div className="flex flex-nowrap items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
          {TABS.map((tb) => {
            const active = tab === tb.id;
            return (
              <button
                key={tb.id}
                onClick={() => setTab(tb.id)}
                className={cn(
                  'inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition',
                  active
                    ? 'border-navy-900 bg-navy-900 text-white'
                    : 'border-navy-100 bg-white text-navy-700 hover:bg-sand-100'
                )}
              >
                {tb.label}
                <span
                  className={cn(
                    'rounded-full px-1.5 text-[10px]',
                    active ? 'bg-white/15' : 'bg-sand-100 text-navy-500'
                  )}
                >
                  {tb.count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex flex-col gap-3 lg:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-400" />
            <input
              placeholder={t('admin.stalling.search')}
              className="input-base pl-9 pr-3"
            />
          </div>
          <Select label={t('admin.stalling.status')} options={['Alle', 'Betaald', 'Open', 'Verloopt']} />
          <Select label={t('admin.stalling.stallingType')} options={['Alle', 'Winter', 'Zomer', 'Jaar']} />
          <Button variant="outline" size="md" leftIcon={<Filter className="h-4 w-4" />}>
            {t('admin.common.filters')}
          </Button>
        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_22rem]">
          {/* Table */}
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-sm">
                <thead className="bg-sand-50/70 text-left text-xs uppercase tracking-wide text-navy-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">{t('admin.stalling.columns.boat')}</th>
                    <th className="px-4 py-3 font-semibold">{t('admin.stalling.columns.owner')}</th>
                    <th className="px-4 py-3 font-semibold">{t('admin.stalling.columns.location')}</th>
                    <th className="px-4 py-3 font-semibold">{t('admin.stalling.columns.type')}</th>
                    <th className="px-4 py-3 font-semibold">{t('admin.stalling.columns.start')} → {t('admin.stalling.columns.end')}</th>
                    <th className="px-4 py-3 font-semibold">{t('admin.stalling.columns.amount')}</th>
                    <th className="px-4 py-3 font-semibold">{t('admin.stalling.columns.status')}</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-100">
                  {filtered.map((r) => (
                    <tr
                      key={r.id}
                      onClick={() => setSelected(r.id)}
                      className={cn(
                        'cursor-pointer transition',
                        selected === r.id ? 'bg-marine-50/40' : 'hover:bg-sand-50'
                      )}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className={cn('h-10 w-12 shrink-0 rounded-md bg-gradient-to-tr', r.imgColor)} />
                          <div className="min-w-0">
                            <div className="truncate font-semibold text-navy-900">{r.boat}</div>
                            <div className="truncate text-xs text-navy-400">
                              {r.type} · {r.length}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="truncate font-medium text-navy-900">{r.owner}</div>
                        <div className="truncate text-xs text-navy-400">{r.ownerEmail}</div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone="sand">
                          <MapPin className="h-3 w-3" /> {r.location}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-navy-700">{r.category}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-navy-700">
                        {r.start} → {r.end}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-semibold text-navy-900">{r.amount}</td>
                      <td className="px-4 py-3">
                        <Badge tone={STATUS_TONES[r.status]} dot>
                          {r.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right text-navy-400">
                        <button className="rounded-md p-1 hover:bg-sand-100 hover:text-navy-700">
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-navy-100 bg-sand-50/60 px-4 py-3 text-xs text-navy-500">
              <span>
                {t('admin.common.showing', { count: String(filtered.length), total: String(ROWS.length) })}
              </span>
              <div className="flex items-center gap-1">
                {[1, 2, 3, '…', 18].map((p, i) => (
                  <button
                    key={i}
                    className={cn(
                      'h-7 min-w-[28px] rounded-md px-2 text-xs',
                      p === 1
                        ? 'bg-navy-900 font-semibold text-white'
                        : 'text-navy-600 hover:bg-sand-100'
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </Card>

          {/* Detail panel */}
          <Card className="self-start overflow-hidden p-0">
            <div className="relative">
              <div className={cn('aspect-[4/3] w-full bg-gradient-to-tr', detail.imgColor)} />
              <Badge tone="success" dot className="absolute right-4 top-4">
                Actief
              </Badge>
            </div>
            <div className="p-5">
              <div className="text-xs font-semibold uppercase tracking-widest text-navy-400">
                {detail.type} · {detail.length}
              </div>
              <h3 className="heading-display mt-1 text-2xl">{detail.boat}</h3>
              <div className="mt-1 flex items-center gap-1 text-sm text-navy-500">
                <MapPin className="h-3.5 w-3.5" /> {t('admin.stalling.columns.location')} {detail.location}
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <Mini label={t('admin.stalling.stallingType')} value={detail.category} />
                <Mini label={t('admin.stalling.columns.amount')} value={detail.amount} />
                <Mini label={t('admin.stalling.columns.start')} value={detail.start} />
                <Mini label={t('admin.stalling.columns.end')} value={detail.end} />
              </div>

              <div className="mt-6">
                <div className="text-xs font-semibold uppercase tracking-widest text-navy-400">
                  {t('admin.stalling.detailPanel.customer')}
                </div>
                <div className="mt-2 flex items-center gap-3 rounded-lg border border-navy-100 p-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-900 text-sm font-semibold text-white">
                    {detail.owner.split(' ').map((p) => p[0]).join('').slice(0, 2)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-navy-900">{detail.owner}</div>
                    <div className="truncate text-xs text-navy-400">{detail.ownerEmail}</div>
                  </div>
                  <Users className="h-4 w-4 text-navy-300" />
                </div>
              </div>

              <div className="mt-6 grid gap-2">
                <Button variant="primary" fullWidth leftIcon={<Calendar className="h-4 w-4" />}>
                  {t('admin.stalling.detailPanel.extend')}
                </Button>
                <Button variant="outline" fullWidth leftIcon={<FilePlus2 className="h-4 w-4" />}>
                  {t('admin.stalling.detailPanel.invoice')}
                </Button>
                <Button variant="ghost" fullWidth rightIcon={<ArrowRight className="h-4 w-4" />}>
                  {t('admin.common.details')}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}

function StatCard({
  label,
  value,
  delta,
  tone,
  icon: Icon,
}: {
  label: string;
  value: string;
  delta: string;
  tone: 'navy' | 'success' | 'warning' | 'danger' | 'gold';
  icon: React.ComponentType<{ className?: string }>;
}) {
  const map: Record<string, string> = {
    navy: 'bg-navy-50 text-navy-700',
    success: 'bg-emerald-50 text-emerald-700',
    warning: 'bg-amber-50 text-amber-700',
    danger: 'bg-rose-50 text-rose-700',
    gold: 'bg-gold-50 text-gold-700',
  };
  return (
    <Card className="flex items-center gap-4 p-4">
      <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', map[tone])}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-xs text-navy-500">{label}</div>
        <div className="truncate text-xl font-semibold text-navy-900">{value}</div>
      </div>
      <div className="shrink-0 text-xs font-semibold text-navy-500">{delta}</div>
    </Card>
  );
}

function Select({ label, options }: { label: string; options: string[] }) {
  return (
    <div className="relative">
      <select
        className="input-base appearance-none pr-9"
        defaultValue={options[0]}
        aria-label={label}
      >
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-400" />
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-navy-100 p-3">
      <div className="text-[11px] uppercase tracking-wide text-navy-400">{label}</div>
      <div className="mt-0.5 text-sm font-semibold text-navy-900">{value}</div>
    </div>
  );
}
