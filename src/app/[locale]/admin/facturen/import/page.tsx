'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowLeft, Camera, CheckCircle2, Download, FileUp, ScanText, Upload, XCircle } from 'lucide-react';
import { AdminPageHeader } from '@/components/admin/AdminShell';
import {
  AdminContent,
  AdminSearchInput,
  AdminSectionCard,
  AdminSelect,
  AdminTable,
  AdminTableCard,
  AdminTableCell,
  AdminTableHead,
  AdminTableHeaderCell,
  AdminTableRow,
} from '@/components/admin/AdminUi';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { filesService, invoiceImportsService } from '@/lib/services';
import { useMutation, useQuery } from '@/lib/hooks/useAsync';
import { EmptyState, ErrorState, LoadingState } from '@/components/admin/DataState';
import { useToast } from '@/components/ui/ToastProvider';
import { getApiErrorMessage } from '@/lib/api-error';
import { useIntl } from '@/i18n/IntlProvider';
import { AdminConfirmModal } from '@/components/admin/AdminConfirmModal';
import { formatDate } from '@/lib/format';

type Rec = Record<string, unknown>;
const STATUSES = ['uploaded', 'review_required', 'approved', 'rejected', 'duplicate', 'waiting_for_supplier_invoice'];

function statusTone(status: string): React.ComponentProps<typeof Badge>['tone'] {
  const s = status.toLowerCase();
  if (s.includes('approv')) return 'success';
  if (s.includes('reject')) return 'danger';
  if (s.includes('duplicate')) return 'warning';
  if (s.includes('review')) return 'marine';
  if (s.includes('workbon') || s.includes('waiting')) return 'gold';
  return 'neutral';
}

function isDeliveryNote(row: Rec): boolean {
  const dt = String(row.document_type ?? '').toLowerCase();
  return dt.includes('delivery') || dt.includes('bon');
}

// Trello #108/#81: OCR confidence may arrive as 0..1 or 0..100 under several keys.
function ocrConfidence(row: Rec): number | null {
  const raw = row.ocr_confidence ?? row.confidence ?? row.extraction_confidence ?? row.average_confidence;
  if (raw == null) return null;
  const n = Number(raw);
  if (Number.isNaN(n)) return null;
  return n <= 1 ? Math.round(n * 100) : Math.round(n);
}

function confidenceTone(pct: number): React.ComponentProps<typeof Badge>['tone'] {
  if (pct >= 85) return 'success';
  if (pct >= 60) return 'gold';
  return 'danger';
}

