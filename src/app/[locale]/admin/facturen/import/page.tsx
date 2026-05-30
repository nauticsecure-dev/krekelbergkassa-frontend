'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowLeft, FileUp, Upload } from 'lucide-react';
import { AdminPageHeader } from '@/components/admin/AdminShell';
import {
  AdminContent,
  AdminSectionCard,
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
import { EmptyState, LoadingState } from '@/components/admin/DataState';
import { useToast } from '@/components/ui/ToastProvider';
import { getApiErrorMessage } from '@/lib/api-error';
import { useIntl } from '@/i18n/IntlProvider';
import { AdminConfirmModal } from '@/components/admin/AdminConfirmModal';
import { formatDate } from '@/lib/format';

export default function InvoiceImportsPage() {
  const { locale, t } = useIntl();
  const { push } = useToast();
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);
  const [approveTarget, setApproveTarget] = React.useState<string | null>(null);

  const imports = useQuery(['invoice-imports'], () => invoiceImportsService.list({ per_page: 50 }));
  const approve = useMutation((id: string) => invoiceImportsService.approve(id));

  const rows = imports.data?.data ?? [];
  const dateLocale = locale === 'en' ? 'en-GB' : 'nl-NL';

  const onUpload = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const uploaded = await filesService.upload(fd);
      const fileId = String((uploaded as Record<string, unknown>).id ?? '');
      await invoiceImportsService.create({
        file_id: fileId,
        source: 'upload',
        original_filename: file.name,
      });
      await imports.refetch();
      push({ tone: 'success', title: t('adminNew.invoiceImports.toasts.uploaded') });
    } catch (err) {
      push({
        tone: 'error',
        title: t('adminNew.common.operationFailed'),
        message: getApiErrorMessage(err),
      });
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
              accept="application/pdf"
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
          {imports.loading ? <LoadingState label={t('adminNew.common.loading')} variant="table" /> : null}
          {!imports.loading && rows.length === 0 ? (
            <EmptyState title={t('adminNew.invoiceImports.emptyTitle')} message={t('adminNew.invoiceImports.emptyMessage')} />
          ) : null}
          {!imports.loading && rows.length > 0 ? (
            <AdminTableCard>
              <AdminTable minWidth={800}>
                <AdminTableHead>
                  <tr>
                    <AdminTableHeaderCell>{t('adminNew.invoiceImports.columns.file')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{t('adminNew.invoiceImports.columns.status')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{t('adminNew.invoiceImports.columns.date')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>&nbsp;</AdminTableHeaderCell>
                  </tr>
                </AdminTableHead>
                <tbody>
                  {rows.map((row) => (
                    <AdminTableRow key={String(row.id)}>
                      <AdminTableCell>{String(row.original_filename ?? row.id)}</AdminTableCell>
                      <AdminTableCell>
                        <Badge tone="neutral">{String(row.status ?? 'uploaded')}</Badge>
                      </AdminTableCell>
                      <AdminTableCell>
                        {row.created_at ? formatDate(String(row.created_at), dateLocale) : '—'}
                      </AdminTableCell>
                      <AdminTableCell>
                        {row.status === 'review' || row.status === 'uploaded' ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setApproveTarget(String(row.id))}
                          >
                            {t('adminNew.invoiceImports.approve')}
                          </Button>
                        ) : null}
                      </AdminTableCell>
                    </AdminTableRow>
                  ))}
                </tbody>
              </AdminTable>
            </AdminTableCard>
          ) : null}
        </AdminSectionCard>
      </AdminContent>

      <AdminConfirmModal
        open={!!approveTarget}
        onClose={() => setApproveTarget(null)}
        onConfirm={async () => {
          if (!approveTarget) return;
          await approve.mutate(approveTarget);
          await imports.refetch();
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
    </>
  );
}
