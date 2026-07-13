'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { History, Image as ImageIcon, Receipt, Wrench } from 'lucide-react';
import { PortalPageHeader } from '@/components/portal/PortalShell';
import {
  PortalContent,
  PortalDetailGrid,
  PortalSectionCard,
} from '@/components/portal/PortalUi';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { LoadingState, ErrorState } from '@/components/admin/DataState';
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

const arr = (row: Row | undefined, key: string): Row[] => {
  const v = row?.[key];
  return Array.isArray(v) ? (v as Row[]) : [];
};

function statusBadgeTone(status: string): React.ComponentProps<typeof Badge>['tone'] {
  const s = status.toLowerCase();
  if (s.includes('done') || s.includes('complete')) return 'success';
  if (s.includes('progress') || s.includes('start')) return 'marine';
  if (s.includes('cancel')) return 'sand';
  return 'navy';
}

const PHOTO_FOLDERS = ['before', 'during', 'after'] as const;

export default function PortalWorkOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? '';
  const { locale, t } = useIntl();
  const dateLocale = locale === 'en' ? 'en-GB' : locale === 'de' ? 'de-DE' : 'nl-NL';

  const data = useQuery([id], () =>
    id ? portalService.workOrder(id) : Promise.reject(new Error('Missing id'))
  );

  const order = (data.data ?? undefined) as Row | undefined;
  const status = str(order, 'status') || 'new';
  const photos = arr(order, 'photos');
  const timelineRows = arr(order, 'timeline');
  const invoiceId = str(order, 'invoice_id') || str((order?.invoice as Row) ?? undefined, 'id');
  const photosByFolder = (folder: string) =>
    photos.filter((p) => (str(p, 'folder', 'type') || 'before').toLowerCase() === folder);

  return (
    <>
      <PortalPageHeader
        title={`${t('adminNew.portal.workOrders.title')} ${str(order, 'number') || id}`}
        subtitle={str(order, 'type') || t('adminNew.portal.workOrders.subtitle')}
        stats={[
          {
            label: t('adminNew.workOrders.columns.status'),
            value: status,
            icon: Wrench,
            tone: statusBadgeTone(status) === 'success' ? 'success' : 'marine',
            loading: data.loading,
          },
          {
            label: t('adminNew.workOrders.columns.due'),
            value: str(order, 'due_date') ? formatDate(str(order, 'due_date'), dateLocale) : '—',
            tone: 'navy',
            loading: data.loading,
          },
        ]}
      />

      <PortalContent>
        {data.loading ? <LoadingState label={t('adminNew.portal.workOrders.loading')} variant="default" /> : null}
        {!data.loading && data.error ? (
          <ErrorState message={data.error} onRetry={() => void data.refetch()} />
        ) : null}

        {!data.loading && order ? (
          <div className="space-y-5">
            <PortalSectionCard
              title={t('adminNew.workOrders.detail.overview')}
              icon={Wrench}
            >
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={statusBadgeTone(status)}>{status}</Badge>
                  {str(order, 'priority') ? (
                    <Badge tone="neutral">{str(order, 'priority')}</Badge>
                  ) : null}
                </div>
                <PortalDetailGrid
                  items={[
                    { label: t('adminNew.workOrders.columns.type'), value: str(order, 'type') || '—' },
                    {
                      label: t('adminNew.workOrders.columns.boat'),
                      value:
                        str(order, 'boat_name') ||
                        (order.boat as { name?: string } | undefined)?.name ||
                        '—',
                    },
                    {
                      label: t('adminNew.workOrders.columns.due'),
                      value: str(order, 'due_date')
                        ? formatDate(str(order, 'due_date'), dateLocale)
                        : '—',
                    },
                    {
                      label: t('adminNew.workOrders.detail.created'),
                      value: str(order, 'created_at')
                        ? formatDate(str(order, 'created_at'), dateLocale)
                        : '—',
                    },
                  ]}
                />
                {str(order, 'description', 'notes') ? (
                  <div className="rounded-xl border border-navy-100 bg-sand-50/50 p-4 text-sm text-navy-700">
                    {str(order, 'description', 'notes')}
                  </div>
                ) : null}
                {invoiceId ? (
                  <Link href={`/${locale}/dashboard/facturen`}>
                    <Button variant="outline" size="sm" leftIcon={<Receipt className="h-4 w-4" />}>
                      {t('adminNew.portal.workOrders.viewInvoice')}
                    </Button>
                  </Link>
                ) : null}
              </div>
            </PortalSectionCard>

            <PortalSectionCard title={t('adminNew.workOrders.detail.photos')} icon={ImageIcon}>
              {photos.length === 0 ? (
                <p className="py-4 text-sm text-navy-500">{t('adminNew.workOrders.detail.noPhotos')}</p>
              ) : (
                <div className="space-y-4">
                  {PHOTO_FOLDERS.map((folder) => {
                    const folderPhotos = photosByFolder(folder);
                    if (folderPhotos.length === 0) return null;
                    return (
                      <div key={folder}>
                        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-navy-400">
                          {t(`adminNew.workOrders.photoFolders.${folder}`)}
                        </div>
                        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                          {folderPhotos.map((p, i) => {
                            const url = str(p, 'url', 'path', 'signed_url');
                            return (
                              <a
                                key={str(p, 'id', 'file_id') || i}
                                href={url}
                                target="_blank"
                                rel="noreferrer"
                                className="aspect-square overflow-hidden rounded-lg border border-navy-100 bg-sand-50"
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={url} alt="" className="h-full w-full object-cover" />
                              </a>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </PortalSectionCard>

            <PortalSectionCard title={t('adminNew.workOrders.detail.activity')} icon={History}>
              {timelineRows.length === 0 ? (
                <p className="py-4 text-sm text-navy-500">{t('adminNew.workOrders.detail.noActivity')}</p>
              ) : (
                <ol className="space-y-2">
                  {timelineRows.map((a, i) => (
                    <li key={str(a, 'id') || i} className="flex items-start gap-3 text-sm">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-marine-400" />
                      <div>
                        <div className="text-navy-800">
                          {str(a, 'title', 'action', 'description', 'event') || '—'}
                        </div>
                        <div className="text-xs text-navy-400">
                          {str(a, 'created_at', 'occurred_at')
                            ? formatDate(str(a, 'created_at', 'occurred_at'), dateLocale)
                            : ''}
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </PortalSectionCard>

            <Link
              href={`/${locale}/dashboard/werkorders`}
              className="inline-flex text-sm font-semibold text-marine-700 hover:text-marine-800"
            >
              {t('adminNew.workOrders.detail.back')}
            </Link>
          </div>
        ) : null}
      </PortalContent>
    </>
  );
}
