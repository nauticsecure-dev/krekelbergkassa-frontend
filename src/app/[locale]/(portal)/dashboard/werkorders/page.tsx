'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Clock, Wrench } from 'lucide-react';
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
import { formatDate } from '@/lib/format';
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

function statusBadgeTone(status: string): React.ComponentProps<typeof Badge>['tone'] {
  const s = status.toLowerCase();
  if (s.includes('done') || s.includes('complete')) return 'success';
  if (s.includes('progress') || s.includes('start')) return 'marine';
  if (s.includes('cancel')) return 'sand';
  return 'navy';
}

function priorityTone(priority: string): 'normal' | 'high' | 'urgent' {
  if (priority === 'urgent') return 'urgent';
  if (priority === 'high') return 'high';
  return 'normal';
}

export default function PortalWorkOrdersPage() {
  const { locale, t } = useIntl();
  const router = useRouter();
  const dateLocale = locale === 'en' ? 'en-GB' : locale === 'de' ? 'de-DE' : 'nl-NL';

  const workOrders = useQuery([], () => portalService.workOrders());
  const rows = (workOrders.data?.data ?? []) as Row[];
  const openCount = rows.filter((r) => {
    const s = str(r, 'status').toLowerCase();
    return !s.includes('complete') && !s.includes('cancel');
  }).length;
  const doneCount = rows.filter((r) => str(r, 'status').toLowerCase().includes('complete')).length;

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

          {!workOrders.loading && !workOrders.error && rows.length === 0 ? (
            <EmptyState
              title={t('adminNew.portal.workOrders.empty')}
              message={t('adminNew.portal.workOrders.emptyMessage')}
            />
          ) : null}

          {!workOrders.loading && !workOrders.error && rows.length > 0 ? (
            <div className="space-y-2.5">
              {rows.map((wo) => {
                const status = str(wo, 'status') || 'new';
                const due = str(wo, 'due_date');
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
                    trailing={<Badge tone={statusBadgeTone(status)}>{status}</Badge>}
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
