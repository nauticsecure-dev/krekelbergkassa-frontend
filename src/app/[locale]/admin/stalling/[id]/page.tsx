'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  Camera,
  CheckSquare,
  FileText,
  History,
  Pencil,
  Receipt,
  Save,
  Send,
  Ship,
  Upload,
  Warehouse,
} from 'lucide-react';
import { AdminPageHeader } from '@/components/admin/AdminShell';
import {
  AdminContent,
  AdminModalBody,
  AdminModalFooter,
  AdminModalHeader,
  AdminSectionCard,
  AdminSelect,
  AdminTable,
  AdminTableCard,
  AdminTableCell,
  AdminTableHead,
  AdminTableHeaderCell,
  AdminTableRow,
} from '@/components/admin/AdminUi';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { LoadingState, ErrorState, EmptyState } from '@/components/admin/DataState';
import { useMutation, useQuery } from '@/lib/hooks/useAsync';
import { formsService, stallingService, type FormResponse, type FormTemplate } from '@/lib/services';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/format';
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

const RESPONSE_STATUS_TONE: Record<string, 'success' | 'warning' | 'danger' | 'neutral' | 'navy'> = {
  completed: 'success',
  in_progress: 'warning',
  needs_review: 'danger',
  draft: 'neutral',
  cancelled: 'navy',
};
const RESPONSE_STATUS_LABEL: Record<string, string> = {
  completed: 'Ingevuld',
  in_progress: 'Bezig',
  needs_review: 'Controleren',
  draft: 'Concept',
  cancelled: 'Geannuleerd',
};

