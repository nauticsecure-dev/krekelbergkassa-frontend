'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Camera, FileText, History, Receipt, Ship, Upload, Warehouse } from 'lucide-react';
import { AdminPageHeader } from '@/components/admin/AdminShell';
import {
  AdminContent,
  AdminSectionCard,
} from '@/components/admin/AdminUi';
import { Button } from '@/components/ui/Button';
import { LoadingState, ErrorState } from '@/components/admin/DataState';
import { useMutation, useQuery } from '@/lib/hooks/useAsync';
import { stallingService } from '@/lib/services';
import { formatCurrency, formatDate } from '@/lib/format';
import { useIntl } from '@/i18n/IntlProvider';
import { useToast } from '@/components/ui/ToastProvider';
import { getApiErrorMessage } from '@/lib/api-error';

type Row = Record<string, unknown>;

const str = (r: Row | undefined, ...keys: string[]): string => {
  if (!r) return '';
  for (const k of keys) {
    const v = r[k];
    if (typeof v === 'string' && v.trim()) return v;
    if (typeof v === 'number') return String(v);
  }
  return '';
};

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-widest text-navy-400">{label}</div>
      <div className="mt-0.5 font-medium text-navy-900">{value ?? '—'}</div>
    </div>
  );
}

export default function StallingDetailPage() {
  const { locale, t } = useIntl();
  const { push } = useToast();
  const params = useParams();
  const id = String(params.id);
  const dateLocale = locale === 'en' ? 'en-GB' : locale === 'de' ? 'de-DE' : 'nl-NL';

  const [auditPage, setAuditPage] = React.useState(1);
  const photoInputRef = React.useRef<HTMLInputElement | null>(null);
  const docInputRef = React.useRef<HTMLInputElement | null>(null);

  const dossier = useQuery([id], () => stallingService.dossier(id));
  const logs = useQuery([id, 'logs', auditPage], () =>
    stallingService.logs(id, { per_page: 25, page: auditPage }).catch(() => null)
  );
  const uploadPhoto = useMutation((fd: FormData) => stallingService.uploadPhoto(id, fd));
  const uploadDoc = useMutation((fd: FormData) => stallingService.uploadDocument(id, fd));

  const data = (dossier.data ?? {}) as Row;
  const contract = (data.contract ?? data ?? {}) as Row;
  const boat = (contract.boat ?? data.boat ?? {}) as Row;
  const customer = (contract.customer ?? data.customer ?? {}) as Row;
  const invoices = ((data.invoices ?? data.financial ?? []) as Row[]) ?? [];
  const photos = (data.photos ?? []) as Row[];
  const documents = (data.documents ?? []) as Row[];
  const auditRows = (logs.data?.data ?? []) as unknown as Row[];

  const onUpload = async (kind: 'photo' | 'document', file: File | undefined) => {
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    try {
      if (kind === 'photo') await uploadPhoto.mutate(fd);
      else await uploadDoc.mutate(fd);
      await dossier.refetch();
      push({ tone: 'success', title: t('adminNew.boats.toasts.fileUploaded') });
    } catch (err) {
      push({ tone: 'error', title: t('adminNew.common.operationFailed'), message: getApiErrorMessage(err) });
    }
  };

  return (
    <>
      <AdminPageHeader
        title={str(contract, 'contract_number') || t('adminNew.stalling.title')}
        subtitle={str(boat, 'name') || t('adminNew.stalling.subtitle')}
        rightSlot={
          <Link href={`/${locale}/admin/stalling`}>
            <Button variant="outline" size="sm" leftIcon={<ArrowLeft className="h-4 w-4" />}>
              {t('adminNew.common.back')}
            </Button>
          </Link>
        }
        stats={[
          {
            label: t('adminNew.stalling.columns.type'),
            value: str(contract, 'type') || '—',
            icon: Warehouse,
            tone: 'marine',
            loading: dossier.loading,
          },
          {
            label: t('adminNew.stalling.fields.location'),
            value: str(contract, 'location_code', 'bok_number') || '—',
            icon: Ship,
            tone: 'gold',
          },
          {
            label: t('adminNew.stalling.columns.paidUntil'),
            value: str(contract, 'paid_until') ? formatDate(str(contract, 'paid_until'), dateLocale) : '—',
            tone: 'navy',
          },
          {
            label: t('adminNew.stalling.quickEdit.statusLabel'),
            value: str(contract, 'status', 'payment_status') || '—',
            tone: 'success',
          },
        ]}
      />

      <AdminContent>
        {dossier.loading ? <LoadingState label={t('adminNew.common.loading')} variant="detail" /> : null}
        {dossier.error ? <ErrorState message={dossier.error} onRetry={() => void dossier.refetch()} /> : null}

        {!dossier.loading && !dossier.error ? (
          <>
            <div className="grid gap-5 lg:grid-cols-2">
              <AdminSectionCard title={t('adminNew.stalling.tabs.overview') ?? 'Overview'} icon={Warehouse}>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <Field label={t('adminNew.stalling.columns.type')} value={str(contract, 'type') || '—'} />
                  <Field label={t('adminNew.stalling.fields.startDate')} value={str(contract, 'start_date') ? formatDate(str(contract, 'start_date'), dateLocale) : '—'} />
                  <Field label={t('adminNew.stalling.fields.endDate')} value={str(contract, 'end_date') ? formatDate(str(contract, 'end_date'), dateLocale) : '—'} />
                  <Field label={t('adminNew.stalling.columns.paidUntil')} value={str(contract, 'paid_until') ? formatDate(str(contract, 'paid_until'), dateLocale) : '—'} />
                  <Field label={t('adminNew.stalling.fields.location')} value={str(contract, 'location_code') || '—'} />
                  <Field label={t('adminNew.stalling.fields.bokNumber')} value={str(contract, 'bok_number') || '—'} />
                </div>
              </AdminSectionCard>

              <AdminSectionCard title={t('adminNew.stalling.columns.customer')} icon={Ship}>
                <div className="space-y-2 text-sm">
                  <Field label={t('adminNew.common.name')} value={str(customer, 'name') || '—'} />
                  {customer.id ? (
                    <Link href={`/${locale}/admin/klanten/${customer.id}`} className="text-sm font-semibold text-marine-700 hover:text-marine-900">
                      {t('adminNew.customers.details')} →
                    </Link>
                  ) : null}
                  {boat.id ? (
                    <Link href={`/${locale}/admin/boten/${boat.id}`} className="block text-sm font-semibold text-marine-700 hover:text-marine-900">
                      {str(boat, 'name')} →
                    </Link>
                  ) : null}
                </div>
              </AdminSectionCard>
            </div>

            <AdminSectionCard title={t('admin.sidebar.invoices')} icon={Receipt} className="mt-5">
              {invoices.length === 0 ? (
                <p className="text-sm text-navy-500">{t('adminNew.invoices.emptyMessage')}</p>
              ) : (
                <div className="space-y-2">
                  {invoices.map((inv, i) => (
                    <Link
                      key={str(inv, 'id') || i}
                      href={`/${locale}/admin/facturen/${inv.id}`}
                      className="flex items-center justify-between rounded-lg border border-navy-100 px-3 py-2 text-sm hover:bg-sand-50"
                    >
                      <span className="font-semibold text-navy-900">{str(inv, 'invoice_number') || str(inv, 'id')}</span>
                      <span>{formatCurrency(Number(inv.total_amount ?? inv.total_amount_cents ?? 0) / 100, dateLocale)}</span>
                    </Link>
                  ))}
                </div>
              )}
            </AdminSectionCard>

            <div className="mt-5 grid gap-5 lg:grid-cols-2">
              <AdminSectionCard
                title={t('adminNew.boats.tabs.photos')}
                icon={Camera}
                action={
                  <>
                    <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { void onUpload('photo', e.target.files?.[0]); e.target.value = ''; }} />
                    <Button size="sm" variant="outline" leftIcon={<Upload className="h-3.5 w-3.5" />} disabled={uploadPhoto.loading} onClick={() => photoInputRef.current?.click()}>
                      {t('adminNew.common.add')}
                    </Button>
                  </>
                }
              >
                {photos.length === 0 ? (
                  <p className="text-sm text-navy-500">{t('adminNew.boats.noPhotos')}</p>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {photos.map((p, i) => {
                      const url = str(p, 'signed_url', 'url');
                      return (
                        <a key={str(p, 'file_id', 'id') || i} href={url} target="_blank" rel="noreferrer" className="aspect-square overflow-hidden rounded-lg border border-navy-100 bg-sand-50">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={url} alt="" className="h-full w-full object-cover" />
                        </a>
                      );
                    })}
                  </div>
                )}
              </AdminSectionCard>

              <AdminSectionCard
                title={t('adminNew.boats.tabs.documents')}
                icon={FileText}
                action={
                  <>
                    <input ref={docInputRef} type="file" className="hidden" onChange={(e) => { void onUpload('document', e.target.files?.[0]); e.target.value = ''; }} />
                    <Button size="sm" variant="outline" leftIcon={<Upload className="h-3.5 w-3.5" />} disabled={uploadDoc.loading} onClick={() => docInputRef.current?.click()}>
                      {t('adminNew.common.add')}
                    </Button>
                  </>
                }
              >
                {documents.length === 0 ? (
                  <p className="text-sm text-navy-500">{t('adminNew.boats.noDocuments')}</p>
                ) : (
                  <ul className="divide-y divide-navy-100 rounded-xl border border-navy-100/70">
                    {documents.map((d, i) => (
                      <li key={str(d, 'file_id', 'id') || i} className="flex items-center justify-between px-4 py-3 text-sm">
                        <span className="text-navy-800">{str(d, 'filename', 'name') || `#${i + 1}`}</span>
                        <a href={str(d, 'signed_url', 'url')} target="_blank" rel="noreferrer" className="font-semibold text-marine-700 hover:text-marine-900">
                          {t('adminNew.invoiceDetail.actions.openPdf')}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </AdminSectionCard>
            </div>

            <AdminSectionCard title={t('admin.sidebar.audit')} icon={History} className="mt-5">
              {logs.loading ? (
                <LoadingState label={t('adminNew.common.loading')} variant="table" />
              ) : auditRows.length === 0 ? (
                <p className="text-sm text-navy-500">{t('adminNew.stalling.auditEmptyMessage')}</p>
              ) : (
                <>
                  <div className="space-y-2">
                    {auditRows.map((log, i) => {
                      const changes = (log.changes as Array<{ field_name?: string; old_value?: unknown; new_value?: unknown }> | undefined) ?? [];
                      return (
                        <div key={str(log, 'id') || i} className="rounded-lg border border-navy-100 px-3 py-2 text-sm">
                          <div className="font-medium text-navy-900">{str(log, 'action')}</div>
                          {changes.map((c, j) => (
                            <div key={j} className="text-xs text-navy-600">
                              {c.field_name}: <span className="text-rose-600">{String(c.old_value ?? '—')}</span> →{' '}
                              <span className="text-emerald-700">{String(c.new_value ?? '—')}</span>
                            </div>
                          ))}
                          {str(log, 'reason') ? <div className="text-xs italic text-navy-500">{str(log, 'reason')}</div> : null}
                          <div className="text-xs text-navy-400">
                            {str(log, 'created_at') ? formatDate(str(log, 'created_at'), dateLocale) : ''} ·{' '}
                            {(log.user as { name?: string } | undefined)?.name ?? '—'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {logs.data?.meta && (logs.data.meta.last_page ?? 1) > 1 ? (
                    <div className="mt-3 flex items-center justify-center gap-2">
                      <Button size="sm" variant="ghost" disabled={auditPage <= 1} onClick={() => setAuditPage((p) => p - 1)}>
                        ←
                      </Button>
                      <span className="text-xs text-navy-500">
                        {auditPage} / {logs.data.meta.last_page ?? 1}
                      </span>
                      <Button size="sm" variant="ghost" disabled={auditPage >= (logs.data.meta.last_page ?? 1)} onClick={() => setAuditPage((p) => p + 1)}>
                        →
                      </Button>
                    </div>
                  ) : null}
                </>
              )}
            </AdminSectionCard>
          </>
        ) : null}
      </AdminContent>
    </>
  );
}
