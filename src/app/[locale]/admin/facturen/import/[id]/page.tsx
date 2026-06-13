'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, CheckCircle2, FileText, ScanText, XCircle } from 'lucide-react';
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
import { AdminConfirmModal } from '@/components/admin/AdminConfirmModal';
import { ErrorState, LoadingState } from '@/components/admin/DataState';
import { useMutation, useQuery } from '@/lib/hooks/useAsync';
import { invoiceImportsService } from '@/lib/services';
import { useToast } from '@/components/ui/ToastProvider';
import { getApiErrorMessage } from '@/lib/api-error';
import { useIntl } from '@/i18n/IntlProvider';
import { formatCurrency } from '@/lib/format';

type Rec = Record<string, unknown>;
const str = (r: Rec, ...keys: string[]): string => {
  for (const k of keys) {
    const v = r[k];
    if (typeof v === 'string' && v.trim()) return v;
    if (typeof v === 'number') return String(v);
  }
  return '';
};

function confPct(raw: unknown): number | null {
  if (raw == null) return null;
  const n = Number(raw);
  if (Number.isNaN(n)) return null;
  return n <= 1 ? Math.round(n * 100) : Math.round(n);
}
function confTone(pct: number): React.ComponentProps<typeof Badge>['tone'] {
  if (pct >= 85) return 'success';
  if (pct >= 60) return 'gold';
  return 'danger';
}