export default function InvoiceImportsPage() {
  const { locale, t } = useIntl();
  const { push } = useToast();
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [status, setStatus] = React.useState('');
  const [source, setSource] = React.useState('');
  const [approveTarget, setApproveTarget] = React.useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = React.useState<string | null>(null);
  const [workbonTarget, setWorkbonTarget] = React.useState<string | null>(null);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const batchRef = React.useRef<HTMLInputElement>(null);
  const cameraRef = React.useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = React.useState(false);
  const [exporting, setExporting] = React.useState(false);

  const imports = useQuery([search, status, source], () =>
    invoiceImportsService.list({
      per_page: 50,
      search: search || undefined,
      status: status || undefined,
      source: source || undefined,
    })
  );
  const approve = useMutation((id: string) => invoiceImportsService.approve(id));
  const processM = useMutation((id: string) => invoiceImportsService.process(id));
  const rejectM = useMutation((id: string) => invoiceImportsService.reject(id));
  const dupM = useMutation(({ id, duplicateId }: { id: string; duplicateId?: string }) =>
    invoiceImportsService.markDuplicate(id, duplicateId));
  const workbonM = useMutation((id: string) => invoiceImportsService.markWorkbon(id));
  const retryM = useMutation((id: string) => invoiceImportsService.retry(id));
  const bulkM = useMutation((p: { ids: string[]; action: string }) => invoiceImportsService.bulkAction(p));

  const rows = (imports.data?.data ?? []) as Rec[];
  const dateLocale = locale === 'en' ? 'en-GB' : locale === 'de' ? 'de-DE' : 'nl-NL';

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const toggleAll = () =>
    setSelected((prev) => (prev.size === rows.length ? new Set() : new Set(rows.map((r) => String(r.id)))));

  const runBulk = async (action: string, label: string) => {
    if (selected.size === 0) return;
    try {
      await bulkM.mutate({ ids: Array.from(selected), action });
      push({ tone: 'success', title: label });
      setSelected(new Set());
      await imports.refetch();
    } catch (err) {
      push({ tone: 'error', title: t('adminNew.common.operationFailed'), message: getApiErrorMessage(err) });
    }
  };

  const onBatchUpload = async (files: FileList) => {
    setUploading(true);
    try {
      const fd = new FormData();
      Array.from(files).forEach((f) => fd.append('files[]', f));
      fd.append('source', 'upload');
      await invoiceImportsService.batch(fd);
      await imports.refetch();
      push({ tone: 'success', title: t('adminNew.invoiceImports.toasts.batchUploaded', { count: files.length }) });
    } catch (err) {
      push({ tone: 'error', title: t('adminNew.common.operationFailed'), message: getApiErrorMessage(err) });
    } finally {
      setUploading(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const blob = await invoiceImportsService.export({ status: status || undefined });
      const url = URL.createObjectURL(blob as Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `factuurimport-export-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      push({ tone: 'error', title: t('adminNew.common.operationFailed'), message: getApiErrorMessage(err) });
    } finally {
      setExporting(false);
    }
  };

  const onCameraCapture = async (files: FileList) => {
    setUploading(true);
    try {
      const fd = new FormData();
      Array.from(files).forEach((f) => fd.append('files[]', f));
      fd.append('source', 'photo');
      await invoiceImportsService.batch(fd);
      await imports.refetch();
      push({ tone: 'success', title: t('adminNew.invoiceImports.toasts.batchUploaded', { count: files.length }) });
    } catch (err) {
      push({ tone: 'error', title: t('adminNew.common.operationFailed'), message: getApiErrorMessage(err) });
    } finally {
      setUploading(false);
    }
  };

  const runAction = async (label: string, fn: () => Promise<unknown>) => {
    try {
      await fn();
      push({ tone: 'success', title: label });
      await imports.refetch();
    } catch (err) {
      push({ tone: 'error', title: t('adminNew.common.operationFailed'), message: getApiErrorMessage(err) });
    }
  };

  const onUpload = async (file: File) => {
    setUploading(true);
    try {
      // Create the import first so the uploaded file can be bound to it
      // (the files endpoint requires entity_type / entity_id / file_type).
      const created = await invoiceImportsService.create({
        source: 'upload',
        original_filename: file.name,
      });
      const importId = String((created as Rec).id ?? '');
      const fd = new FormData();
      fd.append('file', file);
      fd.append('entity_type', 'invoice_import');
      fd.append('entity_id', importId);
      fd.append('file_type', 'document');
      await filesService.upload(fd);
      await imports.refetch();
      push({ tone: 'success', title: t('adminNew.invoiceImports.toasts.uploaded') });
    } catch (err) {
      push({ tone: 'error', title: t('adminNew.common.operationFailed'), message: getApiErrorMessage(err) });
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <AdminPageHeader
        title={t('adminNew.invoiceImports.title')}
        subtitle={t('adminNew.invoiceImports.subtitle')}
        rightSlot={
          <div className="flex gap-2">
            <Link href={`/${locale}/admin/facturen`}>
              <Button variant="outline" size="sm" leftIcon={<ArrowLeft className="h-4 w-4" />}>
                {t('adminNew.common.back')}
              </Button>
            </Link>
            <Link href={`/${locale}/admin/facturen/templates`}>
              <Button variant="outline" size="sm" leftIcon={<ScanText className="h-4 w-4" />}>
                {t('adminNew.templates.title')}
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Upload className="h-4 w-4" />}
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
            >
              {t('adminNew.invoiceImports.upload')}
            </Button>
            <Button
              variant="gold"
              size="sm"
              leftIcon={<FileUp className="h-4 w-4" />}
              disabled={uploading}
              onClick={() => batchRef.current?.click()}
            >
              {t('adminNew.invoiceImports.batchUpload')}
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf,image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void onUpload(file);
                e.target.value = '';
              }}
            />
            <input
              ref={batchRef}
              type="file"
              accept="application/pdf,image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files.length) void onBatchUpload(e.target.files);
                e.target.value = '';
              }}
            />
          </div>
        }
      />
      <AdminContent>
        <div
          className={`mb-5 rounded-2xl border-2 border-dashed p-8 text-center transition ${
            dragOver ? 'border-marine-400 bg-marine-50/50' : 'border-navy-200 bg-white/80'
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            if (e.dataTransfer.files?.length) void onBatchUpload(e.dataTransfer.files);
          }}
        >
          <Upload className="mx-auto h-8 w-8 text-marine-500" />
          <p className="mt-2 text-sm font-semibold text-navy-800">{t('adminNew.invoiceImports.dropzoneTitle')}</p>
          <p className="mt-1 text-xs text-navy-500">{t('adminNew.invoiceImports.dropzoneHint')}</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
              {t('adminNew.invoiceImports.upload')}
            </Button>
            <Button variant="gold" size="sm" onClick={() => batchRef.current?.click()}>
              {t('adminNew.invoiceImports.batchUpload')}
            </Button>
            <Button variant="outline" size="sm" leftIcon={<Camera className="h-4 w-4" />} onClick={() => cameraRef.current?.click()}>
              {t('adminNew.invoiceImports.cameraUpload', { defaultValue: "Foto's" })}
            </Button>
          </div>
          {/* Camera/photo input — capture="environment" triggers the rear camera on mobile */}
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            className="hidden"
            onChange={(e) => { if (e.target.files?.length) void onCameraCapture(e.target.files); }}
          />
        </div>

        <AdminSectionCard title={t('adminNew.invoiceImports.queue')} icon={FileUp}>
          <div className="mb-4 flex flex-wrap items-end gap-2">
            <AdminSearchInput
              value={search}
              onChange={setSearch}
              placeholder={t('adminNew.invoiceImports.searchPlaceholder')}
              className="flex-1"
            />
            <AdminSelect value={status} onChange={setStatus}>
              <option value="">{t('adminNew.invoiceImports.allStatuses')}</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, ' ')}
                </option>
              ))}
            </AdminSelect>
            <AdminSelect value={source} onChange={setSource}>
              <option value="">{t('adminNew.invoiceImports.allSources')}</option>
              <option value="upload">{t('adminNew.invoiceImports.sourceUpload')}</option>
              <option value="email">{t('adminNew.invoiceImports.sourceEmail')}</option>
              <option value="photo">{t('adminNew.invoiceImports.sourcePhoto', { defaultValue: "Foto's" })}</option>
              <option value="legacy">{t('adminNew.invoiceImports.sourceLegacy', { defaultValue: 'Historisch' })}</option>
            </AdminSelect>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Download className="h-4 w-4" />}
              disabled={exporting}
              onClick={() => void handleExport()}
            >
              {t('adminNew.invoiceImports.export', { defaultValue: 'Exporteer CSV' })}
            </Button>
          </div>

          {selected.size > 0 ? (
            <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-marine-200 bg-marine-50/60 px-4 py-2.5">
              <span className="text-sm font-semibold text-navy-800">
                {t('adminNew.invoiceImports.selectedCount', { count: selected.size })}
              </span>
              <div className="ml-auto flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<CheckCircle2 className="h-3.5 w-3.5" />}
                  disabled={bulkM.loading}
                  onClick={() => void runBulk('approve', t('adminNew.invoiceImports.toasts.bulkApproved'))}
                >
                  {t('adminNew.invoiceImports.approve')}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-rose-600"
                  leftIcon={<XCircle className="h-3.5 w-3.5" />}
                  disabled={bulkM.loading}
                  onClick={() => void runBulk('reject', t('adminNew.invoiceImports.toasts.bulkRejected'))}
                >
                  {t('adminNew.invoiceImports.reject')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<ScanText className="h-3.5 w-3.5" />}
                  disabled={bulkM.loading}
                  onClick={() => void runBulk('retry', t('adminNew.invoiceImports.toasts.bulkRetried'))}
                >
                  {t('adminNew.invoiceImports.retryOcr')}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
                  {t('adminNew.common.clear')}
                </Button>
              </div>
            </div>
          ) : null}

          <AdminTableCard>
            {imports.loading ? (
              <LoadingState label={t('adminNew.common.loading')} variant="table" />
            ) : imports.error ? (
              <ErrorState message={imports.error} onRetry={() => void imports.refetch()} />
            ) : rows.length === 0 ? (
              <EmptyState
                title={t('adminNew.invoiceImports.emptyTitle')}
                message={t('adminNew.invoiceImports.emptyMessage')}
              />
            ) : (
              <AdminTable minWidth={980}>
                <AdminTableHead>
                  <tr>
                    <AdminTableHeaderCell className="w-10">
                      <input
                        type="checkbox"
                        aria-label={t('adminNew.invoiceImports.selectAll')}
                        checked={rows.length > 0 && selected.size === rows.length}
                        onChange={toggleAll}
                      />
                    </AdminTableHeaderCell>
                    <AdminTableHeaderCell>{t('adminNew.invoiceImports.columns.file')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{t('adminNew.invoiceImports.columns.supplier')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{t('adminNew.invoiceImports.columns.source')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{t('adminNew.invoiceImports.columns.confidence')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{t('adminNew.invoiceImports.columns.status')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{t('adminNew.invoiceImports.columns.date')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell className="text-right">&nbsp;</AdminTableHeaderCell>
                  </tr>
                </AdminTableHead>
                <tbody>
                  {rows.map((row) => {
                    const id = String(row.id);
                    const st = String(row.status ?? 'uploaded');
                    const open = !/approv|reject/i.test(st);
                    const conf = ocrConfidence(row);
                    return (
                      <AdminTableRow key={id}>
                        <AdminTableCell className="w-10">
                          <input
                            type="checkbox"
                            aria-label={t('adminNew.invoiceImports.selectRow')}
                            checked={selected.has(id)}
                            onChange={() => toggle(id)}
                          />
                        </AdminTableCell>
                        <AdminTableCell className="font-medium text-navy-900">
                          <Link href={`/${locale}/admin/facturen/import/${id}`} className="hover:text-marine-700">
                            {String(row.original_filename ?? row.id)}
                          </Link>
                          {row.supplier_document_number ? (
                            <div className="text-xs text-navy-400">#{String(row.supplier_document_number)}</div>
                          ) : null}
                        </AdminTableCell>
                        <AdminTableCell className="text-sm text-navy-600">
                          {String(row.supplier_name ?? row.sender_email ?? '—')}
                        </AdminTableCell>
                        <AdminTableCell className="capitalize">{String(row.source ?? '—')}</AdminTableCell>
                        <AdminTableCell>
                          {conf == null ? (
                            <span className="text-xs text-navy-400">—</span>
                          ) : (
                            <Badge tone={confidenceTone(conf)}>{conf}%</Badge>
                          )}
                        </AdminTableCell>
                        <AdminTableCell>
                          <Badge tone={statusTone(st)}>{st.replace(/_/g, ' ')}</Badge>
                        </AdminTableCell>
                        <AdminTableCell className="whitespace-nowrap text-sm text-navy-600">
                          {row.created_at ? formatDate(String(row.created_at), dateLocale) : '—'}
                        </AdminTableCell>
                        <AdminTableCell>
                          <div className="flex flex-wrap justify-end gap-1">
                            <Link href={`/${locale}/admin/facturen/import/${id}`}>
                              <Button variant="outline" size="sm">
                                {t('adminNew.invoiceImports.review')}
                              </Button>
                            </Link>
                            {st === 'uploaded' ? (
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={processM.loading}
                                onClick={() =>
                                  void runAction(t('adminNew.invoiceImports.toasts.processed'), () =>
                                    processM.mutate(id)
                                  )
                                }
                              >
                                {t('adminNew.invoiceImports.process')}
                              </Button>
                            ) : null}
                            {isDeliveryNote(row) && open ? (
                              <Button variant="outline" size="sm" onClick={() => setWorkbonTarget(id)}>
                                {t('adminNew.invoiceImports.markWorkbon')}
                              </Button>
                            ) : null}
                            {open ? (
                              <Button variant="ghost" size="sm" onClick={() => setApproveTarget(id)}>
                                {t('adminNew.invoiceImports.approve')}
                              </Button>
                            ) : null}
                            {open ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={dupM.loading}
                                onClick={() =>
                                  void runAction(t('adminNew.invoiceImports.toasts.markedDuplicate'), () =>
                                    dupM.mutate({ id, duplicateId: row.duplicate_import_id as string | undefined })
                                  )
                                }
                              >
                                {t('adminNew.invoiceImports.markDuplicate')}
                              </Button>
                            ) : null}
                            {open ? (
                              <Button
                                variant="outline"
                                size="sm"
                                leftIcon={<ScanText className="h-3.5 w-3.5" />}
                                disabled={retryM.loading}
                                onClick={() =>
                                  void runAction(t('adminNew.invoiceImports.toasts.bulkRetried'), () => retryM.mutate(id))
                                }
                              >
                                {t('adminNew.invoiceImports.retryOcr')}
                              </Button>
                            ) : null}
                            {open ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-rose-600"
                                onClick={() => setRejectTarget(id)}
                              >
                                {t('adminNew.invoiceImports.reject')}
                              </Button>
                            ) : null}
                          </div>
                        </AdminTableCell>
                      </AdminTableRow>
                    );
                  })}
                </tbody>
              </AdminTable>
            )}
          </AdminTableCard>
        </AdminSectionCard>
      </AdminContent>

      <AdminConfirmModal
        open={!!approveTarget}
        onClose={() => setApproveTarget(null)}
        onConfirm={async () => {
          if (!approveTarget) return;
          await runAction(t('adminNew.invoiceImports.toasts.approved'), () => approve.mutate(approveTarget));
          setApproveTarget(null);
        }}
        title={t('adminNew.invoiceImports.approve')}
        message={t('adminNew.invoiceImports.confirmApprove')}
        confirmLabel={t('adminNew.invoiceImports.approve')}
        cancelLabel={t('adminNew.common.cancel')}
        variant="primary"
        icon={FileUp}
        loading={approve.loading}
      />

      <AdminConfirmModal
        open={!!rejectTarget}
        onClose={() => setRejectTarget(null)}
        onConfirm={async () => {
          if (!rejectTarget) return;
          await runAction(t('adminNew.invoiceImports.toasts.rejected'), () => rejectM.mutate(rejectTarget));
          setRejectTarget(null);
        }}
        title={t('adminNew.invoiceImports.reject')}
        message={t('adminNew.invoiceImports.confirmReject')}
        confirmLabel={t('adminNew.invoiceImports.reject')}
        cancelLabel={t('adminNew.common.cancel')}
        variant="danger"
        loading={rejectM.loading}
      />

      <AdminConfirmModal
        open={!!workbonTarget}
        onClose={() => setWorkbonTarget(null)}
        onConfirm={async () => {
          if (!workbonTarget) return;
          await runAction(t('adminNew.invoiceImports.toasts.workbon'), () => workbonM.mutate(workbonTarget));
          setWorkbonTarget(null);
        }}
        title={t('adminNew.invoiceImports.markWorkbon')}
        message={t('adminNew.invoiceImports.confirmWorkbon')}
        confirmLabel={t('adminNew.invoiceImports.markWorkbon')}
        cancelLabel={t('adminNew.common.cancel')}
        variant="primary"
        icon={FileUp}
        loading={workbonM.loading}
      />
    </>
  );
}
