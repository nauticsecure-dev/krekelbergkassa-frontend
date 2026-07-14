'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AlertTriangle, ArrowLeft, BookOpen, CheckCircle2, ChevronLeft, ChevronRight, FileText, History, Link2, RotateCw, ScanText, ToggleLeft, ToggleRight, UserPlus, XCircle, ZoomIn, ZoomOut } from 'lucide-react';
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
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { AdminConfirmModal } from '@/components/admin/AdminConfirmModal';
import { ErrorState, LoadingState } from '@/components/admin/DataState';
import { useMutation, useQuery } from '@/lib/hooks/useAsync';
import { customersService, invoiceImportsService, suppliersService } from '@/lib/services';
import { useToast } from '@/components/ui/ToastProvider';
import { getApiErrorMessage } from '@/lib/api-error';
import { useIntl } from '@/i18n/IntlProvider';
import { formatCurrency, formatDate } from '@/lib/format';

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
  const [supplierOpen, setSupplierOpen] = React.useState(false);
  const [linkWorkbonOpen, setLinkWorkbonOpen] = React.useState(false);
  const [linkWorkbonId, setLinkWorkbonId] = React.useState('');
  const [zoom, setZoom] = React.useState(100);
  const [rotation, setRotation] = React.useState(0);
  const [supplierForm, setSupplierForm] = React.useState({
    name: '',
    email: '',
    iban: '',
    payment_terms_days: '14',
  });
  // Editable extracted fields
  const [editedFields, setEditedFields] = React.useState<Record<string, string>>({});
  const [editedLines, setEditedLines] = React.useState<Rec[] | null>(null);

  const imp = useQuery([id], () => invoiceImportsService.get(id));
  const queue = useQuery(['import-queue-nav'], () => invoiceImportsService.list({ per_page: 100 }));
  const pdf = useQuery([id, 'pdf'], () => invoiceImportsService.sourcePdf(id).catch(() => null));
  const matches = useQuery([id, 'matches'], () => invoiceImportsService.proposeMatches(id).catch(() => null));
  const resolvedItems = useQuery([id, 'resolved-items'], () => invoiceImportsService.resolveLineItems(id).catch(() => null));
  const approveM = useMutation((payload?: Record<string, unknown>) => invoiceImportsService.approve(id, payload));
  const rejectM = useMutation(() => invoiceImportsService.reject(id));
  const updateM = useMutation((payload: Record<string, unknown>) =>
    invoiceImportsService.update(id, { extracted_data: payload })
  );
  const chargeToggleM = useMutation((val: boolean) =>
    invoiceImportsService.update(id, { charge_to_customer: val })
  );
  const linkWorkbonM = useMutation((workOrderId: string) =>
    invoiceImportsService.linkWorkbon(id, workOrderId)
  );
  const createSupplierM = useMutation((payload: Record<string, unknown>) => suppliersService.create(payload));
  const createCustomerM = useMutation((payload: { name: string; source?: string }) => customersService.create(payload));

  const data = (imp.data ?? {}) as Rec;
  const extracted = ((data.extracted_data ?? data.extracted ?? data.fields ?? {}) as Rec);
  const rawLineItems = ((data.line_items ?? data.lines ?? extracted.line_items ?? []) as Rec[]) ?? [];
  const lineItems = editedLines ?? rawLineItems;

  // Reset editable state whenever the import id changes (navigation between imports).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  React.useEffect(() => { setEditedFields({}); setEditedLines(null); }, [id]);
  const proposals = ((matches.data?.matches ?? matches.data?.proposals ?? matches.data?.data ?? []) as Rec[]) ?? [];
  const pdfUrl = str((pdf.data ?? {}) as Rec, 'signed_url', 'url');
  const overallConf = confPct(data.ocr_confidence ?? data.confidence ?? data.average_confidence);

  // Trello #81: validation warnings, correction history, supplier linkage.
  const warnings = ((data.validation_warnings ?? data.warnings ?? []) as unknown[]).filter(Boolean);
  const corrections = ((data.corrections ?? []) as Rec[]) ?? [];
  const hasSupplier = data.supplier_id != null && data.supplier_id !== '';

  const warningText = (w: unknown): { message: string; severity: string } => {
    if (typeof w === 'string') return { message: w, severity: 'warning' };
    const r = (w ?? {}) as Rec;
    return {
      message: str(r, 'message', 'text', 'warning', 'description') || JSON.stringify(r),
      severity: str(r, 'severity', 'level') || 'warning',
    };
  };
  const isError = (sev: string) => /error|danger|critical|high/i.test(sev);

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

  const onCreateSupplier = async () => {
    if (!supplierForm.name.trim()) {
      push({ tone: 'error', title: t('adminNew.invoiceImports.reviewScreen.supplierNameRequired') });
      return;
    }
    try {
      const created = (await createSupplierM.mutate({
        name: supplierForm.name.trim(),
        email: supplierForm.email.trim() || undefined,
        iban: supplierForm.iban.trim() || undefined,
        payment_terms_days: supplierForm.payment_terms_days
          ? Number(supplierForm.payment_terms_days)
          : undefined,
      })) as Rec;
      // Best-effort link the freshly created supplier to this import.
      const newId = str(created, 'id');
      if (newId) {
        await invoiceImportsService.approve(id, { supplier_id: newId }).catch(() => undefined);
      }
      push({ tone: 'success', title: t('adminNew.invoiceImports.reviewScreen.supplierCreated') });
      setSupplierOpen(false);
      setSupplierForm({ name: '', email: '', iban: '', payment_terms_days: '14' });
      await imp.refetch();
    } catch (err) {
      push({ tone: 'error', title: t('adminNew.common.operationFailed'), message: getApiErrorMessage(err) });
    }
  };

  const st = str(data, 'status') || 'uploaded';
  const open = !/approv|reject/i.test(st);

  const queueIds = ((queue.data?.data ?? []) as Rec[]).map((r) => String(r.id));
  const currentIdx = queueIds.indexOf(id);
  const prevId = currentIdx > 0 ? queueIds[currentIdx - 1] : null;
  const nextId = currentIdx >= 0 && currentIdx < queueIds.length - 1 ? queueIds[currentIdx + 1] : null;

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

        {warnings.length > 0 ? (
          <div className="mb-5 space-y-2">
            {warnings.map((w, i) => {
              const { message, severity } = warningText(w);
              const danger = isError(severity);
              return (
                <div
                  key={i}
                  className={`flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm ${
                    danger
                      ? 'border-rose-200 bg-rose-50 text-rose-800'
                      : 'border-amber-200 bg-amber-50 text-amber-800'
                  }`}
                >
                  <AlertTriangle className={`mt-0.5 h-4 w-4 shrink-0 ${danger ? 'text-rose-500' : 'text-amber-500'}`} />
                  <span className="font-medium">{message}</span>
                </div>
              );
            })}
          </div>
        ) : null}

        <div className="grid gap-5 lg:grid-cols-2">
          <AdminSectionCard title={t('adminNew.invoiceImports.reviewScreen.document')} icon={FileText}>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" leftIcon={<ZoomOut className="h-3.5 w-3.5" />} onClick={() => setZoom((z) => Math.max(50, z - 15))}>
                {t('adminNew.invoiceImports.reviewScreen.zoomOut')}
              </Button>
              <Button variant="outline" size="sm" leftIcon={<ZoomIn className="h-3.5 w-3.5" />} onClick={() => setZoom((z) => Math.min(200, z + 15))}>
                {t('adminNew.invoiceImports.reviewScreen.zoomIn')}
              </Button>
              <Button variant="outline" size="sm" leftIcon={<RotateCw className="h-3.5 w-3.5" />} onClick={() => setRotation((r) => (r + 90) % 360)}>
                {t('adminNew.invoiceImports.reviewScreen.rotate')}
              </Button>
              <span className="ml-auto text-xs font-semibold text-navy-500">{zoom}%</span>
            </div>
            {pdf.loading ? (
              <LoadingState label={t('adminNew.common.loading')} variant="detail" />
            ) : pdfUrl ? (
              <div className="overflow-auto rounded-lg border border-navy-100 bg-sand-50" style={{ maxHeight: 600 }}>
                <iframe
                  title="source-pdf"
                  src={pdfUrl}
                  className="origin-top-left border-0"
                  style={{
                    width: `${zoom}%`,
                    height: `${(600 * zoom) / 100}px`,
                    transform: `rotate(${rotation}deg)`,
                    transformOrigin: 'center center',
                  }}
                />
              </div>
            ) : (
              <p className="text-sm text-navy-500">{t('adminNew.invoiceImports.reviewScreen.noDocument')}</p>
            )}
            <div className="mt-3 flex justify-between gap-2">
              {prevId ? (
                <Link href={`/${locale}/admin/facturen/import/${prevId}`}>
                  <Button variant="ghost" size="sm" leftIcon={<ChevronLeft className="h-4 w-4" />}>
                    {t('adminNew.invoiceImports.reviewScreen.previous')}
                  </Button>
                </Link>
              ) : (
                <span />
              )}
              {nextId ? (
                <Link href={`/${locale}/admin/facturen/import/${nextId}`}>
                  <Button variant="ghost" size="sm" rightIcon={<ChevronRight className="h-4 w-4" />}>
                    {t('adminNew.invoiceImports.reviewScreen.next')}
                  </Button>
                </Link>
              ) : null}
            </div>
          </AdminSectionCard>

          <div className="space-y-5">
            <AdminSectionCard title={t('adminNew.invoiceImports.reviewScreen.extracted')} icon={ScanText}>
              <div className="space-y-2.5">
                {fieldRows.map(({ key, label }) => {
                  const original = str(extracted, key) || str(data, key);
                  const edited = editedFields[key];
                  const displayValue = edited !== undefined ? edited : original;
                  const c = confPct((fieldConf as Rec)[key]);
                  return (
                    <div key={key} className="border-b border-navy-50 pb-2 last:border-0">
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <div className="text-[11px] font-semibold uppercase tracking-widest text-navy-400">{label}</div>
                        {c != null ? <Badge tone={confTone(c)}>{c}%</Badge> : null}
                      </div>
                      <input
                        className="input-base w-full py-1.5 text-sm"
                        value={displayValue}
                        onChange={(e) => setEditedFields((prev) => ({ ...prev, [key]: e.target.value }))}
                        placeholder={label}
                      />
                      {edited !== undefined && edited !== original ? (
                        <p className="mt-0.5 text-xs text-amber-600">
                          {t('adminNew.invoiceImports.reviewScreen.corrected', { defaultValue: 'Gecorrigeerd' })} — origineel: <span className="line-through">{original || '—'}</span>
                        </p>
                      ) : null}
                    </div>
                  );
                })}
              </div>
              {Object.keys(editedFields).some((k) => editedFields[k] !== (str(extracted, k) || str(data, k))) ? (
                <div className="mt-3 flex justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={updateM.loading}
                    onClick={() => void updateM.mutate(editedFields).then(() => imp.refetch())}
                  >
                    {t('adminNew.invoiceImports.reviewScreen.saveCorrections', { defaultValue: 'Correcties opslaan' })}
                  </Button>
                </div>
              ) : null}
              {!hasSupplier ? (
                <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-marine-200 bg-marine-50/60 px-3 py-2.5">
                  <span className="text-sm text-navy-700">
                    {t('adminNew.invoiceImports.reviewScreen.noSupplierLinked')}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<UserPlus className="h-3.5 w-3.5" />}
                    onClick={() => {
                      setSupplierForm({
                        name: str(extracted, 'supplier_name') || str(data, 'supplier_name'),
                        email: str(extracted, 'supplier_email') || str(data, 'sender_email'),
                        iban: str(extracted, 'iban'),
                        payment_terms_days: '14',
                      });
                      setSupplierOpen(true);
                    }}
                  >
                    {t('adminNew.invoiceImports.reviewScreen.createSupplier')}
                  </Button>
                </div>
              ) : null}
              {/* Suggest create customer when AI found no match */}
              {!data.customer_id ? (
                <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50/60 px-3 py-2.5">
                  <span className="text-sm text-navy-700">
                    {t('adminNew.invoiceImports.reviewScreen.noCustomerLinked', { defaultValue: 'Geen klant gekoppeld' })}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<UserPlus className="h-3.5 w-3.5" />}
                    onClick={() => void (async () => {
                      const name = str(extracted, 'customer_name') || str(data, 'customer_name');
                      if (!name) return;
                      try {
                        const created = await createCustomerM.mutate({ name });
                        await invoiceImportsService.approve(id, { customer_id: String((created as unknown as Rec).id ?? '') }).catch(() => undefined);
                        push({ tone: 'success', title: t('adminNew.invoiceImports.reviewScreen.customerCreated', { defaultValue: 'Klant aangemaakt' }) });
                        await imp.refetch();
                      } catch (err) {
                        push({ tone: 'error', title: t('adminNew.common.operationFailed'), message: getApiErrorMessage(err) });
                      }
                    })()}
                  >
                    {t('adminNew.invoiceImports.reviewScreen.createCustomer', { defaultValue: 'Klant aanmaken' })}
                  </Button>
                </div>
              ) : null}
            </AdminSectionCard>

            {corrections.length > 0 ? (
              <AdminSectionCard title={t('adminNew.invoiceImports.reviewScreen.corrections')} icon={History}>
                <ul className="space-y-2">
                  {corrections.map((c, i) => (
                    <li key={i} className="rounded-lg border border-navy-100 px-3 py-2 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-navy-800">{str(c, 'field', 'field_name') || '—'}</span>
                        {str(c, 'corrected_at', 'created_at') ? (
                          <span className="text-xs text-navy-400">
                            {formatDate(str(c, 'corrected_at', 'created_at'), dateLocale)}
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
                        <span className="rounded bg-rose-50 px-1.5 py-0.5 text-rose-700 line-through">
                          {str(c, 'old_value', 'from', 'previous_value') || '—'}
                        </span>
                        <ChevronRight className="h-3 w-3 text-navy-400" />
                        <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-emerald-700">
                          {str(c, 'new_value', 'to', 'corrected_value') || '—'}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </AdminSectionCard>
            ) : null}

            {proposals.length > 0 ? (
              <AdminSectionCard title={t('adminNew.invoiceImports.reviewScreen.matches')} description={t('adminNew.invoiceImports.reviewScreen.matchesSubtitle')} icon={CheckCircle2}>
                <ul className="space-y-2">
                  {proposals.map((p, i) => {
                    const woNum = str(p, 'work_order_number', 'number');
                    const custName = str(p, 'customer_name');
                    const boatName = str(p, 'boat_name');
                    const label = [woNum, [custName, boatName].filter(Boolean).join(' / ')].filter(Boolean).join(' — ') || `#${i + 1}`;
                    const conf = confPct(p.confidence ?? p.score);
                    return (
                      <li key={i} className="flex items-center justify-between rounded-lg border border-navy-100 px-3 py-2 text-sm">
                        <span className="font-medium text-navy-800">{label}</span>
                        <div className="flex items-center gap-2">
                          {conf != null ? <Badge tone={confTone(conf)}>{conf}%</Badge> : null}
                          {open ? (
                            <Button
                              variant="outline"
                              size="sm"
                              leftIcon={<Link2 className="h-3.5 w-3.5" />}
                              disabled={linkWorkbonM.loading}
                              onClick={() => {
                                setLinkWorkbonId(str(p, 'work_order_id', 'id'));
                                setLinkWorkbonOpen(true);
                              }}
                            >
                              Koppelen
                            </Button>
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </AdminSectionCard>
            ) : null}

            {/* charge_to_customer toggle */}
            {open ? (
              <div className="flex items-center justify-between rounded-xl border border-navy-100 bg-white px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-navy-800">Doorbelasten aan klant</p>
                  <p className="text-xs text-navy-400">Maakt een klantfactuur aan bij goedkeuring</p>
                </div>
                <button
                  type="button"
                  disabled={chargeToggleM.loading}
                  onClick={() => void act(
                    'Doorbelasting bijgewerkt',
                    () => chargeToggleM.mutate(!data.charge_to_customer),
                    () => undefined,
                  )}
                  className="text-marine-600 disabled:opacity-50"
                >
                  {data.charge_to_customer
                    ? <ToggleRight className="h-8 w-8" />
                    : <ToggleLeft className="h-8 w-8 text-navy-300" />}
                </button>
              </div>
            ) : null}

            {/* accounting suggestions */}
            {Array.isArray(data.accounting_suggestions) && (data.accounting_suggestions as Rec[]).length > 0 ? (
              <AdminSectionCard title="Boekhoudkundige suggesties" icon={BookOpen}>
                <ul className="space-y-1.5">
                  {(data.accounting_suggestions as Rec[]).map((s, i) => (
                    <li key={i} className="rounded-lg border border-navy-50 bg-sand-50/40 px-3 py-2 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-navy-800">{str(s, 'description') || '—'}</span>
                        {confPct(s.confidence) != null ? (
                          <Badge tone={confTone(confPct(s.confidence)!)}>{confPct(s.confidence)}%</Badge>
                        ) : null}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-3 text-xs text-navy-500">
                        {str(s, 'ledger_account') ? <span>Rekening: <span className="font-medium text-navy-700">{str(s, 'ledger_account')}</span></span> : null}
                        {str(s, 'cost_center') ? <span>Kostenpost: <span className="font-medium text-navy-700">{str(s, 'cost_center')}</span></span> : null}
                        {str(s, 'vat_code') ? <span>BTW: <span className="font-medium text-navy-700">{str(s, 'vat_code')}</span></span> : null}
                      </div>
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
                      <AdminTableCell>
                        <input
                          className="input-base w-full py-1 text-sm"
                          value={str(li, 'description', 'name')}
                          onChange={(e) => setEditedLines((prev) => {
                            const lines = prev ?? rawLineItems;
                            return lines.map((l, idx) => idx === i ? { ...l, description: e.target.value } : l);
                          })}
                        />
                      </AdminTableCell>
                      <AdminTableCell>
                        <input
                          className="input-base w-20 py-1 text-sm"
                          type="number"
                          min="0"
                          step="0.01"
                          value={str(li, 'quantity', 'qty')}
                          onChange={(e) => setEditedLines((prev) => {
                            const lines = prev ?? rawLineItems;
                            return lines.map((l, idx) => idx === i ? { ...l, quantity: e.target.value } : l);
                          })}
                        />
                      </AdminTableCell>
                      <AdminTableCell>
                        <input
                          className="input-base w-28 py-1 text-sm"
                          type="number"
                          min="0"
                          step="0.01"
                          value={Number(li.unit_price_cents ?? li.unit_price ?? 0) / 100}
                          onChange={(e) => setEditedLines((prev) => {
                            const lines = prev ?? rawLineItems;
                            return lines.map((l, idx) => idx === i ? { ...l, unit_price_cents: Math.round(Number(e.target.value) * 100) } : l);
                          })}
                        />
                      </AdminTableCell>
                      <AdminTableCell className="text-sm font-semibold">
                        {money(Number(li.total_cents ?? li.line_total_cents ?? li.total ?? 0))}
                      </AdminTableCell>
                    </AdminTableRow>
                  ))}
                </tbody>
              </AdminTable>
            )}
          </AdminTableCard>
        </AdminSectionCard>

        {/* Resolved line items with product mapping */}
        {(() => {
          const items = ((resolvedItems.data as Rec | null)?.items ?? []) as Rec[];
          if (items.length === 0) return null;
          return (
            <AdminSectionCard title="Gekoppelde producten" icon={ScanText} className="mt-5">
              <AdminTableCard>
                <AdminTable minWidth={680}>
                  <AdminTableHead>
                    <tr>
                      <AdminTableHeaderCell>Omschrijving</AdminTableHeaderCell>
                      <AdminTableHeaderCell>Intern product</AdminTableHeaderCell>
                      <AdminTableHeaderCell>Productgroep</AdminTableHeaderCell>
                      <AdminTableHeaderCell>Match score</AdminTableHeaderCell>
                    </tr>
                  </AdminTableHead>
                  <tbody>
                    {items.map((item, i) => {
                      const matchConf = confPct(item.match_confidence);
                      return (
                        <AdminTableRow key={i}>
                          <AdminTableCell className="text-sm">{str(item, 'description', 'name') || '—'}</AdminTableCell>
                          <AdminTableCell className="text-sm">
                            {str(item, 'matched_product_name') || <span className="text-navy-400">—</span>}
                          </AdminTableCell>
                          <AdminTableCell className="text-sm">
                            {str(item, 'matched_product_group') || <span className="text-navy-400">—</span>}
                          </AdminTableCell>
                          <AdminTableCell>
                            {matchConf != null ? <Badge tone={confTone(matchConf)}>{matchConf}%</Badge> : <span className="text-navy-400 text-xs">—</span>}
                          </AdminTableCell>
                        </AdminTableRow>
                      );
                    })}
                  </tbody>
                </AdminTable>
              </AdminTableCard>
            </AdminSectionCard>
          );
        })()}

        {/* Processing log / audit trail */}
        {Array.isArray(data.processing_log) && (data.processing_log as Rec[]).length > 0 ? (
          <AdminSectionCard title={t('adminNew.invoiceImports.reviewScreen.processingLog', { defaultValue: 'Verwerkingslog' })} icon={History} className="mt-5">
            <ol className="relative space-y-2 border-l border-navy-100 pl-4">
              {(data.processing_log as Rec[]).map((entry, i) => (
                <li key={i} className="relative text-sm">
                  <span className="absolute -left-[17px] mt-1 h-2.5 w-2.5 rounded-full bg-navy-200 ring-2 ring-white" />
                  <span className="text-xs text-navy-400">
                    {entry.at ? formatDate(String(entry.at), dateLocale) : ''}
                  </span>
                  <p className="text-navy-700">{String(entry.message ?? '')}</p>
                </li>
              ))}
            </ol>
          </AdminSectionCard>
        ) : null}
      </AdminContent>

      <AdminConfirmModal
        open={approveOpen}
        onClose={() => setApproveOpen(false)}
        onConfirm={() => act(t('adminNew.invoiceImports.toasts.approved'), () => {
          const correctionsList = Object.keys(editedFields)
            .filter((k) => editedFields[k] !== (str(extracted, k) || str(data, k)))
            .map((k) => ({
              field: k,
              old_value: str(extracted, k) || str(data, k) || null,
              new_value: editedFields[k],
            }));
          const mergedExtracted = editedLines
            ? { ...extracted, line_items: editedLines }
            : undefined;
          return approveM.mutate({
            corrections: correctionsList.length > 0 ? correctionsList : undefined,
            extracted_data: mergedExtracted,
          });
        }, () => setApproveOpen(false))}
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

      <AdminConfirmModal
        open={linkWorkbonOpen}
        onClose={() => setLinkWorkbonOpen(false)}
        onConfirm={() => act('Werkbon gekoppeld', () => linkWorkbonM.mutate(linkWorkbonId), () => setLinkWorkbonOpen(false))}
        title="Koppelen aan werkbon"
        message={`Weet u zeker dat u dit document wilt koppelen aan werkbon ${
          (() => {
            const p = proposals.find((pr) => str(pr, 'work_order_id', 'id') === linkWorkbonId);
            return p ? str(p, 'work_order_number', 'number') : linkWorkbonId;
          })()
        }?`}
        confirmLabel="Koppelen"
        cancelLabel={t('adminNew.common.cancel')}
        variant="primary"
        icon={Link2}
        loading={linkWorkbonM.loading}
      />

      <Modal open={supplierOpen} onClose={() => setSupplierOpen(false)} size="md">
        <div className="p-6">
          <h2 className="flex items-center gap-2 text-lg font-bold text-navy-900">
            <UserPlus className="h-5 w-5 text-marine-600" />
            {t('adminNew.invoiceImports.reviewScreen.createSupplier')}
          </h2>
          <p className="mt-1 text-sm text-navy-500">
            {t('adminNew.invoiceImports.reviewScreen.createSupplierHint')}
          </p>
          <div className="mt-4 grid gap-3">
            <Input
              label={t('adminNew.common.name')}
              value={supplierForm.name}
              onChange={(e) => setSupplierForm((p) => ({ ...p, name: e.target.value }))}
              required
            />
            <Input
              label={t('adminNew.common.email')}
              type="email"
              value={supplierForm.email}
              onChange={(e) => setSupplierForm((p) => ({ ...p, email: e.target.value }))}
            />
            <Input
              label={t('adminNew.invoiceImports.reviewScreen.iban')}
              value={supplierForm.iban}
              onChange={(e) => setSupplierForm((p) => ({ ...p, iban: e.target.value }))}
            />
            <Input
              label={t('adminNew.invoiceImports.reviewScreen.paymentTermsDays')}
              type="number"
              value={supplierForm.payment_terms_days}
              onChange={(e) => setSupplierForm((p) => ({ ...p, payment_terms_days: e.target.value }))}
            />
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setSupplierOpen(false)}>
              {t('adminNew.common.cancel')}
            </Button>
            <Button
              variant="gold"
              size="sm"
              disabled={createSupplierM.loading}
              onClick={() => void onCreateSupplier()}
            >
              {t('adminNew.common.save')}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
