'use client';

import * as React from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Database,
  Download,
  FileText,
  Filter,
  KeyRound,
  Search,
  ShieldCheck,
  Users,
  Zap,
} from 'lucide-react';
import { useIntl } from '@/i18n/IntlProvider';
import { AdminPageHeader } from '@/components/admin/AdminShell';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';

interface Log {
  id: number;
  time: string;
  date: string;
  action: string;
  actor: string;
  actorEmail: string;
  subject: string;
  status: 'success' | 'warning' | 'error' | 'info';
  category: string;
  ip: string;
}

const LOGS: Log[] = [
  { id: 1, time: '14:32:21', date: '15-10', action: 'PDF regenerate gestart', actor: 'Admin Lisa', actorEmail: 'lisa@krekelberg.nl', subject: 'invoice 2026-0123', status: 'success', category: 'invoices', ip: '192.168.1.10' },
  { id: 2, time: '14:29:08', date: '15-10', action: 'Login geslaagd', actor: 'Michael S.', actorEmail: 'michael@krekelberg.nl', subject: 'session-991', status: 'success', category: 'security', ip: '88.221.45.10' },
  { id: 3, time: '14:21:54', date: '15-10', action: 'Stallingscontract verlengd', actor: 'Admin Peter', actorEmail: 'peter@krekelberg.nl', subject: 'contract STAL-2026-019', status: 'success', category: 'stalling', ip: '192.168.1.11' },
  { id: 4, time: '14:05:12', date: '15-10', action: 'Mollie webhook gefaald', actor: 'System', actorEmail: 'sys@krekelberg.nl', subject: 'tr_abc123', status: 'error', category: 'payments', ip: '—' },
  { id: 5, time: '13:48:39', date: '15-10', action: 'Sync conflict gedetecteerd', actor: 'yard-tablet-01', actorEmail: 'device', subject: 'appointment 991', status: 'warning', category: 'sync', ip: '192.168.5.22' },
  { id: 6, time: '13:22:01', date: '15-10', action: 'Login mislukt — 3e poging', actor: 'jan@example.com', actorEmail: 'jan@example.com', subject: 'auth-3', status: 'warning', category: 'security', ip: '94.211.55.10' },
  { id: 7, time: '12:54:30', date: '15-10', action: 'Klant aangemaakt', actor: 'Admin Peter', actorEmail: 'peter@krekelberg.nl', subject: 'CUST-000412', status: 'success', category: 'customers', ip: '192.168.1.11' },
  { id: 8, time: '12:38:11', date: '15-10', action: 'Factuur verzonden', actor: 'System', actorEmail: 'sys@krekelberg.nl', subject: 'invoice 2026-0121', status: 'success', category: 'invoices', ip: '—' },
  { id: 9, time: '12:11:48', date: '15-10', action: 'Mollie webhook retry geslaagd', actor: 'Admin Lisa', actorEmail: 'lisa@krekelberg.nl', subject: 'tr_abc123', status: 'success', category: 'payments', ip: '192.168.1.10' },
  { id: 10, time: '11:48:09', date: '15-10', action: 'Pricing rule gewijzigd', actor: 'Admin Peter', actorEmail: 'peter@krekelberg.nl', subject: 'rule afspuiten-850', status: 'info', category: 'system', ip: '192.168.1.11' },
];

const STATUS_TONE: Record<Log['status'], 'success' | 'warning' | 'danger' | 'navy'> = {
  success: 'success',
  warning: 'warning',
  error: 'danger',
  info: 'navy',
};

