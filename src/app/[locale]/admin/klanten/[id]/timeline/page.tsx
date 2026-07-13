'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Activity, ArrowLeft } from 'lucide-react';
import { AdminPageHeader } from '@/components/admin/AdminShell';
import { AdminContent, AdminSectionCard, AdminTableFooter } from '@/components/admin/AdminUi';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState, ErrorState, LoadingState } from '@/components/admin/DataState';
import { adminService, customersService } from '@/lib/services';
import { useQuery } from '@/lib/hooks/useAsync';
import { formatDateTime } from '@/lib/format';
import { useIntl } from '@/i18n/IntlProvider';

type Rec = Record<string, unknown>;
const str = (r: Rec, ...keys: string[]): string => {
  for (const k of keys) {
    const v = r[k];
    if (typeof v === 'string' && v.trim()) return v;
  }
  return '';
};

// Trello #89: dedicated customer timeline subroute (instead of only an inline section).
export default function CustomerTimelinePage() {
  const { locale, t } = useIntl();
  const params = useParams<{ id: string }>();
  const customerId = params?.id ?? '';
  const dateLocale = locale === 'en' ? 'en-GB' : locale === 'de' ? 'de-DE' : 'nl-NL';
  const [page, setPage] = React.useState(1);

  const customer = useQuery([customerId], () => customersService.get(customerId).catch(() => null));
  const feed = useQuery([customerId, page], () =>
    adminService.timeline({ customer_id: customerId, per_page: 30, page })
  );

  const rows = (feed.data?.data ?? []) as Rec[];

  return (
    <>
      <AdminPageHeader
        title={customer.data?.name ?? t('adminNew.customerDetail.timeline')}
        subtitle={t('adminNew.customerDetail.timelineSubtitle')}
        rightSlot={
          <Link href={`/${locale}/admin/klanten/${customerId}`}>
            <Button variant="outline" size="sm" leftIcon={<ArrowLeft className="h-4 w-4" />}>
              {t('adminNew.common.back')}
            </Button>
          </Link>
        }
      />
      <AdminContent>
        <AdminSectionCard
          title={t('adminNew.customerDetail.timeline')}
          description={t('adminNew.customerDetail.timelineSubtitle')}
          icon={Activity}
        >
          {feed.loading ? (
            <LoadingState label={t('adminNew.common.loading')} />
          ) : feed.error ? (
            <ErrorState message={feed.error} onRetry={() => void feed.refetch()} />
          ) : rows.length === 0 ? (
            <EmptyState title={t('adminNew.timeline.emptyTitle')} message={t('adminNew.timeline.emptyMessage')} />
          ) : (
            <ol className="relative space-y-3 border-l border-navy-100 pl-5">
              {rows.map((item, i) => {
                const visibility = str(item, 'visibility');
                const priority = str(item, 'priority');
                return (
                  <li key={str(item, 'id') || i} className="relative">
                    <span className="absolute -left-[27px] flex h-5 w-5 items-center justify-center rounded-full bg-white ring-1 ring-navy-100">
                      <Activity className="h-3 w-3 text-navy-500" />
                    </span>
                    <div className="rounded-xl border border-navy-100/70 bg-white p-3 shadow-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="flex items-center gap-2 font-semibold text-navy-900">
                          {str(item, 'title', 'type') || '—'}
                          {visibility === 'internal' ? (
                            <Badge tone="neutral">{t('adminNew.customerDetail.internalNote')}</Badge>
                          ) : null}
                          {priority === 'high' || priority === 'urgent' ? (
                            <Badge tone="danger">{priority}</Badge>
                          ) : null}
                        </span>
                        <span className="text-xs text-navy-400">
                          {str(item, 'created_at') ? formatDateTime(str(item, 'created_at'), dateLocale) : ''}
                        </span>
                      </div>
                      {str(item, 'message', 'description') ? (
                        <p className="mt-1 text-sm text-navy-600">{str(item, 'message', 'description')}</p>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
          {rows.length > 0 && feed.data?.meta ? (
            <div className="mt-4">
              <AdminTableFooter
                summary={t('adminNew.timeline.count', { count: feed.data.meta.total ?? rows.length })}
                meta={feed.data.meta}
                onPageChange={setPage}
              />
            </div>
          ) : null}
        </AdminSectionCard>
      </AdminContent>
    </>
  );
}