export default function InvoiceImportReviewPage() {
  const { locale, t } = useIntl();
  const { push } = useToast();
  const params = useParams();
  const id = String(params.id);
  const dateLocale = locale === 'en' ? 'en-GB' : locale === 'de' ? 'de-DE' : 'nl-NL';

  const [approveOpen, setApproveOpen] = React.useState(false);
  const [rejectOpen, setRejectOpen] = React.useState(false);

  const imp = useQuery([id], () => invoiceImportsService.get(id));
  const pdf = useQuery([id, 'pdf'], () => invoiceImportsService.sourcePdf(id).catch(() => null));
  const matches = useQuery([id, 'matches'], () => invoiceImportsService.proposeMatches(id).catch(() => null));
  const approveM = useMutation(() => invoiceImportsService.approve(id));
  const rejectM = useMutation(() => invoiceImportsService.reject(id));

  const data = (imp.data ?? {}) as Rec;
  const extracted = ((data.extracted_data ?? data.extracted ?? data.fields ?? {}) as Rec);
  const lineItems = ((data.line_items ?? data.lines ?? extracted.line_items ?? []) as Rec[]) ?? [];
  const proposals = ((matches.data?.matches ?? matches.data?.proposals ?? matches.data?.data ?? []) as Rec[]) ?? [];
  const pdfUrl = str((pdf.data ?? {}) as Rec, 'signed_url', 'url');
  const overallConf = confPct(data.ocr_confidence ?? data.confidence ?? data.average_confidence);

  const money = (cents: number) => formatCurrency(cents / 100, dateLocale);

  const fieldRows: Array<{ key: string; label: string }> = [
    { key: 'supplier_name', label: t('adminNew.invoiceImports.reviewScreen.supplier') },
    { key: 'supplier_document_number', label: t('adminNew.invoiceImports.reviewScreen.documentNumber') },
    { key: 'invoice_date', label: t('adminNew.invoiceImports.reviewScreen.date') },
    { key: 'total_amount', label: t('adminNew.invoiceImports.reviewScreen.total') },
    { key: 'vat_amount', label: t('adminNew.invoiceImports.reviewScreen.vat') },
  ];

  const fieldConf = (data.field_confidence ?? extracted.field_confidence ?? {}) as Rec;

  const act = async (label: string, fn: () => Promise<unknown>, after: () => void) => {
    try {
      await fn();
      push({ tone: 'success', title: label });
      after();
      await imp.refetch();
    } catch (err) {
      push({ tone: 'error', title: t('adminNew.common.operationFailed'), message: getApiErrorMessage(err) });
    }
  };

  const st = str(data, 'status') || 'uploaded';
  const open = !/approv|reject/i.test(st);

  return (
    <>
      <AdminPageHeader
        title={str(data, 'original_filename') || t('adminNew.invoiceImports.reviewScreen.title')}
        subtitle={str(data, 'supplier_name', 'sender_email')}
        rightSlot={
          <div className="flex gap-2">
            <Link href={`/${locale}/admin/facturen/import`}>
              <Button variant="outline" size="sm" leftIcon={<ArrowLeft className="h-4 w-4" />}>
                {t('adminNew.common.back')}
              </Button>
            </Link>
            <Link href={`/${locale}/admin/facturen/templates/editor?importId=${id}`}>
              <Button variant="outline" size="sm" leftIcon={<ScanText className="h-4 w-4" />}>
                {t('adminNew.invoiceImports.reviewScreen.tagFields')}
              </Button>
            </Link>
            {open ? (
              <>
                <Button variant="gold" size="sm" leftIcon={<CheckCircle2 className="h-4 w-4" />} onClick={() => setApproveOpen(true)}>
                  {t('adminNew.invoiceImports.approve')}
                </Button>
                <Button variant="ghost" size="sm" className="text-rose-600" leftIcon={<XCircle className="h-4 w-4" />} onClick={() => setRejectOpen(true)}>
                  {t('adminNew.invoiceImports.reject')}
                </Button>
              </>
            ) : null}
          </div>
        }
        stats={[
          { label: t('adminNew.invoiceImports.columns.status'), value: st.replace(/_/g, ' '), tone: 'navy', loading: imp.loading },
          {
            label: t('adminNew.invoiceImports.columns.confidence'),
            value: overallConf == null ? '—' : `${overallConf}%`,
            icon: ScanText,
            tone: overallConf != null && overallConf < 60 ? 'danger' : 'success',
          },
        ]}
      />
      <AdminContent>
        {imp.error ? <ErrorState message={imp.error} onRetry={() => void imp.refetch()} /> : null}

        <div className="grid gap-5 lg:grid-cols-2">
          <AdminSectionCard title={t('adminNew.invoiceImports.reviewScreen.document')} icon={FileText}>
            {pdf.loading ? (
              <LoadingState label={t('adminNew.common.loading')} variant="detail" />
            ) : pdfUrl ? (
              <iframe title="source-pdf" src={pdfUrl} className="h-[600px] w-full rounded-lg border border-navy-100" />
            ) : (
              <p className="text-sm text-navy-500">{t('adminNew.invoiceImports.reviewScreen.noDocument')}</p>
            )}
          </AdminSectionCard>

          <div className="space-y-5">
            <AdminSectionCard title={t('adminNew.invoiceImports.reviewScreen.extracted')} icon={ScanText}>
              <div className="space-y-2.5">
                {fieldRows.map(({ key, label }) => {
                  const value = str(extracted, key) || str(data, key);
                  const c = confPct((fieldConf as Rec)[key]);
                  return (
                    <div key={key} className="flex items-center justify-between gap-3 border-b border-navy-50 pb-2 last:border-0">
                      <div>
                        <div className="text-[11px] font-semibold uppercase tracking-widest text-navy-400">{label}</div>
                        <div className="font-medium text-navy-900">{value || '—'}</div>
                      </div>
                      {c != null ? <Badge tone={confTone(c)}>{c}%</Badge> : null}
                    </div>
                  );
                })}
              </div>
            </AdminSectionCard>

            {proposals.length > 0 ? (
              <AdminSectionCard title={t('adminNew.invoiceImports.reviewScreen.matches')} description={t('adminNew.invoiceImports.reviewScreen.matchesSubtitle')} icon={CheckCircle2}>
                <ul className="space-y-2">
                  {proposals.map((p, i) => (
                    <li key={i} className="flex items-center justify-between rounded-lg border border-navy-100 px-3 py-2 text-sm">
                      <span className="text-navy-800">{str(p, 'label', 'name', 'product_name', 'description') || `#${i + 1}`}</span>
                      {confPct(p.confidence ?? p.score) != null ? (
                        <Badge tone={confTone(confPct(p.confidence ?? p.score)!)}>{confPct(p.confidence ?? p.score)}%</Badge>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </AdminSectionCard>
            ) : null}
          </div>
        </div>

        <AdminSectionCard title={t('adminNew.invoiceImports.reviewScreen.lineItems')} icon={FileText} className="mt-5">
          <AdminTableCard>
            {lineItems.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-navy-500">{t('adminNew.invoiceImports.reviewScreen.noLineItems')}</p>
            ) : (
              <AdminTable minWidth={680}>
                <AdminTableHead>
                  <tr>
                    <AdminTableHeaderCell>{t('adminNew.invoiceImports.reviewScreen.description')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{t('adminNew.invoiceImports.reviewScreen.qty')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{t('adminNew.invoiceImports.reviewScreen.unitPrice')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{t('adminNew.invoiceImports.reviewScreen.lineTotal')}</AdminTableHeaderCell>
                  </tr>
                </AdminTableHead>
                <tbody>
                  {lineItems.map((li, i) => (
                    <AdminTableRow key={i}>
                      <AdminTableCell className="text-sm text-navy-800">{str(li, 'description', 'name') || '—'}</AdminTableCell>
                      <AdminTableCell className="text-sm">{str(li, 'quantity', 'qty') || '—'}</AdminTableCell>
                      <AdminTableCell className="text-sm">{money(Number(li.unit_price_cents ?? li.unit_price ?? 0))}</AdminTableCell>
                      <AdminTableCell className="text-sm font-semibold">{money(Number(li.total_cents ?? li.line_total_cents ?? li.total ?? 0))}</AdminTableCell>
                    </AdminTableRow>
                  ))}
                </tbody>
              </AdminTable>
            )}
          </AdminTableCard>
        </AdminSectionCard>
      </AdminContent>

      <AdminConfirmModal
        open={approveOpen}
        onClose={() => setApproveOpen(false)}
        onConfirm={() => act(t('adminNew.invoiceImports.toasts.approved'), () => approveM.mutate(), () => setApproveOpen(false))}
        title={t('adminNew.invoiceImports.approve')}
        message={t('adminNew.invoiceImports.confirmApprove')}
        confirmLabel={t('adminNew.invoiceImports.approve')}
        cancelLabel={t('adminNew.common.cancel')}
        variant="primary"
        icon={CheckCircle2}
        loading={approveM.loading}
      />
      <AdminConfirmModal
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        onConfirm={() => act(t('adminNew.invoiceImports.toasts.rejected'), () => rejectM.mutate(), () => setRejectOpen(false))}
        title={t('adminNew.invoiceImports.reject')}
        message={t('adminNew.invoiceImports.confirmReject')}
        confirmLabel={t('adminNew.invoiceImports.reject')}
        cancelLabel={t('adminNew.common.cancel')}
        variant="danger"
        loading={rejectM.loading}
      />
    </>
  );
}