export default function AuditPage() {
  const { t } = useIntl();
  const [tab, setTab] = React.useState('all');

  const STATS = [
    { label: t('admin.audit.stats.totalEvents'), value: '1.248', delta: '+12%', icon: Database, tone: 'navy' as const },
    { label: t('admin.audit.stats.success'), value: '1.047', delta: '84%', icon: CheckCircle2, tone: 'success' as const },
    { label: t('admin.audit.stats.warnings'), value: '63', delta: '5%', icon: AlertTriangle, tone: 'warning' as const },
    { label: t('admin.audit.stats.errors'), value: '28', delta: '2%', icon: AlertOctagon, tone: 'danger' as const },
    { label: t('admin.audit.stats.users'), value: '152', delta: '+8', icon: Users, tone: 'marine' as const },
    { label: t('admin.audit.stats.criticalEvents'), value: '19', delta: '+1', icon: Zap, tone: 'gold' as const },
  ];

  const TABS = [
    { id: 'all', label: t('admin.audit.tabs.all'), count: 1248 },
    { id: 'security', label: t('admin.audit.tabs.security'), count: 91 },
    { id: 'customers', label: t('admin.audit.tabs.customers'), count: 312 },
    { id: 'kassa', label: t('admin.sidebar.kassa'), count: 188 },
    { id: 'stalling', label: t('admin.sidebar.stalling'), count: 142 },
    { id: 'invoices', label: t('admin.sidebar.invoices'), count: 211 },
    { id: 'payments', label: t('admin.audit.tabs.billing'), count: 78 },
    { id: 'sync', label: 'Offline sync', count: 24 },
    { id: 'system', label: t('admin.audit.tabs.system'), count: 22 },
  ];

  const filtered = tab === 'all' ? LOGS : LOGS.filter((l) => l.category === tab);

  return (
    <>
      <AdminPageHeader
        title={t('admin.audit.title')}
        subtitle={t('admin.audit.subtitle')}
        rightSlot={
          <>
            <Button variant="outline" size="sm" leftIcon={<Filter className="h-4 w-4" />}>
              {t('admin.common.filters')}
            </Button>
            <Button variant="primary" size="sm" leftIcon={<Download className="h-4 w-4" />}>
              {t('admin.audit.exportLogs')}
            </Button>
          </>
        }
      >
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {STATS.map((s) => (
            <Stat key={s.label} {...s} />
          ))}
        </div>
      </AdminPageHeader>

      <div className="px-4 py-5 sm:px-6">
        {/* Filters */}
        <Card className="p-4">
          <div className="grid gap-3 lg:grid-cols-5">
            <Select icon={<ShieldCheck className="h-4 w-4" />} label={t('admin.audit.categories')} />
            <Select icon={<Users className="h-4 w-4" />} label={t('admin.audit.actorTypes')} />
            <Select icon={<KeyRound className="h-4 w-4" />} label={t('admin.audit.severities')} />
            <Select icon={<FileText className="h-4 w-4" />} label={t('admin.audit.dates')} />
            <div className="flex flex-nowrap items-center gap-2 overflow-x-auto scrollbar-thin">
              {[t('admin.audit.today'), t('admin.audit.yesterday'), t('admin.audit.last7'), t('admin.audit.last30')].map((b, i) => (
                <button
                  key={b}
                  className={cn(
                    'shrink-0 rounded-md border px-2.5 py-1.5 text-xs font-medium',
                    i === 0
                      ? 'border-navy-900 bg-navy-900 text-white'
                      : 'border-navy-100 text-navy-700 hover:bg-sand-100'
                  )}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>
        </Card>

        {/* Tabs */}
        <div className="mt-4 flex flex-nowrap items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
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

        {/* Table */}
        <Card className="mt-4 overflow-hidden">
          <div className="border-b border-navy-100 bg-sand-50/60 px-4 py-3">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-400" />
              <input placeholder={t('admin.common.search')} className="input-base pl-9" />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-sm">
              <thead className="bg-white text-left text-xs uppercase tracking-wide text-navy-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">{t('admin.audit.columns.time')}</th>
                  <th className="px-4 py-3 font-semibold">{t('admin.audit.columns.action')}</th>
                  <th className="px-4 py-3 font-semibold">{t('admin.audit.columns.actor')}</th>
                  <th className="px-4 py-3 font-semibold">{t('admin.audit.columns.subject')}</th>
                  <th className="px-4 py-3 font-semibold">{t('admin.audit.columns.status')}</th>
                  <th className="px-4 py-3 font-semibold">{t('admin.audit.columns.ip')}</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-100">
                {filtered.map((l) => (
                  <tr key={l.id} className="hover:bg-sand-50/70">
                    <td className="whitespace-nowrap px-4 py-3 text-navy-700">
                      <div className="font-semibold">{l.time}</div>
                      <div className="text-xs text-navy-400">{l.date} · 2026</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md',
                            l.status === 'success' && 'bg-emerald-50 text-emerald-600',
                            l.status === 'warning' && 'bg-amber-50 text-amber-600',
                            l.status === 'error' && 'bg-rose-50 text-rose-600',
                            l.status === 'info' && 'bg-navy-50 text-navy-600'
                          )}
                        >
                          {l.status === 'success' && <CheckCircle2 className="h-3.5 w-3.5" />}
                          {l.status === 'warning' && <AlertTriangle className="h-3.5 w-3.5" />}
                          {l.status === 'error' && <AlertOctagon className="h-3.5 w-3.5" />}
                          {l.status === 'info' && <FileText className="h-3.5 w-3.5" />}
                        </span>
                        <span className="font-medium text-navy-900">{l.action}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-navy-700">
                      <div className="font-medium">{l.actor}</div>
                      <div className="text-xs text-navy-400">{l.actorEmail}</div>
                    </td>
                    <td className="px-4 py-3">
                      <code className="rounded-md bg-sand-100 px-1.5 py-0.5 text-xs text-navy-700">
                        {l.subject}
                      </code>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={STATUS_TONE[l.status]} dot>
                        {l.status}
                      </Badge>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-navy-500">{l.ip}</td>
                    <td className="px-4 py-3 text-right">
                      <button className="text-xs font-medium text-marine-700 hover:text-marine-800">
                        {t('admin.common.details')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-navy-100 bg-sand-50/40 px-4 py-3 text-xs text-navy-500">
            <span>
              {t('admin.common.showing', { count: String(filtered.length), total: '1.248' })}
            </span>
            <div className="flex items-center gap-1">
              {[1, 2, 3, '…', 125].map((p, i) => (
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
      </div>
    </>
  );
}

function Stat({
  label,
  value,
  delta,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  delta: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: 'navy' | 'success' | 'warning' | 'danger' | 'gold' | 'marine';
}) {
  const map: Record<string, string> = {
    navy: 'bg-navy-50 text-navy-700',
    success: 'bg-emerald-50 text-emerald-700',
    warning: 'bg-amber-50 text-amber-700',
    danger: 'bg-rose-50 text-rose-700',
    gold: 'bg-gold-50 text-gold-700',
    marine: 'bg-marine-50 text-marine-700',
  };
  return (
    <Card className="flex items-center gap-3 p-4">
      <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', map[tone])}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-xs text-navy-500">{label}</div>
        <div className="truncate text-lg font-semibold text-navy-900">{value}</div>
      </div>
      <div className="shrink-0 text-xs font-semibold text-navy-500">{delta}</div>
    </Card>
  );
}

function Select({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-navy-400">
        {icon}
      </span>
      <select className="input-base appearance-none pl-9 pr-9" defaultValue={label}>
        <option>{label}</option>
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-400" />
    </div>
  );
}
