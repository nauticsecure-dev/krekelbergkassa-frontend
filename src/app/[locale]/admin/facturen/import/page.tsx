'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowLeft, FileUp, ScanText, Upload } from 'lucide-react';
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
  const dupM = useMutation((id: string) => invoiceImportsService.markDuplicate(id));
  const workbonM = useMutation((id: string) => invoiceImportsService.markWorkbon(id));

  const rows = (imports.data?.data ?? []) as Rec[];
  const dateLocale = locale === 'en' ? 'en-GB' : locale === 'de' ? 'de-DE' : 'nl-NL';

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
              variant="gold"
              size="sm"
              leftIcon={<Upload className="h-4 w-4" />}
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
            >
              {t('adminNew.invoiceImports.upload')}
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
          </div>
        }
      />
      <AdminContent>
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
            </AdminSelect>
          </div>

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
                    <AdminTableHeaderCell>{t('adminNew.invoiceImports.columns.file')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{t('adminNew.invoiceImports.columns.supplier')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{t('adminNew.invoiceImports.columns.source')}</AdminTableHeaderCell>
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
                    return (
                      <AdminTableRow key={id}>
                        <AdminTableCell className="font-medium text-navy-900">
                          {String(row.original_filename ?? row.id)}
                          {row.supplier_document_number ? (
                            <div className="text-xs text-navy-400">#{String(row.supplier_document_number)}</div>
                          ) : null}
                        </AdminTableCell>
                        <AdminTableCell className="text-sm text-navy-600">
                          {String(row.supplier_name ?? row.sender_email ?? '—')}
                        </AdminTableCell>
                        <AdminTableCell className="capitalize">{String(row.source ?? '—')}</AdminTableCell>
                        <AdminTableCell>
                          <Badge tone={statusTone(st)}>{st.replace(/_/g, ' ')}</Badge>
                        </AdminTableCell>
                        <AdminTableCell className="whitespace-nowrap text-sm text-navy-600">
                          {row.created_at ? formatDate(String(row.created_at), dateLocale) : '—'}
                        </AdminTableCell>
                        <AdminTableCell>
                          <div className="flex flex-wrap justify-end gap-1">
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
                                    dupM.mutate(id)
                                  )
                                }
                              >
                                {t('adminNew.invoiceImports.markDuplicate')}
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