export default function StallingDetailPage() {
  const { locale, t } = useIntl();
  const { push } = useToast();
  const params = useParams();
  const id = String(params.id);
  const dateLocale = locale === 'en' ? 'en-GB' : locale === 'de' ? 'de-DE' : 'nl-NL';

  const [auditPage, setAuditPage] = React.useState(1);
  const photoInputRef = React.useRef<HTMLInputElement | null>(null);
  const docInputRef = React.useRef<HTMLInputElement | null>(null);

  // Edit modal state
  const [showEdit, setShowEdit] = React.useState(false);
  const [editForm, setEditForm] = React.useState({
    type: '',
    start_date: '',
    end_date: '',
    paid_until: '',
    bok_number: '',
    location: '',
    status: '',
    notes: '',
  });

  // Send form modal state
  const [showSendForm, setShowSendForm] = React.useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = React.useState('');
  const [sentChannel, setSentChannel] = React.useState('email');

  const dossier = useQuery([id], () => stallingService.dossier(id));
  const logs = useQuery([id, 'logs', auditPage], () =>
    stallingService.logs(id, { per_page: 25, page: auditPage }).catch(() => null)
  );
  const formResponses = useQuery([id, 'forms'], () => formsService.stallingForms(id).catch(() => []));
  const availableForms = useQuery(['form-templates-active'], () =>
    formsService.list({ status: 'active', per_page: 100 }).catch(() => null)
  );

  const uploadPhoto = useMutation((fd: FormData) => stallingService.uploadPhoto(id, fd));
  const uploadDoc = useMutation((fd: FormData) => stallingService.uploadDocument(id, fd));
  const updateContract = useMutation((payload: Record<string, unknown>) =>
    stallingService.update(id, payload)
  );
  const sendForm = useMutation(({ templateId, channel }: { templateId: string; channel: string }) =>
    formsService.sendToStalling(id, templateId, { sent_channel: channel })
  );

  const data = (dossier.data ?? {}) as Row;
  const contract = (data.contract ?? data ?? {}) as Row;
  const boat = (contract.boat ?? data.boat ?? {}) as Row;
  const customer = (contract.customer ?? data.customer ?? {}) as Row;
  const invoices = ((data.invoices ?? data.financial ?? []) as Row[]) ?? [];
  const photos = (data.photos ?? []) as Row[];
  const documents = (data.documents ?? []) as Row[];
  const auditRows = (logs.data?.data ?? []) as unknown as Row[];
  const formRows = (Array.isArray(formResponses.data) ? formResponses.data : []) as FormResponse[];
  const templateOptions = ((availableForms.data?.data ?? []) as FormTemplate[]);

  React.useEffect(() => {
    if (contract.id) {
      setEditForm({
        type: str(contract, 'type'),
        start_date: str(contract, 'start_date'),
        end_date: str(contract, 'end_date'),
        paid_until: str(contract, 'paid_until'),
        bok_number: str(contract, 'bok_number'),
        location: str(contract, 'location_code', 'location'),
        status: str(contract, 'lifecycle_status', 'status'),
        notes: str(contract, 'notes'),
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contract.id]);

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

  const onSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateContract.mutate({
        type: editForm.type || undefined,
        start_date: editForm.start_date || undefined,
        end_date: editForm.end_date || undefined,
        paid_until: editForm.paid_until || undefined,
        bok_number: editForm.bok_number || undefined,
        notes: editForm.notes || undefined,
      });
      setShowEdit(false);
      await dossier.refetch();
      push({ tone: 'success', title: 'Stalling bijgewerkt' });
    } catch (err) {
      push({ tone: 'error', title: t('adminNew.common.operationFailed'), message: getApiErrorMessage(err) });
    }
  };

  const onSendForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplateId) return;
    try {
      await sendForm.mutate({ templateId: selectedTemplateId, channel: sentChannel });
      setShowSendForm(false);
      setSelectedTemplateId('');
      await formResponses.refetch();
      push({ tone: 'success', title: 'Formulier verstuurd' });
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
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" leftIcon={<Pencil className="h-3.5 w-3.5" />} onClick={() => setShowEdit(true)}>
              Bewerken
            </Button>
            <Link href={`/${locale}/admin/stalling`}>
              <Button variant="outline" size="sm" leftIcon={<ArrowLeft className="h-4 w-4" />}>
                {t('adminNew.common.back')}
              </Button>
            </Link>
          </div>
        }
        stats={[
          { label: t('adminNew.stalling.columns.type'), value: str(contract, 'type') || '—', icon: Warehouse, tone: 'marine', loading: dossier.loading },
          { label: t('adminNew.stalling.fields.location'), value: str(contract, 'location_code', 'bok_number') || '—', icon: Ship, tone: 'gold' },
          { label: t('adminNew.stalling.columns.paidUntil'), value: str(contract, 'paid_until') ? formatDate(str(contract, 'paid_until'), dateLocale) : '—', tone: 'navy' },
          { label: 'Status', value: str(contract, 'payment_status', 'status') || '—', tone: 'success' },
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
                  {str(contract, 'notes') ? <Field label="Notities" value={str(contract, 'notes')} /> : null}
                </div>
              </AdminSectionCard>

              <AdminSectionCard title={t('adminNew.stalling.columns.customer')} icon={Ship}>
                <div className="space-y-2 text-sm">
                  <Field label={t('adminNew.common.name')} value={str(customer, 'name') || '—'} />
                  {str(customer, 'email') ? <Field label="Email" value={<a href={`mailto:${str(customer, 'email')}`} className="text-marine-700 hover:underline">{str(customer, 'email')}</a>} /> : null}
                  {str(customer, 'phone') ? <Field label="Telefoon" value={str(customer, 'phone')} /> : null}
                  {customer.id ? (
                    <Link href={`/${locale}/admin/klanten/${customer.id}`} className="mt-2 block text-sm font-semibold text-marine-700 hover:text-marine-900">
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

            {/* Invoices */}
            <AdminSectionCard title={t('admin.sidebar.invoices')} icon={Receipt} className="mt-5">
              {invoices.length === 0 ? (
                <p className="text-sm text-navy-500">{t('adminNew.invoices.emptyMessage')}</p>
              ) : (
                <div className="space-y-2">
                  {invoices.map((inv, i) => {
                    const label = str(inv, 'invoice_label');
                    const labelKey = label === 'deposit' || label === 'final' || label === 'brokerage' ? label : null;
                    return (
                      <Link
                        key={str(inv, 'id') || i}
                        href={`/${locale}/admin/facturen/${inv.id}`}
                        className="flex items-center justify-between rounded-lg border border-navy-100 px-3 py-2 text-sm hover:bg-sand-50"
                      >
                        <span className="flex items-center gap-2">
                          {labelKey ? (
                            <span className="rounded-full bg-marine-50 px-2 py-0.5 text-[11px] font-semibold text-marine-700">
                              {t(`adminNew.stalling.invoiceLabels.${labelKey}`)}
                            </span>
                          ) : null}
                          <span className="font-semibold text-navy-900">{str(inv, 'invoice_number') || str(inv, 'id')}</span>
                        </span>
                        <span>{formatCurrency(Number(inv.total_amount ?? inv.total_amount_cents ?? 0) / 100, dateLocale)}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </AdminSectionCard>

            {/* Checklists / Forms */}
            <AdminSectionCard
              title={`Formulieren & Checklists${formRows.length > 0 ? ` (${formRows.length})` : ''}`}
              icon={CheckSquare}
              className="mt-5"
              action={
                <Button size="sm" variant="gold" leftIcon={<Send className="h-3.5 w-3.5" />} onClick={() => setShowSendForm(true)}>
                  Formulier versturen
                </Button>
              }
            >
              {formResponses.loading ? (
                <LoadingState label={t('adminNew.common.loading')} variant="table" />
              ) : formRows.length === 0 ? (
                <EmptyState
                  title="Geen formulieren"
                  message="Stuur een checklist of formulier naar de klant of medewerker."
                  action={
                    <Button variant="gold" size="sm" leftIcon={<Send className="h-3.5 w-3.5" />} onClick={() => setShowSendForm(true)}>
                      Formulier versturen
                    </Button>
                  }
                />
              ) : (
                <AdminTableCard>
                  <AdminTable minWidth={600}>
                    <AdminTableHead>
                      <tr>
                        <AdminTableHeaderCell>Formulier</AdminTableHeaderCell>
                        <AdminTableHeaderCell>Kanaal</AdminTableHeaderCell>
                        <AdminTableHeaderCell>Status</AdminTableHeaderCell>
                        <AdminTableHeaderCell>Verstuurd</AdminTableHeaderCell>
                        <AdminTableHeaderCell>Ingediend</AdminTableHeaderCell>
                        <AdminTableHeaderCell>{''}</AdminTableHeaderCell>
                      </tr>
                    </AdminTableHead>
                    <tbody>
                      {formRows.map((r) => (
                        <AdminTableRow key={r.id}>
                          <AdminTableCell className="font-semibold text-navy-900">
                            {r.template_name ?? '—'}
                          </AdminTableCell>
                          <AdminTableCell>
                            {r.sent_channel ? <Badge tone="navy">{r.sent_channel}</Badge> : '—'}
                          </AdminTableCell>
                          <AdminTableCell>
                            <Badge tone={RESPONSE_STATUS_TONE[r.status] ?? 'neutral'}>
                              {RESPONSE_STATUS_LABEL[r.status] ?? r.status}
                            </Badge>
                          </AdminTableCell>
                          <AdminTableCell className="whitespace-nowrap text-xs text-navy-500">
                            {r.sent_at ? formatDate(r.sent_at, dateLocale) : '—'}
                          </AdminTableCell>
                          <AdminTableCell className="whitespace-nowrap text-xs text-navy-500">
                            {r.submitted_at ? formatDateTime(r.submitted_at, dateLocale) : '—'}
                          </AdminTableCell>
                          <AdminTableCell>
                            <Link href={`/${locale}/admin/form-responses/${r.id}`}>
                              <Button variant="outline" size="sm">Open</Button>
                            </Link>
                          </AdminTableCell>
                        </AdminTableRow>
                      ))}
                    </tbody>
                  </AdminTable>
                </AdminTableCard>
              )}
            </AdminSectionCard>

            {/* Photos & Documents */}
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

            {/* Audit Timeline */}
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
                      <Button size="sm" variant="ghost" disabled={auditPage <= 1} onClick={() => setAuditPage((p) => p - 1)}>←</Button>
                      <span className="text-xs text-navy-500">{auditPage} / {logs.data.meta.last_page ?? 1}</span>
                      <Button size="sm" variant="ghost" disabled={auditPage >= (logs.data.meta.last_page ?? 1)} onClick={() => setAuditPage((p) => p + 1)}>→</Button>
                    </div>
                  ) : null}
                </>
              )}
            </AdminSectionCard>
          </>
        ) : null}
      </AdminContent>

      {/* Edit modal */}
      <Modal open={showEdit} onClose={() => setShowEdit(false)}>
        <form onSubmit={onSaveEdit}>
          <AdminModalHeader title="Stalling bewerken" />
          <AdminModalBody>
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-navy-400">Type</label>
                  <AdminSelect value={editForm.type} onChange={(v) => setEditForm((f) => ({ ...f, type: v }))}>
                    <option value="winter">Winterstalling</option>
                    <option value="summer">Zomerstalling</option>
                    <option value="year">Jaarstalling</option>
                    <option value="temporary">Tijdelijk</option>
                  </AdminSelect>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-navy-400">Bok nummer</label>
                  <Input value={editForm.bok_number} onChange={(e) => setEditForm((f) => ({ ...f, bok_number: e.target.value }))} placeholder="112" />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-navy-400">Startdatum</label>
                  <Input type="date" value={editForm.start_date} onChange={(e) => setEditForm((f) => ({ ...f, start_date: e.target.value }))} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-navy-400">Einddatum</label>
                  <Input type="date" value={editForm.end_date} onChange={(e) => setEditForm((f) => ({ ...f, end_date: e.target.value }))} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-navy-400">Betaald tot</label>
                  <Input type="date" value={editForm.paid_until} onChange={(e) => setEditForm((f) => ({ ...f, paid_until: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-navy-400">Notities</label>
                <textarea
                  className="input-base w-full"
                  rows={3}
                  value={editForm.notes}
                  onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Interne notities..."
                />
              </div>
            </div>
          </AdminModalBody>
          <AdminModalFooter>
            <Button variant="outline" size="sm" type="button" onClick={() => setShowEdit(false)}>Annuleren</Button>
            <Button variant="gold" size="sm" type="submit" disabled={updateContract.loading} leftIcon={<Save className="h-3.5 w-3.5" />}>
              {updateContract.loading ? 'Opslaan...' : 'Opslaan'}
            </Button>
          </AdminModalFooter>
        </form>
      </Modal>

      {/* Send form modal */}
      <Modal open={showSendForm} onClose={() => setShowSendForm(false)}>
        <form onSubmit={onSendForm}>
          <AdminModalHeader title="Formulier versturen" />
          <AdminModalBody>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-navy-400">Formulier *</label>
                <AdminSelect value={selectedTemplateId} onChange={setSelectedTemplateId}>
                  <option value="">Kies een formulier...</option>
                  {templateOptions.map((tmpl) => (
                    <option key={tmpl.id} value={tmpl.id}>{tmpl.name_json?.nl ?? '—'}</option>
                  ))}
                </AdminSelect>
                {templateOptions.length === 0 ? (
                  <p className="mt-1 text-xs text-navy-500">
                    Geen actieve formulieren. <Link href={`/${locale}/admin/forms`} className="text-marine-700 hover:underline">Maak er eerst één aan →</Link>
                  </p>
                ) : null}
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-navy-400">Kanaal</label>
                <AdminSelect value={sentChannel} onChange={setSentChannel}>
                  <option value="email">Email</option>
                  <option value="portal">Klant portaal</option>
                  <option value="tablet">Tablet (medewerker)</option>
                  <option value="qr">QR code</option>
                </AdminSelect>
              </div>
              {customer.email ? (
                <p className="text-sm text-navy-600">
                  Versturen naar: <span className="font-semibold">{str(customer, 'email')}</span>
                </p>
              ) : null}
            </div>
          </AdminModalBody>
          <AdminModalFooter>
            <Button variant="outline" size="sm" type="button" onClick={() => setShowSendForm(false)}>Annuleren</Button>
            <Button variant="gold" size="sm" type="submit" disabled={sendForm.loading || !selectedTemplateId} leftIcon={<Send className="h-3.5 w-3.5" />}>
              {sendForm.loading ? 'Versturen...' : 'Versturen'}
            </Button>
          </AdminModalFooter>
        </form>
      </Modal>
    </>
  );
}
