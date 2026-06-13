'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Anchor,
  ArrowLeft,
  Camera,
  FileText,
  History,
  QrCode,
  Ship,
  Upload,
  UserCog,
  Warehouse,
} from 'lucide-react';
import { AdminPageHeader } from '@/components/admin/AdminShell';
import {
  AdminContent,
  AdminModalBody,
  AdminModalFooter,
  AdminModalHeader,
  AdminSectionCard,
  AdminStatusStrip,
} from '@/components/admin/AdminUi';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { LoadingState, ErrorState } from '@/components/admin/DataState';
import { useMutation, useQuery } from '@/lib/hooks/useAsync';
import { auditService, boatsService, customersService } from '@/lib/services';
import { formatCurrency, formatDate } from '@/lib/format';
import { useIntl } from '@/i18n/IntlProvider';
import { useToast } from '@/components/ui/ToastProvider';
import { getApiErrorMessage } from '@/lib/api-error';

export default function BoatDossierPage() {
  const { locale, t } = useIntl();
  const { push } = useToast();
  const params = useParams();
  const id = String(params.id);
  const dateLocale = locale === 'en' ? 'en-GB' : 'nl-NL';

  const [showEdit, setShowEdit] = React.useState(false);
  const [showTransfer, setShowTransfer] = React.useState(false);
  const [transferForm, setTransferForm] = React.useState({ customer_id: '', transfer_reason: '', ownership_notes: '' });
  const emptyForm = {
    name: '',
    length_cm: '',
    width_cm: '',
    location_code: '',
    type: 'motor',
    brand: '',
    model: '',
    build_year: '',
    engine_brand: '',
    engine_type: '',
    insurance_number: '',
    mmsi_number: '',
  };
  const [form, setForm] = React.useState(emptyForm);
  const photoInputRef = React.useRef<HTMLInputElement | null>(null);
  const docInputRef = React.useRef<HTMLInputElement | null>(null);
  const [photoFolder, setPhotoFolder] = React.useState('arrival');
  const [docCategory, setDocCategory] = React.useState('insurance');

  const dossier = useQuery([id], () => boatsService.dossier(id));
  const audit = useQuery([id, 'audit'], () =>
    boatsService.auditLog(id, { per_page: 25 }).catch(() => auditService.byEntity('boat', id).then((a) => ({ data: a })))
  );
  const customers = useQuery(['transfer-customers'], () => customersService.list({ per_page: 200 }));
  const updateBoat = useMutation((payload: Record<string, unknown>) =>
    boatsService.update(id, payload)
  );
  const transferBoat = useMutation((payload: { customer_id: string; transfer_reason?: string; ownership_notes?: string }) =>
    boatsService.transfer(id, payload)
  );
  const uploadPhoto = useMutation((fd: FormData) => boatsService.uploadPhoto(id, fd));
  const uploadDoc = useMutation((fd: FormData) => boatsService.uploadDocument(id, fd));

  React.useEffect(() => {
    const b = dossier.data?.boat as Record<string, unknown> | undefined;
    if (!b) return;
    setForm({
      name: String(b.name ?? ''),
      length_cm: b.length_cm != null ? String(b.length_cm) : '',
      width_cm: b.width_cm != null ? String(b.width_cm) : '',
      location_code: String(b.location_code ?? ''),
      type: String(b.type ?? 'motor'),
      brand: String(b.brand ?? ''),
      model: String(b.model ?? ''),
      build_year: b.build_year != null ? String(b.build_year) : '',
      engine_brand: String(b.engine_brand ?? ''),
      engine_type: String(b.engine_type ?? ''),
      insurance_number: String(b.insurance_number ?? ''),
      mmsi_number: String(b.mmsi_number ?? ''),
    });
  }, [dossier.data]);

  const boat = (dossier.data?.boat ?? {}) as Record<string, unknown>;
  const owner = (dossier.data?.owner ?? {}) as Record<string, unknown>;
  const storage = (dossier.data?.storage_contracts ?? []) as Array<Record<string, unknown>>;
  const invoices = ((dossier.data?.financial as Record<string, unknown>)?.invoices ??
    []) as Array<Record<string, unknown>>;
  const workOrders = (dossier.data?.work_orders ?? []) as Array<Record<string, unknown>>;
  // Trello #87: stats, QR, ownership history, photos, documents, timeline.
  const stats = (dossier.data?.stats ?? {}) as Record<string, unknown>;
  const qr = (dossier.data?.qr ?? {}) as Record<string, unknown>;
  const ownershipHistory = (dossier.data?.ownership_history ?? []) as Array<Record<string, unknown>>;
  const photos = (dossier.data?.photos ?? []) as Array<Record<string, unknown>>;
  const documents = (dossier.data?.documents ?? []) as Array<Record<string, unknown>>;
  const timeline = (dossier.data?.timeline ?? []) as Array<Record<string, unknown>>;
  const auditRows = ((audit.data as unknown as { data?: Array<Record<string, unknown>> } | undefined)?.data ??
    []) as Array<Record<string, unknown>>;

  const [tab, setTab] = React.useState<
    'overview' | 'ownership' | 'storage' | 'financial' | 'workOrders' | 'photos' | 'documents' | 'timeline' | 'history'
  >('overview');
  const tabs = [
    { id: 'overview' as const, label: t('adminNew.boats.tabs.overview') },
    { id: 'ownership' as const, label: t('adminNew.boats.tabs.ownership'), count: ownershipHistory.length },
    { id: 'storage' as const, label: t('adminNew.boats.tabs.storage'), count: storage.length },
    { id: 'financial' as const, label: t('adminNew.boats.tabs.financial'), count: invoices.length },
    { id: 'workOrders' as const, label: t('adminNew.boats.tabs.workOrders'), count: workOrders.length },
    { id: 'photos' as const, label: t('adminNew.boats.tabs.photos'), count: photos.length },
    { id: 'documents' as const, label: t('adminNew.boats.tabs.documents'), count: documents.length },
    { id: 'timeline' as const, label: t('adminNew.boats.tabs.timeline'), count: timeline.length },
    { id: 'history' as const, label: t('adminNew.boats.tabs.history') },
  ];

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateBoat.mutate({
        name: form.name,
        type: form.type,
        length_cm: form.length_cm ? Number(form.length_cm) : null,
        width_cm: form.width_cm ? Number(form.width_cm) : null,
        location_code: form.location_code || null,
        brand: form.brand || null,
        model: form.model || null,
        build_year: form.build_year ? Number(form.build_year) : null,
        engine_brand: form.engine_brand || null,
        engine_type: form.engine_type || null,
        insurance_number: form.insurance_number || null,
        mmsi_number: form.mmsi_number || null,
      });
      setShowEdit(false);
      await dossier.refetch();
      push({ tone: 'success', title: t('adminNew.boats.toasts.updated') });
    } catch (err) {
      push({
        tone: 'error',
        title: t('adminNew.boats.toasts.updateFailed'),
        message: getApiErrorMessage(err),
      });
    }
  };

  const onTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await transferBoat.mutate({
        customer_id: transferForm.customer_id,
        transfer_reason: transferForm.transfer_reason || undefined,
        ownership_notes: transferForm.ownership_notes || undefined,
      });
      setShowTransfer(false);
      setTransferForm({ customer_id: '', transfer_reason: '', ownership_notes: '' });
      await dossier.refetch();
      push({ tone: 'success', title: t('adminNew.boats.toasts.transferred') });
    } catch (err) {
      push({ tone: 'error', title: t('adminNew.common.operationFailed'), message: getApiErrorMessage(err) });
    }
  };

  const onUpload = async (kind: 'photo' | 'document', file: File | undefined) => {
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    if (kind === 'photo') fd.append('folder', photoFolder);
    else fd.append('category', docCategory);
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
        title={String(boat.name ?? t('adminNew.boats.title'))}
        subtitle={t('adminNew.boats.dossierSubtitle')}
        rightSlot={
          <div className="flex gap-2">
            <Link href={`/${locale}/admin/boten`}>
              <Button variant="outline" size="sm" leftIcon={<ArrowLeft className="h-4 w-4" />}>
                {t('adminNew.common.back')}
              </Button>
            </Link>
            <Button variant="outline" size="sm" leftIcon={<UserCog className="h-4 w-4" />} onClick={() => setShowTransfer(true)}>
              {t('adminNew.boats.transfer')}
            </Button>
            <Button variant="gold" size="sm" onClick={() => setShowEdit(true)}>
              {t('adminNew.common.edit')}
            </Button>
          </div>
        }
        stats={[
          {
            label: t('adminNew.boats.stats.daysInStorage'),
            value: stats.days_in_storage != null ? String(stats.days_in_storage) : '—',
            icon: Warehouse,
            tone: 'marine',
            loading: dossier.loading,
          },
          {
            label: t('adminNew.boats.stats.revenue'),
            value: formatCurrency(Number(stats.revenue_cents ?? 0) / 100, dateLocale),
            icon: FileText,
            tone: 'gold',
          },
          {
            label: t('adminNew.workOrders.title'),
            value: stats.work_order_count != null ? String(stats.work_order_count) : workOrders.length,
            icon: Anchor,
            tone: 'navy',
          },
          {
            label: t('admin.sidebar.invoices'),
            value: stats.invoice_count != null ? String(stats.invoice_count) : invoices.length,
            icon: FileText,
            tone: 'success',
          },
        ]}
      />

      <AdminContent>
        {dossier.loading ? <LoadingState label={t('adminNew.common.loading')} /> : null}
        {dossier.error ? (
          <ErrorState message={dossier.error} onRetry={() => void dossier.refetch()} />
        ) : null}

        {!dossier.loading && !dossier.error ? (
          <>
            <div className="mb-5 flex flex-wrap gap-1 border-b border-navy-100">
              {tabs.map((tb) => (
                <button
                  key={tb.id}
                  type="button"
                  onClick={() => setTab(tb.id)}
                  className={
                    '-mb-px inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition ' +
                    (tab === tb.id
                      ? 'border-marine-600 text-marine-700'
                      : 'border-transparent text-navy-500 hover:text-navy-800')
                  }
                >
                  {tb.label}
                  {typeof tb.count === 'number' ? (
                    <span
                      className={
                        'rounded-full px-1.5 py-0.5 text-[10px] font-semibold ' +
                        (tab === tb.id ? 'bg-marine-100 text-marine-700' : 'bg-navy-100 text-navy-500')
                      }
                    >
                      {tb.count}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>

            {tab === 'overview' ? (
              <div className="grid gap-5 lg:grid-cols-2">
                <AdminSectionCard title={t('adminNew.boats.columns.owner')} icon={Ship}>
                  <div className="space-y-2 text-sm">
                    <AdminStatusStrip label={t('adminNew.common.name')} value={String(owner.name ?? '—')} tone="marine" />
                    {owner.id ? (
                      <Link
                        href={`/${locale}/admin/klanten/${owner.id}`}
                        className="text-sm font-semibold text-marine-700 hover:text-marine-900"
                      >
                        {t('adminNew.customers.details')} →
                      </Link>
                    ) : null}
                  </div>
                </AdminSectionCard>
                <AdminSectionCard title={t('adminNew.boats.tabs.overview')} icon={Anchor}>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <Field label={t('adminNew.boats.columns.type')} value={String(boat.type ?? '—')} />
                    <Field label={t('adminNew.boats.fields.brand')} value={String(boat.brand ?? '—')} />
                    <Field label={t('adminNew.boats.fields.model')} value={String(boat.model ?? '—')} />
                    <Field label={t('adminNew.boats.fields.buildYear')} value={String(boat.build_year ?? '—')} />
                    <Field label={t('adminNew.boats.columns.length')} value={boat.length_cm ? `${boat.length_cm} cm` : '—'} />
                    <Field label={t('adminNew.boats.fields.widthCm')} value={boat.width_cm ? `${boat.width_cm} cm` : '—'} />
                    <Field label={t('adminNew.boats.fields.engineBrand')} value={String(boat.engine_brand ?? '—')} />
                    <Field label={t('adminNew.boats.fields.engineType')} value={String(boat.engine_type ?? '—')} />
                    <Field label={t('adminNew.boats.fields.mmsi')} value={String(boat.mmsi_number ?? '—')} />
                    <Field label={t('adminNew.boats.fields.insuranceNumber')} value={String(boat.insurance_number ?? '—')} />
                    <Field label={t('adminNew.boats.columns.location')} value={String(boat.location_code ?? '—')} />
                  </div>
                </AdminSectionCard>

                {qr.payload || boat.qr_code ? (
                  <AdminSectionCard title={t('adminNew.boats.qrTitle')} icon={QrCode}>
                    <div className="flex flex-col items-center gap-3 text-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                          String(qr.dossier_url ?? qr.payload ?? boat.qr_code ?? '')
                        )}`}
                        alt="Boat QR"
                        className="rounded-lg border border-navy-100"
                      />
                      <div className="font-mono text-sm text-navy-700">
                        {String(qr.payload ?? boat.qr_code ?? '')}
                      </div>
                      <Button size="sm" variant="outline" onClick={() => window.print()}>
                        {t('adminNew.boats.printLabel')}
                      </Button>
                    </div>
                  </AdminSectionCard>
                ) : null}
              </div>
            ) : null}

            {tab === 'ownership' ? (
              <AdminSectionCard title={t('adminNew.boats.tabs.ownership')} icon={UserCog}>
                <div className="mb-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                  <Field label={t('adminNew.common.name')} value={String(owner.name ?? '—')} />
                  <Field label={t('adminNew.customers.columns.email')} value={String(owner.email ?? '—')} />
                  <Field label={t('adminNew.customers.columns.phone')} value={String(owner.phone ?? '—')} />
                </div>
                <h4 className="mb-2 text-xs font-bold uppercase tracking-widest text-navy-400">
                  {t('adminNew.boats.ownershipHistory')}
                </h4>
                {ownershipHistory.length === 0 ? (
                  <p className="text-sm text-navy-500">{t('adminNew.boats.noOwnershipHistory')}</p>
                ) : (
                  <ul className="space-y-2">
                    {ownershipHistory.map((o, i) => (
                      <li key={String(o.id ?? i)} className="flex items-center justify-between rounded-lg border border-navy-100 px-3 py-2 text-sm">
                        <span className="font-medium text-navy-900">
                          {String((o.customer as { name?: string } | undefined)?.name ?? o.customer_name ?? o.customer_id ?? '—')}
                        </span>
                        <span className="text-xs text-navy-500">
                          {o.started_on ? formatDate(String(o.started_on), dateLocale) : ''}
                          {o.is_current ? ` · ${t('adminNew.boats.currentOwner')}` : o.ended_on ? ` – ${formatDate(String(o.ended_on), dateLocale)}` : ''}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </AdminSectionCard>
            ) : null}

            {tab === 'photos' ? (
              <AdminSectionCard
                title={t('adminNew.boats.tabs.photos')}
                icon={Camera}
                action={
                  <div className="flex items-center gap-2">
                    <select className="input-base h-8 py-0 text-xs" value={photoFolder} onChange={(e) => setPhotoFolder(e.target.value)}>
                      {['arrival', 'inspection', 'maintenance', 'damage', 'departure'].map((f) => (
                        <option key={f} value={f}>{t(`adminNew.boats.photoFolders.${f}`)}</option>
                      ))}
                    </select>
                    <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { void onUpload('photo', e.target.files?.[0]); e.target.value = ''; }} />
                    <Button size="sm" variant="outline" leftIcon={<Upload className="h-3.5 w-3.5" />} disabled={uploadPhoto.loading} onClick={() => photoInputRef.current?.click()}>
                      {t('adminNew.common.add')}
                    </Button>
                  </div>
                }
              >
                {photos.length === 0 ? (
                  <p className="text-sm text-navy-500">{t('adminNew.boats.noPhotos')}</p>
                ) : (
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {photos.map((p, i) => {
                      const url = String(p.signed_url ?? p.url ?? '');
                      return (
                        <a key={String(p.file_id ?? p.id ?? i)} href={url} target="_blank" rel="noreferrer" className="aspect-square overflow-hidden rounded-lg border border-navy-100 bg-sand-50">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={url} alt="" className="h-full w-full object-cover" />
                        </a>
                      );
                    })}
                  </div>
                )}
              </AdminSectionCard>
            ) : null}

            {tab === 'documents' ? (
              <AdminSectionCard
                title={t('adminNew.boats.tabs.documents')}
                icon={FileText}
                action={
                  <div className="flex items-center gap-2">
                    <select className="input-base h-8 py-0 text-xs" value={docCategory} onChange={(e) => setDocCategory(e.target.value)}>
                      {['insurance', 'registration', 'ce_certificate', 'purchase_agreement', 'survey', 'other'].map((c) => (
                        <option key={c} value={c}>{t(`adminNew.boats.docCategories.${c}`)}</option>
                      ))}
                    </select>
                    <input ref={docInputRef} type="file" className="hidden" onChange={(e) => { void onUpload('document', e.target.files?.[0]); e.target.value = ''; }} />
                    <Button size="sm" variant="outline" leftIcon={<Upload className="h-3.5 w-3.5" />} disabled={uploadDoc.loading} onClick={() => docInputRef.current?.click()}>
                      {t('adminNew.common.add')}
                    </Button>
                  </div>
                }
              >
                {documents.length === 0 ? (
                  <p className="text-sm text-navy-500">{t('adminNew.boats.noDocuments')}</p>
                ) : (
                  <ul className="divide-y divide-navy-100 rounded-xl border border-navy-100/70">
                    {documents.map((d, i) => (
                      <li key={String(d.file_id ?? d.id ?? i)} className="flex items-center justify-between px-4 py-3 text-sm">
                        <span className="text-navy-800">
                          {String(d.filename ?? d.name ?? `#${i + 1}`)}
                          {d.category ? <span className="ml-2 text-xs text-navy-400">{t(`adminNew.boats.docCategories.${String(d.category)}`)}</span> : null}
                          {d.version ? <span className="ml-2 text-xs text-navy-400">v{String(d.version)}</span> : null}
                        </span>
                        <a href={String(d.signed_url ?? d.url ?? '')} target="_blank" rel="noreferrer" className="font-semibold text-marine-700 hover:text-marine-900">
                          {t('adminNew.invoiceDetail.actions.openPdf')}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </AdminSectionCard>
            ) : null}

            {tab === 'timeline' ? (
              <AdminSectionCard title={t('adminNew.boats.tabs.timeline')} icon={History}>
                {timeline.length === 0 ? (
                  <p className="text-sm text-navy-500">{t('adminNew.boats.noTimeline')}</p>
                ) : (
                  <ol className="space-y-2">
                    {timeline.map((item, i) => (
                      <li key={String(item.id ?? i)} className="flex items-start gap-3 text-sm">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-marine-400" />
                        <div>
                          <div className="text-navy-800">{String(item.title ?? item.message ?? item.type ?? '—')}</div>
                          <div className="text-xs text-navy-400">{item.created_at ? formatDate(String(item.created_at), dateLocale) : ''}</div>
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </AdminSectionCard>
            ) : null}

            {tab === 'storage' ? (
              <AdminSectionCard title={t('adminNew.stalling.title')} icon={Warehouse}>
                <div className="space-y-2">
                  {storage.length === 0 ? (
                    <p className="text-sm text-navy-500">{t('adminNew.stalling.emptyMessage')}</p>
                  ) : (
                    storage.map((c) => (
                      <div key={String(c.id)} className="rounded-lg border border-navy-100 px-3 py-2 text-sm">
                        <div className="font-semibold text-navy-900">{String(c.contract_number ?? '—')}</div>
                        <div className="text-navy-500">{String(c.status ?? '')}</div>
                      </div>
                    ))
                  )}
                </div>
              </AdminSectionCard>
            ) : null}

            {tab === 'financial' ? (
              <AdminSectionCard title={t('admin.sidebar.invoices')} icon={FileText}>
                <div className="space-y-2">
                  {invoices.length === 0 ? (
                    <p className="text-sm text-navy-500">{t('adminNew.invoices.emptyMessage')}</p>
                  ) : (
                    invoices.map((inv) => (
                      <Link
                        key={String(inv.id)}
                        href={`/${locale}/admin/facturen/${inv.id}`}
                        className="flex items-center justify-between rounded-lg border border-navy-100 px-3 py-2 text-sm hover:bg-sand-50"
                      >
                        <span className="font-semibold text-navy-900">{String(inv.invoice_number ?? inv.id)}</span>
                        <span>{formatCurrency(Number(inv.total_amount ?? 0) / 100, dateLocale)}</span>
                      </Link>
                    ))
                  )}
                </div>
              </AdminSectionCard>
            ) : null}

            {tab === 'workOrders' ? (
              <AdminSectionCard title={t('adminNew.workOrders.title')} icon={FileText}>
                <div className="space-y-2">
                  {workOrders.length === 0 ? (
                    <p className="text-sm text-navy-500">{t('adminNew.workOrders.emptyMessage')}</p>
                  ) : (
                    workOrders.map((wo) => (
                      <Link
                        key={String(wo.id)}
                        href={`/${locale}/admin/werkorders/${wo.id}`}
                        className="flex items-center justify-between rounded-lg border border-navy-100 px-3 py-2 text-sm hover:bg-sand-50"
                      >
                        <span className="font-semibold text-navy-900">
                          {String(wo.number ?? wo.id)}
                          <span className="ml-2 font-normal text-navy-500">{String(wo.type ?? '')}</span>
                        </span>
                        <span className="text-navy-500">{String(wo.status ?? '')}</span>
                      </Link>
                    ))
                  )}
                </div>
              </AdminSectionCard>
            ) : null}

            {tab === 'history' ? (
              <AdminSectionCard title={t('admin.sidebar.audit')} icon={Anchor}>
                <div className="space-y-2">
                  {auditRows.length === 0 ? (
                    <p className="text-sm text-navy-500">{t('adminNew.stalling.auditEmptyMessage')}</p>
                  ) : (
                    auditRows.slice(0, 25).map((log, i) => {
                      const changes = (log.changes as Array<{ field_name?: string; old_value?: unknown; new_value?: unknown }> | undefined) ?? [];
                      return (
                        <div key={String(log.id ?? i)} className="rounded-lg border border-navy-100 px-3 py-2 text-sm">
                          <div className="font-medium text-navy-900">{String(log.action ?? '—')}</div>
                          {changes.map((c, j) => (
                            <div key={j} className="text-xs text-navy-600">
                              {c.field_name}: <span className="text-rose-600">{String(c.old_value ?? '—')}</span> →{' '}
                              <span className="text-emerald-700">{String(c.new_value ?? '—')}</span>
                            </div>
                          ))}
                          <div className="text-xs text-navy-400">
                            {log.created_at ? formatDate(String(log.created_at), dateLocale) : ''} ·{' '}
                            {(log.user as { name?: string } | undefined)?.name ?? '—'}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </AdminSectionCard>
            ) : null}
          </>
        ) : null}
      </AdminContent>

      <Modal open={showEdit} onClose={() => setShowEdit(false)} size="md">
        <form onSubmit={onSave}>
          <AdminModalHeader title={t('adminNew.boats.editTitle')} subtitle={t('adminNew.boats.editSubtitle')} />
          <AdminModalBody>
            <Input label={t('adminNew.common.name')} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <div className="grid gap-3 sm:grid-cols-2">
              <Input label={t('adminNew.boats.fields.brand')} value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
              <Input label={t('adminNew.boats.fields.model')} value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} />
              <Input label={t('adminNew.boats.fields.buildYear')} type="number" value={form.build_year} onChange={(e) => setForm({ ...form, build_year: e.target.value })} />
              <Input label={t('adminNew.boats.columns.length')} value={form.length_cm} onChange={(e) => setForm({ ...form, length_cm: e.target.value })} type="number" />
              <Input label={t('adminNew.boats.fields.widthCm')} value={form.width_cm} onChange={(e) => setForm({ ...form, width_cm: e.target.value })} type="number" />
              <Input label={t('adminNew.boats.columns.location')} value={form.location_code} onChange={(e) => setForm({ ...form, location_code: e.target.value })} />
              <Input label={t('adminNew.boats.fields.engineBrand')} value={form.engine_brand} onChange={(e) => setForm({ ...form, engine_brand: e.target.value })} />
              <Input label={t('adminNew.boats.fields.engineType')} value={form.engine_type} onChange={(e) => setForm({ ...form, engine_type: e.target.value })} />
              <Input label={t('adminNew.boats.fields.mmsi')} value={form.mmsi_number} onChange={(e) => setForm({ ...form, mmsi_number: e.target.value })} />
              <Input label={t('adminNew.boats.fields.insuranceNumber')} value={form.insurance_number} onChange={(e) => setForm({ ...form, insurance_number: e.target.value })} />
            </div>
          </AdminModalBody>
          <AdminModalFooter>
            <Button type="button" variant="ghost" onClick={() => setShowEdit(false)}>{t('adminNew.common.cancel')}</Button>
            <Button type="submit" variant="gold" disabled={updateBoat.loading}>{t('adminNew.common.save')}</Button>
          </AdminModalFooter>
        </form>
      </Modal>

      <Modal open={showTransfer} onClose={() => setShowTransfer(false)} size="md">
        <form onSubmit={onTransfer}>
          <AdminModalHeader title={t('adminNew.boats.transfer')} subtitle={t('adminNew.boats.transferSubtitle')} />
          <AdminModalBody>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-navy-800">{t('adminNew.boats.newOwner')}</label>
              <select className="input-base w-full" value={transferForm.customer_id} onChange={(e) => setTransferForm({ ...transferForm, customer_id: e.target.value })} required>
                <option value="">{t('adminNew.kassa.selectCustomer')}</option>
                {(customers.data?.data ?? []).map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <Input label={t('adminNew.boats.transferReason')} value={transferForm.transfer_reason} onChange={(e) => setTransferForm({ ...transferForm, transfer_reason: e.target.value })} placeholder="sale" />
            <div>
              <label className="mb-1.5 block text-sm font-medium text-navy-800">{t('adminNew.boats.ownershipNotes')}</label>
              <textarea className="input-base min-h-20 w-full" value={transferForm.ownership_notes} onChange={(e) => setTransferForm({ ...transferForm, ownership_notes: e.target.value })} />
            </div>
          </AdminModalBody>
          <AdminModalFooter>
            <Button type="button" variant="ghost" onClick={() => setShowTransfer(false)}>{t('adminNew.common.cancel')}</Button>
            <Button type="submit" variant="gold" disabled={transferBoat.loading}>{t('adminNew.boats.transfer')}</Button>
          </AdminModalFooter>
        </form>
      </Modal>
    </>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-widest text-navy-400">{label}</div>
      <div className="mt-0.5 font-medium text-navy-900">{value}</div>
    </div>
  );
}
