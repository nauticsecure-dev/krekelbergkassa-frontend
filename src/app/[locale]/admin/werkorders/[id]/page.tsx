'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  CheckCircle2,
  FileText,
  Image as ImageIcon,
  PlayCircle,
  Receipt,
  Ship,
  UserPlus,
  Wrench,
} from 'lucide-react';
import { AdminPageHeader } from '@/components/admin/AdminShell';
import {
  AdminContent,
  AdminDetailGrid,
  AdminModalBody,
  AdminModalFooter,
  AdminModalHeader,
  AdminSectionCard,
} from '@/components/admin/AdminUi';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { LoadingState, ErrorState } from '@/components/admin/DataState';
import { workOrdersService } from '@/lib/services';
import { useMutation, useQuery } from '@/lib/hooks/useAsync';
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

function statusTone(status: string): React.ComponentProps<typeof Badge>['tone'] {
  const s = status.toLowerCase();
  if (s.includes('done') || s.includes('complete')) return 'success';
  if (s.includes('progress') || s.includes('start')) return 'marine';
  if (s.includes('cancel')) return 'sand';
  return 'navy';
}

export default function WorkOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? '';
  const { locale, t } = useIntl();
  const { push, pushError } = useToast();
  const dateLocale = locale === 'en' ? 'en-GB' : locale === 'de' ? 'de-DE' : 'nl-NL';

  const [showAssign, setShowAssign] = React.useState(false);
  const [assignee, setAssignee] = React.useState('');
  const [showComplete, setShowComplete] = React.useState(false);
  const [completeNotes, setCompleteNotes] = React.useState('');
  const [completeHours, setCompleteHours] = React.useState('');

  const data = useQuery([id], async () => {
    if (!id) throw new Error('Missing work order id');
    const [order, metadata] = await Promise.all([
      workOrdersService.get(id),
      workOrdersService.metadata().catch(() => null),
    ]);
    return { order, metadata };
  });

  const assignM = useMutation(() => workOrdersService.assign(id, { assignee_id: assignee || null }));
  const startM = useMutation(() => workOrdersService.start(id));
  const completeM = useMutation(() =>
    workOrdersService.complete(id, {
      notes: completeNotes || undefined,
      hours: completeHours ? Number(completeHours) : undefined,
    })
  );
  const invoiceM = useMutation(() => workOrdersService.generateInvoice(id));

  const run = async (label: string, fn: () => Promise<unknown>) => {
    try {
      await fn();
      push({ tone: 'success', title: label });
      await data.refetch();
    } catch (err) {
      pushError(err, t('adminNew.common.operationFailed'));
    }
  };

  const order = data.data?.order;
  const technicians = data.data?.metadata?.technicians ?? [];
  const status = str(order, 'status') || 'new';
  const photos = arr(order, 'photos');
  const documents = arr(order, 'documents');
  const boatId = str(order, 'boat_id');
  const assigneeName = str(order, 'assignee_name', 'technician_name');

  return (
    <>
      <AdminPageHeader
        title={`${t('adminNew.workOrders.title')} ${str(order, 'number') || id}`}
        subtitle={str(order, 'type') || t('adminNew.workOrders.subtitle')}
        rightSlot={
          order ? (
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                leftIcon={<UserPlus className="h-4 w-4" />}
                onClick={() => {
                  setAssignee(str(order, 'assignee_id', 'technician_id'));
                  setShowAssign(true);
                }}
              >
                {t('adminNew.workOrders.detail.assign')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                leftIcon={<PlayCircle className="h-4 w-4" />}
                disabled={startM.loading || statusTone(status) === 'marine'}
                onClick={() => void run(t('adminNew.workOrders.toasts.started'), startM.mutate)}
              >
                {t('adminNew.workOrders.detail.start')}
              </Button>
              <Button
                variant="gold"
                size="sm"
                leftIcon={<CheckCircle2 className="h-4 w-4" />}
                onClick={() => {
                  setCompleteNotes('');
                  setCompleteHours('');
                  setShowComplete(true);
                }}
              >
                {t('adminNew.workOrders.detail.complete')}
              </Button>
            </div>
          ) : null
        }
        stats={[
          {
            label: t('adminNew.workOrders.columns.status'),
            value: status,
            icon: Wrench,
            tone: statusTone(status) === 'success' ? 'success' : 'marine',
            loading: data.loading,
          },
          {
            label: t('adminNew.workOrders.columns.priority'),
            value: str(order, 'priority') || 'normal',
            icon: Wrench,
            tone: 'gold',
            loading: data.loading,
          },
          {
            label: t('adminNew.workOrders.columns.due'),
            value: str(order, 'due_date') ? formatDate(str(order, 'due_date'), dateLocale) : '—',
            tone: 'navy',
            loading: data.loading,
          },
          {
            label: t('adminNew.workOrders.detail.assignee'),
            value: assigneeName || t('adminNew.workOrders.detail.unassigned'),
            icon: UserPlus,
            tone: 'marine',
            loading: data.loading,
          },
        ]}
      />

      <AdminContent>
        {data.loading ? (
          <LoadingState label={t('adminNew.common.loading')} variant="detail" />
        ) : null}
        {!data.loading && data.error ? (
          <ErrorState message={data.error} onRetry={() => void data.refetch()} />
        ) : null}

        {!data.loading && order ? (
          <>
            <div className="bento-grid lg:grid-cols-3">
              <AdminSectionCard
                className="lg:col-span-2"
                title={t('adminNew.workOrders.detail.overview')}
                icon={Wrench}
                action={<Badge tone={statusTone(status)}>{status}</Badge>}
              >
                <div className="space-y-5">
                  <AdminDetailGrid
                    items={[
                      { label: t('adminNew.workOrders.columns.type'), value: str(order, 'type') || '—' },
                      { label: t('adminNew.workOrders.columns.priority'), value: str(order, 'priority') || 'normal' },
                      {
                        label: t('adminNew.workOrders.columns.due'),
                        value: str(order, 'due_date') ? formatDate(str(order, 'due_date'), dateLocale) : '—',
                      },
                      {
                        label: t('adminNew.workOrders.detail.created'),
                        value: str(order, 'created_at') ? formatDate(str(order, 'created_at'), dateLocale) : '—',
                      },
                    ]}
                  />
                  {str(order, 'description', 'notes') ? (
                    <div className="rounded-xl border border-navy-100/70 bg-sand-50/40 p-4 text-sm text-navy-700">
                      {str(order, 'description', 'notes')}
                    </div>
                  ) : null}
                </div>
              </AdminSectionCard>

              <AdminSectionCard title={t('adminNew.workOrders.detail.boat')} icon={Ship}>
                <div className="space-y-3 text-sm">
                  <div className="font-semibold text-navy-900">
                    {str(order, 'boat_name') || '—'}
                  </div>
                  {boatId ? (
                    <Link
                      href={`/${locale}/admin/boten/${boatId}`}
                      className="inline-flex text-sm font-semibold text-marine-700 hover:text-marine-900"
                    >
                      {t('adminNew.boats.title')} →
                    </Link>
                  ) : null}
                  <Button
                    variant="outline"
                    size="sm"
                    fullWidth
                    leftIcon={<Receipt className="h-4 w-4" />}
                    disabled={invoiceM.loading}
                    onClick={() =>
                      void run(t('adminNew.workOrders.toasts.invoiceCreated'), async () => {
                        const inv = await invoiceM.mutate();
                        if (inv?.id) window.location.href = `/${locale}/admin/facturen/${inv.id}`;
                      })
                    }
                  >
                    {t('adminNew.workOrders.detail.generateInvoice')}
                  </Button>
                </div>
              </AdminSectionCard>
            </div>

            <div className="bento-grid lg:grid-cols-2">
              <AdminSectionCard title={t('adminNew.workOrders.detail.photos')} icon={ImageIcon}>
                {photos.length ? (
                  <div className="grid grid-cols-3 gap-2">
                    {photos.map((p, i) => {
                      const url = str(p, 'url', 'path');
                      return (
                        <a
                          key={str(p, 'id') || i}
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
                ) : (
                  <p className="py-6 text-sm text-navy-500">{t('adminNew.workOrders.detail.noPhotos')}</p>
                )}
              </AdminSectionCard>

              <AdminSectionCard title={t('adminNew.workOrders.detail.documents')} icon={FileText}>
                {documents.length ? (
                  <ul className="divide-y divide-navy-100 rounded-xl border border-navy-100/70">
                    {documents.map((d, i) => (
                      <li key={str(d, 'id') || i} className="flex items-center justify-between px-4 py-3 text-sm">
                        <span className="text-navy-800">{str(d, 'name', 'filename') || `#${i + 1}`}</span>
                        <a
                          href={str(d, 'url', 'path')}
                          target="_blank"
                          rel="noreferrer"
                          className="font-semibold text-marine-700 hover:text-marine-900"
                        >
                          {t('adminNew.invoiceDetail.actions.openPdf')}
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="py-6 text-sm text-navy-500">{t('adminNew.workOrders.detail.noDocuments')}</p>
                )}
              </AdminSectionCard>
            </div>

            <Link
              href={`/${locale}/admin/werkorders`}
              className="inline-flex text-sm font-semibold text-marine-700 hover:text-marine-800"
            >
              {t('adminNew.workOrders.detail.back')}
            </Link>
          </>
        ) : null}
      </AdminContent>

      <Modal open={showAssign} onClose={() => setShowAssign(false)} size="sm">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void run(t('adminNew.workOrders.toasts.assigned'), async () => {
              await assignM.mutate();
              setShowAssign(false);
            });
          }}
        >
          <AdminModalHeader
            title={t('adminNew.workOrders.detail.assign')}
            subtitle={t('adminNew.workOrders.detail.assignSubtitle')}
          />
          <AdminModalBody>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-navy-800">
                {t('adminNew.workOrders.detail.assignee')}
              </label>
              <select
                className="input-base w-full"
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
              >
                <option value="">{t('adminNew.workOrders.detail.unassigned')}</option>
                {technicians.map((tech) => (
                  <option key={tech.id} value={tech.id}>
                    {tech.name}
                  </option>
                ))}
              </select>
            </div>
          </AdminModalBody>
          <AdminModalFooter>
            <Button type="button" variant="ghost" onClick={() => setShowAssign(false)}>
              {t('adminNew.common.cancel')}
            </Button>
            <Button type="submit" variant="gold" disabled={assignM.loading}>
              {t('adminNew.common.save')}
            </Button>
          </AdminModalFooter>
        </form>
      </Modal>

      <Modal open={showComplete} onClose={() => setShowComplete(false)} size="md">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void run(t('adminNew.workOrders.toasts.completed'), async () => {
              await completeM.mutate();
              setShowComplete(false);
            });
          }}
        >
          <AdminModalHeader
            title={t('adminNew.workOrders.detail.complete')}
            subtitle={t('adminNew.workOrders.detail.completeSubtitle')}
          />
          <AdminModalBody>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-navy-800">
                {t('adminNew.workOrders.detail.hours')}
              </label>
              <input
                type="number"
                step="0.25"
                min="0"
                className="input-base w-full"
                value={completeHours}
                onChange={(e) => setCompleteHours(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-navy-800">
                {t('adminNew.workOrders.detail.completionNotes')}
              </label>
              <textarea
                className="input-base min-h-28 w-full"
                value={completeNotes}
                onChange={(e) => setCompleteNotes(e.target.value)}
              />
            </div>
          </AdminModalBody>
          <AdminModalFooter>
            <Button type="button" variant="ghost" onClick={() => setShowComplete(false)}>
              {t('adminNew.common.cancel')}
            </Button>
            <Button type="submit" variant="gold" disabled={completeM.loading}>
              {t('adminNew.workOrders.detail.complete')}
            </Button>
          </AdminModalFooter>
        </form>
      </Modal>
    </>
  );
}
