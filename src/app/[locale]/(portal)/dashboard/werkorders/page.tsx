'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Clock, Search, Wrench } from 'lucide-react';
import { PortalPageHeader } from '@/components/portal/PortalShell';
import {
  PortalContent,
  PortalInteractiveRow,
  PortalSectionCard,
} from '@/components/portal/PortalUi';
import { Badge } from '@/components/ui/Badge';
import { EmptyState, ErrorState, LoadingState } from '@/components/admin/DataState';
import { portalService } from '@/lib/services';
import { useQuery } from '@/lib/hooks/useAsync';
import { formatDate, formatCurrency } from '@/lib/format';
import { useIntl } from '@/i18n/IntlProvider';

type Row = Record<string, unknown>;

const str = (row: Row | undefined, ...keys: string[]): string => {
  if (!row) return '';
  for (const k of keys) {
    const v = row[k];
    if (typeof v === 'string' && v.trim()) return v;
    if (typeof v === 'number') return String(v);
  }
  return '';
};

const PORTAL_STATUSES = [
  { value: '', label: 'Alle statussen' },
  { value: 'new', label: 'Nieuw' },
  { value: 'planned', label: 'Gepland' },
  { value: 'assigned', label: 'Toegewezen' },
  { value: 'in_progress', label: 'In uitvoering' },
  { value: 'waiting_for_customer', label: 'Wacht op klant' },
  { value: 'waiting_for_parts', label: 'Wacht op onderdelen' },
  { value: 'completed', label: 'Afgerond' },
  { value: 'invoiced', label: 'Gefactureerd' },
  { value: 'cancelled', label: 'Geannuleerd' },
];

function statusBadgeTone(status: string): React.ComponentProps<typeof Badge>['tone'] {
  const s = status.toLowerCase();
  if (s.includes('done') || s.includes('complete')) return 'success';
  if (s.includes('progress') || s.includes('start')) return 'marine';
  if (s.includes('cancel')) return 'sand';
  if (s.includes('invoiced')) return 'gold';
  return 'navy';
}

function priorityTone(priority: string): 'normal' | 'high' | 'urgent' {
  if (priority === 'urgent') return 'urgent';
  if (priority === 'high') return 'high';
  return 'normal';
}

function totalAmount(wo: Row): string | null {
  const candidates = [
    wo.total_amount,
    wo.total,
    (wo.invoice as Row | undefined)?.total_amount,
    wo.estimated_total,
  ];
  for (const v of candidates) {
    if (typeof v === 'number' && v > 0) return formatCurrency(v / 100);
    if (typeof v === 'string' && v.trim()) return v;
  }
  return null;
}

export default function PortalWorkOrdersPage() {
  const { locale, t } = useIntl();
  const router = useRouter();
  const dateLocale = locale === 'en' ? 'en-GB' : locale === 'de' ? 'de-DE' : 'nl-NL';

  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('');

  const workOrders = useQuery([], () => portalService.workOrders());
  const rows = (workOrders.data?.data ?? []) as Row[];

  const filtered = rows.filter((r) => {
    if (statusFilter && str(r, 'status') !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const haystack = [
        str(r, 'number'),
        str(r, 'type'),
        str(r, 'description'),
        str(r, 'boat_name'),
        (r.boat as { name?: string } | undefined)?.name ?? '',
      ]
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  const openCount = rows.filter((r) => {
    const s = str(r, 'status').toLowerCase();
    return !s.includes('complete') && !s.includes('cancel') && !s.includes('invoiced') && !s.includes('archived');
  }).length;
  const doneCount = rows.filter((r) =>
    ['completed', 'invoiced', 'archived'].includes(str(r, 'status'))
  ).length;

  return (
    <>
      <PortalPageHeader
        title={t('adminNew.portal.workOrders.title')}
        subtitle={t('adminNew.portal.workOrders.subtitle')}
        stats={[
          {
            label: t('adminNew.portal.workOrders.metricTotal'),
            value: rows.length,
            icon: Wrench,
            tone: 'marine',
            loading: workOrders.loading,
          },
          {
            label: t('adminNew.portal.workOrders.metricOpen'),
            value: openCount,
            icon: Clock,
            tone: openCount > 0 ? 'gold' : 'success',
            loading: workOrders.loading,
          },
          {
            label: t('adminNew.portal.workOrders.metricDone'),
            value: doneCount,
            icon: CheckCircle2,
            tone: 'success',
            loading: workOrders.loading,
          },
        ]}
      />

      <PortalContent>
        {/* Item 25: filter + search bar */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-400" />
            <input
              type="search"
              placeholder="Zoek werkopdracht…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-navy-200 bg-white py-2.5 pl-9 pr-3 text-sm text-navy-900 placeholder:text-navy-400 focus:border-marine-400 focus:outline-none focus:ring-2 focus:ring-marine-200"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-navy-200 bg-white px-3 py-2.5 text-sm text-navy-900 focus:border-marine-400 focus:outline-none focus:ring-2 focus:ring-marine-200"
          >
            {PORTAL_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <PortalSectionCard
          title={t('adminNew.portal.workOrders.title')}
          description={t('adminNew.portal.workOrders.listOverview')}
          icon={Wrench}
        >
          {workOrders.loading ? (
            <LoadingState label={t('adminNew.portal.workOrders.loading')} variant="list" />
          ) : null}

          {!workOrders.loading && workOrders.error ? (
            <ErrorState message={workOrders.error} onRetry={() => void workOrders.refetch()} />
          ) : null}

          {!workOrders.loading && !workOrders.error && filtered.length === 0 ? (
            <EmptyState
              title={search || statusFilter ? 'Geen resultaten' : t('adminNew.portal.workOrders.empty')}
              message={search || statusFilter ? 'Pas de filters aan.' : t('adminNew.portal.workOrders.emptyMessage')}
            />
          ) : null}

          {!workOrders.loading && !workOrders.error && filtered.length > 0 ? (
            <div className="space-y-2.5">
              {filtered.map((wo) => {
                const status = str(wo, 'status') || 'new';
                const due = str(wo, 'due_date');
                // Item 26: show total amount when available
                const amount = totalAmount(wo);
                return (
                  <PortalInteractiveRow
                    key={str(wo, 'id') || str(wo, 'number')}
                    icon={Wrench}
                    tone="marine"
                    priority={priorityTone(str(wo, 'priority') || 'normal')}
                    title={`#${str(wo, 'number') || str(wo, 'id')} · ${
                      str(wo, 'boat_name') ||
                      (wo.boat as { name?: string } | undefined)?.name ||
                      str(wo, 'type') ||
                      ''
                    }`}
                    subtitle={
                      due
                        ? t('adminNew.portal.workOrders.dueLabel', {
                            date: formatDate(due, dateLocale),
                          })
                        : str(wo, 'description')
                    }
                    trailing={
                      <div className="flex flex-col items-end gap-1">
                        <Badge tone={statusBadgeTone(status)}>{status}</Badge>
                        {amount ? (
                          <span className="text-xs font-semibold text-navy-600">{amount}</span>
                        ) : null}
                      </div>
                    }
                    onClick={() =>
                      router.push(`/${locale}/dashboard/werkorders/${str(wo, 'id')}`)
                    }
                  />
                );
              })}
            </div>
          ) : null}
        </PortalSectionCard>
      </PortalContent>
    </>
  );
}
