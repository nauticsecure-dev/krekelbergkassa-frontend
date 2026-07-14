'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  CheckCircle2,
  History,
  Image as ImageIcon,
  Receipt,
  Wrench,
  X,
} from 'lucide-react';
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
import { useQuery, useMutation } from '@/lib/hooks/useAsync';
import { formatDate } from '@/lib/format';
import { useIntl } from '@/i18n/IntlProvider';
import { useToast } from '@/components/ui/ToastProvider';

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
  if (s.includes('invoiced')) return 'gold';
  return 'navy';
}

// Item 28: extended folder list including damage and inspection
const PHOTO_FOLDERS = ['before', 'during', 'after', 'damage', 'inspection'] as const;
type PhotoFolder = (typeof PHOTO_FOLDERS)[number];

const FOLDER_LABELS: Record<PhotoFolder, string> = {
  before: 'Voor',
  during: 'Tijdens',
  after: 'Na',
  damage: 'Schade',
  inspection: 'Inspectie',
};

// Item 31: Lightbox modal (zero external deps)
function Lightbox({
  url,
  onClose,
}: {
  url: string;
  onClose: () => void;
}) {
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <button
        type="button"
        aria-label="Sluiten"
        onClick={onClose}
        className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
      >
        <X className="h-5 w-5" />
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt=""
        className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}

// Item 30: Accept/sign-off confirmation dialog
function AcceptDialog({
  onConfirm,
  onCancel,
  loading,
}: {
  onConfirm: (note: string) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [note, setNote] = React.useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center">
      <div className="w-full max-w-md rounded-t-2xl bg-white p-6 shadow-2xl sm:rounded-2xl">
        <h2 className="mb-2 text-base font-bold text-navy-900">Werkopdracht accepteren</h2>
        <p className="mb-4 text-sm text-navy-600">
          Bevestig dat u akkoord gaat met de uitgevoerde werkzaamheden.
        </p>
        <textarea
          placeholder="Optionele opmerking…"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          className="w-full rounded-xl border border-navy-200 p-3 text-sm text-navy-900 focus:border-marine-400 focus:outline-none focus:ring-2 focus:ring-marine-200"
        />
        <div className="mt-4 flex gap-3">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={onCancel}
            disabled={loading}
          >
            Annuleren
          </Button>
          <Button
            size="sm"
            className="flex-1"
            onClick={() => onConfirm(note)}
            disabled={loading}
          >
            <CheckCircle2 className="mr-1.5 h-4 w-4" />
            Accepteren
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function PortalWorkOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? '';
  const { locale, t } = useIntl();
  const { push } = useToast();
  const dateLocale = locale === 'en' ? 'en-GB' : locale === 'de' ? 'de-DE' : 'nl-NL';

  const [lightboxUrl, setLightboxUrl] = React.useState<string | null>(null);
  const [showAccept, setShowAccept] = React.useState(false);

  const data = useQuery([id], () =>
    id ? portalService.workOrder(id) : Promise.reject(new Error('Missing id'))
  );

  // Item 27: fetch timeline separately so it works even if not embedded in work-order response
  const timelineData = useQuery([id], () =>
    id ? portalService.workOrderTimeline(id).catch(() => ({ data: [] })) : Promise.resolve({ data: [] })
  );

  const acceptMutation = useMutation(async (note: string) => {
    await portalService.workOrderAccept(id, note ? { note } : undefined);
    push({ tone: 'success', title: 'Geaccepteerd', message: 'Werkopdracht geaccepteerd.' });
    setShowAccept(false);
    void data.refetch();
  });

  const order = (data.data ?? undefined) as Row | undefined;
  const status = str(order, 'status') || 'new';

  // Resolve photos — backend returns `photos` or falls back to filtered `files`
  const photos = arr(order, 'photos').length > 0
    ? arr(order, 'photos')
    : arr(order, 'files').filter((f) => str(f, 'file_type') === 'photo');

  // Item 27: timeline from dedicated endpoint, fallback to embedded
  const timelineRows: Row[] =
    (timelineData.data?.data?.length ?? 0) > 0
      ? (timelineData.data!.data as Row[])
      : arr(order, 'timeline');

  // Item 29: deep link to specific invoice
  const invoiceId = str(order, 'invoice_id') || str((order?.invoice as Row) ?? undefined, 'id');

  const photosByFolder = (folder: PhotoFolder) =>
    photos.filter((p) => {
      const f = str(p, 'folder', 'type') || 'before';
      return f.toLowerCase() === folder;
    });

  // Item 30: only show accept button when work order is completed and not yet accepted
  const canAccept =
    ['completed', 'invoiced'].includes(status) &&
    !(order?.customer_accepted_at);

  return (
    <>
      {lightboxUrl ? (
        <Lightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />
      ) : null}

      {showAccept ? (
        <AcceptDialog
          onConfirm={(note) => void acceptMutation.mutate(note)}
          onCancel={() => setShowAccept(false)}
          loading={acceptMutation.loading}
        />
      ) : null}

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
                  {order.customer_accepted_at ? (
                    <Badge tone="success">
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      Geaccepteerd
                    </Badge>
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
                <div className="flex flex-wrap gap-2">
                  {invoiceId ? (
                    // Item 29: deep link to specific invoice
                    <Link href={`/${locale}/dashboard/facturen/${invoiceId}`}>
                      <Button variant="outline" size="sm" leftIcon={<Receipt className="h-4 w-4" />}>
                        {t('adminNew.portal.workOrders.viewInvoice')}
                      </Button>
                    </Link>
                  ) : null}
                  {/* Item 30: customer acceptance CTA */}
                  {canAccept ? (
                    <Button
                      size="sm"
                      onClick={() => setShowAccept(true)}
                      leftIcon={<CheckCircle2 className="h-4 w-4" />}
                    >
                      Accepteren
                    </Button>
                  ) : null}
                </div>
              </div>
            </PortalSectionCard>

            {/* Item 28 + 31: photos with extended folders and lightbox */}
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
                          {FOLDER_LABELS[folder]}
                        </div>
                        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                          {folderPhotos.map((p, i) => {
                            const url = str(p, 'url', 'path', 'signed_url');
                            return (
                              <button
                                key={str(p, 'id', 'file_id') || i}
                                type="button"
                                onClick={() => setLightboxUrl(url)}
                                className="aspect-square overflow-hidden rounded-lg border border-navy-100 bg-sand-50 transition hover:opacity-90 active:scale-95"
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={url} alt="" className="h-full w-full object-cover" />
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </PortalSectionCard>

            {/* Item 27: timeline from dedicated endpoint */}
            <PortalSectionCard title={t('adminNew.workOrders.detail.activity')} icon={History}>
              {timelineData.loading ? (
                <LoadingState label="Activiteit laden…" variant="list" />
              ) : timelineRows.length === 0 ? (
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
