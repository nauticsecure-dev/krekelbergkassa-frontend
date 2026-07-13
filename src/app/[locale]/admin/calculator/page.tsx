'use client';

import * as React from 'react';
import Link from 'next/link';
import { Archive, Calculator, Copy, Download, FilePlus2, Pencil, Receipt, Settings, UserPlus, X } from 'lucide-react';
import { AdminPageHeader } from '@/components/admin/AdminShell';
import { AdminContent, AdminSectionCard, AdminTable, AdminTableCard, AdminTableCell, AdminTableHead, AdminTableHeaderCell, AdminTableRow } from '@/components/admin/AdminUi';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { useMutation, useQuery } from '@/lib/hooks/useAsync';
import { customersService, invoicesService, pricingService } from '@/lib/services';
import { formatCurrency } from '@/lib/format';
import { useIntl } from '@/i18n/IntlProvider';
import { useToast } from '@/components/ui/ToastProvider';
import { getApiErrorMessage } from '@/lib/api-error';
import { AdminConfirmModal } from '@/components/admin/AdminConfirmModal';
import { calculatorResultTotalEuros, pricingTotalInclCents } from '@/lib/pricing-result';
import { cn } from '@/lib/cn';

const SERVICE_IDS = ['afspuiten', 'kranen', 'stalling', 'hal'];

export default function CalculatorPage() {
  const { locale, t } = useIntl();
  const { push } = useToast();

  const [lengthCm, setLengthCm] = React.useState('880');
  const [contractType, setContractType] = React.useState('winter');
  const [selectedServices, setSelectedServices] = React.useState<string[]>(['afspuiten']);
  const [customerId, setCustomerId] = React.useState('');
  const [result, setResult] = React.useState<Record<string, unknown> | null>(null);
  const [createConfirm, setCreateConfirm] = React.useState<'invoice' | 'quote' | null>(null);
  // Trello #68: dedicated edit flow — when set, runCalculation updates this record in place.
  const [editingRecordId, setEditingRecordId] = React.useState<string | null>(null);

  // Trello #68: records list filters
  const [recSearch, setRecSearch] = React.useState('');
  const [recStatus, setRecStatus] = React.useState('');
  const [recService, setRecService] = React.useState('');
  const [recCustomer, setRecCustomer] = React.useState('');
  const [recHasQuote, setRecHasQuote] = React.useState(''); // '', 'yes', 'no'
  const [recHasInvoice, setRecHasInvoice] = React.useState(''); // '', 'yes', 'no'
  const [recFrom, setRecFrom] = React.useState(''); // created from
  const [recTo, setRecTo] = React.useState(''); // created to
  const [recUpdatedFrom, setRecUpdatedFrom] = React.useState('');
  const [recUpdatedTo, setRecUpdatedTo] = React.useState('');
  const [recTotalMin, setRecTotalMin] = React.useState(''); // euros
  const [recTotalMax, setRecTotalMax] = React.useState(''); // euros
  const [archiveTarget, setArchiveTarget] = React.useState<string | null>(null);

  // Trello #68: bulk selection + export
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [bulkConfirm, setBulkConfirm] = React.useState<'archive' | null>(null);
  const [exporting, setExporting] = React.useState(false);

  const customers = useQuery(['calculator-customers'], () =>
    customersService.list({ per_page: 100 })
  );
  // Trello #68: shared filter query — drives both the list fetch and CSV export.
  const recordsQuery = React.useMemo(() => {
    const toCents = (euros: string) => {
      const n = Number(euros);
      return euros.trim() !== '' && Number.isFinite(n) ? Math.round(n * 100) : undefined;
    };
    return {
      search: recSearch || undefined,
      status: recStatus || undefined,
      service_type: recService || undefined,
      customer_id: recCustomer || undefined,
      has_quote: recHasQuote === 'yes' ? true : recHasQuote === 'no' ? false : undefined,
      has_invoice: recHasInvoice === 'yes' ? true : recHasInvoice === 'no' ? false : undefined,
      date_from: recFrom || undefined,
      date_to: recTo || undefined,
      updated_from: recUpdatedFrom || undefined,
      updated_to: recUpdatedTo || undefined,
      total_min: toCents(recTotalMin),
      total_max: toCents(recTotalMax),
    } as Record<string, string | number | boolean | undefined>;
  }, [
    recSearch,
    recStatus,
    recService,
    recCustomer,
    recHasQuote,
    recHasInvoice,
    recFrom,
    recTo,
    recUpdatedFrom,
    recUpdatedTo,
    recTotalMin,
    recTotalMax,
  ]);

  const records = useQuery(
    [
      'calculator-records',
      recSearch,
      recStatus,
      recService,
      recCustomer,
      recHasQuote,
      recHasInvoice,
      recFrom,
      recTo,
      recUpdatedFrom,
      recUpdatedTo,
      recTotalMin,
      recTotalMax,
    ],
    () => pricingService.calculatorRecords({ per_page: 50, ...recordsQuery })
  );
  const calculate = useMutation(pricingService.calculate);
  const preview = useMutation(pricingService.preview);
  const createInvoice = useMutation((payload: Record<string, unknown>) =>
    invoicesService.create(payload)
  );
  const duplicateRecord = useMutation((id: string) =>
    pricingService.duplicateCalculatorRecord(id)
  );
  const archiveRecord = useMutation((id: string) =>
    pricingService.archiveCalculatorRecord(id)
  );
  const bulkRecords = useMutation((args: { ids: string[]; action: 'archive' | 'duplicate' }) =>
    pricingService.bulkCalculatorRecords(args)
  );

  const loadRecord = async (id: string) => {
    try {
      const rec = await pricingService.calculatorRecord(id);
      const payload = (rec.payload ?? rec) as Record<string, unknown>;
      if (payload.length_cm != null) setLengthCm(String(payload.length_cm));
      if (payload.contract_type) setContractType(String(payload.contract_type));
      const svcs = (payload.services ?? payload.service_codes) as unknown;
      if (Array.isArray(svcs) && svcs.length) setSelectedServices(svcs.map(String));
      else if (rec.service_type) setSelectedServices([String(rec.service_type)]);
      if (payload.customer_id) setCustomerId(String(payload.customer_id));
      const res = (rec.result ?? rec) as Record<string, unknown>;
      setResult(res);
      // Trello #68: opening a record enters "edit in place" mode.
      setEditingRecordId(id);
      if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
      push({ tone: 'success', title: t('adminNew.calculator.records.loaded') });
    } catch (err) {
      push({
        tone: 'error',
        title: t('adminNew.calculator.toasts.failed'),
        message: getApiErrorMessage(err),
      });
    }
  };

  // Trello #68: create an offerte/factuur directly from a records row.
  const createFromRecord = async (id: string, mode: 'quote' | 'invoice') => {
    try {
      const rec = await pricingService.calculatorRecord(id);
      const payload = (rec.payload ?? rec) as Record<string, unknown>;
      const result = (rec.result ?? rec) as Record<string, unknown>;
      const custId = payload.customer_id ? String(payload.customer_id) : '';
      if (!custId) {
        await loadRecord(id);
        push({ tone: 'error', title: t('adminNew.calculator.toasts.selectCustomer') });
        return;
      }
      const svcs = (payload.services ?? payload.service_codes) as unknown;
      const svcLabel = Array.isArray(svcs) ? svcs.map(String).join(', ') : String(rec.service_type ?? '');
      const invoice = await createInvoice.mutate({
        customer_id: custId,
        source: 'calculator',
        lines: [
          {
            description: `${t('adminNew.calculator.linePrefix')} (${svcLabel}) - ${payload.length_cm ?? ''} cm`,
            quantity: 1,
            unit_price: pricingTotalInclCents(result),
            vat_rate: Number(result.vat_rate ?? 21),
          },
        ],
        calculator_record_id: id,
        calculator_mode: mode,
      });
      push({ tone: 'success', title: t('adminNew.calculator.records.created') });
      window.location.href = `/${locale}/admin/facturen/${invoice.id}`;
    } catch (err) {
      push({
        tone: 'error',
        title: t('adminNew.calculator.toasts.createFailed'),
        message: getApiErrorMessage(err),
      });
    }
  };

  const runRecordAction = async (label: string, fn: () => Promise<unknown>) => {
    try {
      await fn();
      push({ tone: 'success', title: label });
      await records.refetch();
    } catch (err) {
      push({
        tone: 'error',
        title: t('adminNew.common.operationFailed'),
        message: getApiErrorMessage(err),
      });
    }
  };

  // Trello #68: clear the dedicated-edit state and start a fresh calculation.
  const startNewRecord = () => {
    setEditingRecordId(null);
    setResult(null);
  };

  // Trello #68: bulk selection helpers.
  const rows = records.data?.data ?? [];
  const allSelected = rows.length > 0 && selectedIds.length === rows.length;
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };
  const toggleSelectAll = () => {
    setSelectedIds(allSelected ? [] : rows.map((r) => String(r.id)));
  };

  const runBulkAction = async (action: 'archive' | 'duplicate') => {
    if (selectedIds.length === 0) return;
    try {
      await bulkRecords.mutate({ ids: selectedIds, action });
      push({
        tone: 'success',
        title: t(
          action === 'archive'
            ? 'adminNew.calculator.records.bulkArchived'
            : 'adminNew.calculator.records.bulkDuplicated'
        ),
      });
      setSelectedIds([]);
      await records.refetch();
    } catch (err) {
      push({
        tone: 'error',
        title: t('adminNew.common.operationFailed'),
        message: getApiErrorMessage(err),
      });
    }
  };

  // Trello #68: export the currently filtered records to CSV.
  const runExport = async () => {
    setExporting(true);
    try {
      const blob = await pricingService.exportCalculatorRecords(recordsQuery);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `calculator-records-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      push({
        tone: 'error',
        title: t('adminNew.common.operationFailed'),
        message: getApiErrorMessage(err),
      });
    } finally {
      setExporting(false);
    }
  };

  const toggleService = (service: string) => {
    setSelectedServices((prev) =>
      prev.includes(service) ? prev.filter((s) => s !== service) : [...prev, service]
    );
  };

  const runCalculation = async () => {
    if (!lengthCm || selectedServices.length === 0) {
      push({ tone: 'error', title: t('adminNew.calculator.toasts.lengthAndServiceRequired') });
      return;
    }

    try {
      const payload = {
        length_cm: Number(lengthCm),
        contract_type: contractType,
        services: selectedServices,
        customer_id: customerId || undefined,
        persist: true,
        status: 'saved' as const,
        // Trello #68: update the open record in place instead of creating a new one.
        ...(editingRecordId ? { calculator_record_id: editingRecordId } : {}),
      };
      const [calc, prev] = await Promise.all([calculate.mutate(payload), preview.mutate(payload)]);
      setResult({ ...calc, preview: prev });
      void records.refetch();
    } catch (err) {
      push({
        tone: 'error',
        title: t('adminNew.calculator.toasts.failed'),
        message: getApiErrorMessage(err),
      });
    }
  };

  const resolveTotal = React.useMemo(() => {
    if (!result) return 0;
    return calculatorResultTotalEuros(result);
  }, [result]);

  const breakdown = React.useMemo(() => {
    if (!result || typeof result !== 'object') return [] as Array<{ key: string; value: string }>;
    const previewData =
      result.preview && typeof result.preview === 'object'
        ? (result.preview as Record<string, unknown>)
        : null;
    return [
      {
        key: t('adminNew.calculator.result.rangeMatch'),
        value: String(
          previewData?.range_label ??
            result.range_label ??
            previewData?.matched_range ??
            result.matched_range ??
            '—',
        ),
      },
      {
        key: t('adminNew.calculator.result.contractType'),
        value: contractType,
      },
      {
        key: t('adminNew.calculator.result.services'),
        value: selectedServices.join(', '),
      },
      {
        key: t('adminNew.calculator.result.vatRate'),
        value: `${previewData?.vat_rate ?? result.vat_rate ?? 21}%`,
      },
    ];
  }, [result, contractType, selectedServices, t]);

  const createFromCalculator = async (mode: 'quote' | 'invoice') => {
    if (!customerId) {
      push({ tone: 'error', title: t('adminNew.calculator.toasts.selectCustomer') });
      return;
    }
    if (!result) {
      push({ tone: 'error', title: t('adminNew.calculator.toasts.runCalculationFirst') });
      return;
    }

    try {
      const invoice = await createInvoice.mutate({
        customer_id: customerId,
        source: 'calculator',
        lines: [
          {
            description: `${t('adminNew.calculator.linePrefix')} (${selectedServices.join(', ')}) - ${lengthCm} cm`,
            quantity: 1,
            unit_price: pricingTotalInclCents(result),
            vat_rate: Number(result.vat_rate ?? 21),
          },
        ],
        calculator_mode: mode,
        ...(editingRecordId ? { calculator_record_id: editingRecordId } : {}),
        metadata: {
          contract_type: contractType,
        },
      });
      window.location.href = `/${locale}/admin/facturen/${invoice.id}`;
    } catch (err) {
      push({
        tone: 'error',
        title: t('adminNew.calculator.toasts.createFailed'),
        message: getApiErrorMessage(err),
      });
    }
  };

  return (
    <>
      <AdminPageHeader
        title={t('adminNew.calculator.title')}
        subtitle={t('adminNew.calculator.subtitle')}
        rightSlot={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Download className="h-4 w-4" />}
              onClick={() => void runExport()}
              disabled={exporting}
            >
              {exporting
                ? t('adminNew.calculator.records.exporting')
                : t('adminNew.calculator.records.exportCsv')}
            </Button>
            <Link href={`/${locale}/admin/calculator/pricing`}>
              <Button variant="outline" size="sm" leftIcon={<Settings className="h-4 w-4" />}>
                {t('adminNew.calculator.editPricing')}
              </Button>
            </Link>
            <Link href={`/${locale}/admin/calculator/history`}>
              <Button variant="outline" size="sm">
                {t('adminNew.calculator.history.title')}
              </Button>
            </Link>
          </div>
        }
        stats={[
          {
            label: t('adminNew.calculator.lengthCm'),
            value: `${lengthCm} cm`,
            icon: Calculator,
            tone: 'marine',
          },
          {
            label: t('adminNew.calculator.services'),
            value: selectedServices.length,
            tone: 'gold',
          },
          {
            label: t('adminNew.calculator.result.totalPrice'),
            value: result ? formatCurrency(resolveTotal, locale === 'en' ? 'en-GB' : 'nl-NL') : '—',
            icon: Receipt,
            tone: result ? 'success' : 'navy',
          },
          {
            label: t('adminNew.calculator.customerOptional'),
            value: customers.data?.meta?.total ?? customers.data?.data.length ?? 0,
            icon: UserPlus,
            tone: 'navy',
            loading: customers.loading,
          },
        ]}
      />

      <AdminContent className="grid gap-5 lg:grid-cols-[1fr_24rem]">
        <AdminSectionCard
          title={t('adminNew.calculator.title')}
          description={t('adminNew.calculator.subtitle')}
          icon={Calculator}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label={t('adminNew.calculator.lengthCm')}
              value={lengthCm}
              onChange={(e) => setLengthCm(e.target.value)}
              type="number"
            />
            <div>
              <label className="mb-1.5 block text-sm font-medium text-navy-800">
                {t('adminNew.calculator.contractType')}
              </label>
              <select
                className="input-base"
                value={contractType}
                onChange={(e) => setContractType(e.target.value)}
              >
                <option value="winter">{t('adminNew.stalling.type.winter')}</option>
                <option value="summer">{t('adminNew.stalling.type.summer')}</option>
                <option value="year">{t('adminNew.stalling.type.year')}</option>
                <option value="week">{t('adminNew.stalling.type.week')}</option>
              </select>
            </div>
          </div>

          <div className="mt-4">
            <div className="mb-2 text-sm font-medium text-navy-800">
              {t('adminNew.calculator.services')}
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {SERVICE_IDS.map((service) => {
                const active = selectedServices.includes(service);
                return (
                  <button
                    key={service}
                    type="button"
                    onClick={() => toggleService(service)}
                    className={cn(
                      'rounded-xl border px-3 py-2.5 text-left text-sm transition',
                      active
                        ? 'border-navy-900 bg-navy-900 text-white shadow-sm'
                        : 'surface-float-hover border-navy-100 bg-white text-navy-700 hover:border-marine-200'
                    )}
                  >
                    {t(`adminNew.calculator.servicesMap.${service}`)}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-4">
            <label className="mb-1.5 block text-sm font-medium text-navy-800">
              {t('adminNew.calculator.customerOptional')}
            </label>
            <select
              className="input-base"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
            >
              <option value="">{t('adminNew.calculator.selectCustomer')}</option>
              {(customers.data?.data ?? []).map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
          </div>

          {editingRecordId ? (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-marine-200/80 bg-marine-50/60 px-3 py-2">
              <div className="flex items-center gap-2 text-sm text-navy-800">
                <Pencil className="h-4 w-4 text-marine-700" />
                <span>
                  {t('adminNew.calculator.records.editingRecord')}{' '}
                  <span className="font-semibold">{editingRecordId}</span>
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<X className="h-4 w-4" />}
                onClick={startNewRecord}
              >
                {t('adminNew.calculator.records.newRecord')}
              </Button>
            </div>
          ) : null}

          <div className="mt-5 flex flex-wrap gap-2">
            <Button
              variant="gold"
              leftIcon={<Calculator className="h-4 w-4" />}
              onClick={runCalculation}
              disabled={calculate.loading || preview.loading}
            >
              {calculate.loading || preview.loading
                ? t('adminNew.calculator.calculating')
                : t('adminNew.calculator.calculate')}
            </Button>
            <Button
              variant="outline"
              leftIcon={<Receipt className="h-4 w-4" />}
              onClick={() => setCreateConfirm('quote')}
            >
              {t('adminNew.calculator.createQuote')}
            </Button>
            <Button
              variant="outline"
              leftIcon={<FilePlus2 className="h-4 w-4" />}
              onClick={() => setCreateConfirm('invoice')}
            >
              {t('adminNew.calculator.createInvoice')}
            </Button>
            <Button
              variant="ghost"
              leftIcon={<UserPlus className="h-4 w-4" />}
              onClick={() => (window.location.href = `/${locale}/admin/klanten`)}
            >
              {t('adminNew.calculator.newCustomer')}
            </Button>
          </div>
        </AdminSectionCard>

        <AdminSectionCard
          title={t('adminNew.calculator.result.title')}
          description={t('adminNew.calculator.result.empty')}
          icon={Receipt}
          className="self-start"
        >
          {!result ? (
            <div className="text-sm text-navy-500">
              {t('adminNew.calculator.result.empty')}
            </div>
          ) : (
            <div className="space-y-3 text-sm">
              {breakdown.map((item) => (
                <div key={item.key} className="rounded-xl border border-navy-100 bg-gradient-to-r from-white to-sand-50/40 px-3 py-2">
                  <div className="text-xs text-navy-500">{item.key}</div>
                  <div className="font-medium text-navy-900">{item.value}</div>
                </div>
              ))}
              <div className="rounded-xl border border-marine-200/80 bg-gradient-to-r from-marine-50 to-white px-3 py-2">
                <div className="text-xs text-navy-500">{t('adminNew.calculator.result.totalPrice')}</div>
                <div className="text-xl font-semibold text-navy-900">
                  {formatCurrency(resolveTotal, locale === 'en' ? 'en-GB' : 'nl-NL')}
                </div>
              </div>
              <details className="rounded-xl border border-navy-100 p-3">
                <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-navy-500">
                  {t('adminNew.calculator.result.rawApi')}
                </summary>
                <pre className="mt-2 max-h-64 overflow-auto text-xs text-navy-700">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </details>
            </div>
          )}
        </AdminSectionCard>
      </AdminContent>

      <AdminContent>
        <AdminSectionCard
          title={t('adminNew.calculator.records.title')}
          description={t('adminNew.calculator.records.subtitle')}
          icon={Calculator}
        >
          <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <Input
              placeholder={t('adminNew.calculator.records.searchPlaceholder')}
              value={recSearch}
              onChange={(e) => setRecSearch(e.target.value)}
              leftIcon={<Calculator className="h-4 w-4" />}
            />
            <select className="input-base" value={recCustomer} onChange={(e) => setRecCustomer(e.target.value)}>
              <option value="">{t('adminNew.calculator.records.allCustomers')}</option>
              {(customers.data?.data ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <select className="input-base" value={recService} onChange={(e) => setRecService(e.target.value)}>
              <option value="">{t('adminNew.calculator.records.allServices')}</option>
              {SERVICE_IDS.map((s) => (
                <option key={s} value={s}>
                  {t(`adminNew.calculator.servicesMap.${s}`)}
                </option>
              ))}
            </select>
            <select className="input-base" value={recStatus} onChange={(e) => setRecStatus(e.target.value)}>
              <option value="">{t('adminNew.calculator.records.allStatuses')}</option>
              <option value="saved">{t('adminNew.calculator.records.statusSaved')}</option>
              <option value="draft">{t('adminNew.calculator.records.statusDraft')}</option>
              <option value="converted_to_quote">{t('adminNew.calculator.records.statusQuote')}</option>
              <option value="converted_to_invoice">{t('adminNew.calculator.records.statusInvoice')}</option>
              <option value="paid">{t('adminNew.calculator.records.statusPaid')}</option>
              <option value="cancelled">{t('adminNew.calculator.records.statusCancelled')}</option>
              <option value="archived">{t('adminNew.calculator.records.statusArchived')}</option>
            </select>
            <select className="input-base" value={recHasQuote} onChange={(e) => setRecHasQuote(e.target.value)}>
              <option value="">{t('adminNew.calculator.records.quoteAny')}</option>
              <option value="yes">{t('adminNew.calculator.records.quoteYes')}</option>
              <option value="no">{t('adminNew.calculator.records.quoteNo')}</option>
            </select>
            <select className="input-base" value={recHasInvoice} onChange={(e) => setRecHasInvoice(e.target.value)}>
              <option value="">{t('adminNew.calculator.records.invoiceAny')}</option>
              <option value="yes">{t('adminNew.calculator.records.invoiceYes')}</option>
              <option value="no">{t('adminNew.calculator.records.invoiceNo')}</option>
            </select>
          </div>

          <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-navy-500">
                {t('adminNew.calculator.records.createdRange')}
              </label>
              <div className="flex gap-2">
                <Input
                  type="date"
                  aria-label={t('adminNew.calculator.records.dateFrom')}
                  value={recFrom}
                  onChange={(e) => setRecFrom(e.target.value)}
                />
                <Input
                  type="date"
                  aria-label={t('adminNew.calculator.records.dateTo')}
                  value={recTo}
                  onChange={(e) => setRecTo(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-navy-500">
                {t('adminNew.calculator.records.updatedRange')}
              </label>
              <div className="flex gap-2">
                <Input
                  type="date"
                  aria-label={t('adminNew.calculator.records.updatedFrom')}
                  value={recUpdatedFrom}
                  onChange={(e) => setRecUpdatedFrom(e.target.value)}
                />
                <Input
                  type="date"
                  aria-label={t('adminNew.calculator.records.updatedTo')}
                  value={recUpdatedTo}
                  onChange={(e) => setRecUpdatedTo(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-navy-500">
                {t('adminNew.calculator.records.totalRange')}
              </label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min={0}
                  placeholder={t('adminNew.calculator.records.totalMin')}
                  aria-label={t('adminNew.calculator.records.totalMin')}
                  value={recTotalMin}
                  onChange={(e) => setRecTotalMin(e.target.value)}
                />
                <Input
                  type="number"
                  min={0}
                  placeholder={t('adminNew.calculator.records.totalMax')}
                  aria-label={t('adminNew.calculator.records.totalMax')}
                  value={recTotalMax}
                  onChange={(e) => setRecTotalMax(e.target.value)}
                />
              </div>
            </div>
          </div>

          {selectedIds.length > 0 ? (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-navy-200 bg-navy-50/60 px-3 py-2">
              <div className="text-sm font-medium text-navy-800">
                {t('adminNew.calculator.records.selectedCount').replace(
                  '{count}',
                  String(selectedIds.length)
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={<Copy className="h-4 w-4" />}
                  disabled={bulkRecords.loading}
                  onClick={() => void runBulkAction('duplicate')}
                >
                  {t('adminNew.calculator.records.duplicate')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<Archive className="h-4 w-4" />}
                  disabled={bulkRecords.loading}
                  onClick={() => setBulkConfirm('archive')}
                >
                  {t('adminNew.calculator.records.archive')}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={<X className="h-4 w-4" />}
                  onClick={() => setSelectedIds([])}
                >
                  {t('adminNew.calculator.records.clearSelection')}
                </Button>
              </div>
            </div>
          ) : null}

          {(records.data?.data ?? []).length === 0 ? (
            <div className="text-sm text-navy-500">{t('adminNew.calculator.records.empty')}</div>
          ) : (
            <AdminTableCard>
              <AdminTable minWidth={1100}>
                <AdminTableHead>
                  <tr>
                    <AdminTableHeaderCell className="w-10">
                      <input
                        type="checkbox"
                        className="h-4 w-4 cursor-pointer rounded border-navy-300 text-marine-700 focus:ring-marine-500"
                        aria-label={t('adminNew.calculator.records.selectAll')}
                        checked={allSelected}
                        onChange={toggleSelectAll}
                      />
                    </AdminTableHeaderCell>
                    <AdminTableHeaderCell>{t('adminNew.calculator.records.number')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{t('adminNew.calculator.records.date')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{t('adminNew.calculator.records.customer')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{t('adminNew.calculator.records.service')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{t('adminNew.calculator.records.status')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{t('adminNew.calculator.records.documents')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{t('adminNew.calculator.records.createdBy')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{t('adminNew.calculator.records.total')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell className="text-right">&nbsp;</AdminTableHeaderCell>
                  </tr>
                </AdminTableHead>
                <tbody>
                  {(records.data?.data ?? []).map((rec) => {
                    const id = String(rec.id);
                    const totalEuros =
                      rec.total_amount_euros != null
                        ? Number(rec.total_amount_euros)
                        : Number(rec.total_amount ?? 0) / 100;
                    const actions = (rec.available_actions ?? {}) as Record<string, boolean>;
                    return (
                      <AdminTableRow
                        key={id}
                        className="cursor-pointer"
                        onClick={() => void loadRecord(id)}
                      >
                        <AdminTableCell onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            className="h-4 w-4 cursor-pointer rounded border-navy-300 text-marine-700 focus:ring-marine-500"
                            aria-label={t('adminNew.calculator.records.selectRow')}
                            checked={selectedIds.includes(id)}
                            onChange={() => toggleSelect(id)}
                          />
                        </AdminTableCell>
                        <AdminTableCell className="font-semibold text-marine-700">
                          {String(rec.calculator_number ?? rec.number ?? rec.id)}
                        </AdminTableCell>
                        <AdminTableCell className="whitespace-nowrap">
                          {String(rec.created_date ?? (rec.created_at ? new Date(String(rec.created_at)).toLocaleDateString() : '—'))}
                        </AdminTableCell>
                        <AdminTableCell>
                          <div>{String(rec.customer_name ?? '—')}</div>
                          {rec.boat_name ? (
                            <div className="text-xs text-navy-500">{String(rec.boat_name)}</div>
                          ) : null}
                        </AdminTableCell>
                        <AdminTableCell className="capitalize">{String(rec.service_type ?? '—')}</AdminTableCell>
                        <AdminTableCell>
                          <Badge tone={String(rec.status) === 'archived' ? 'sand' : 'marine'}>
                            {String(rec.status ?? 'saved')}
                          </Badge>
                        </AdminTableCell>
                        <AdminTableCell>
                          <div className="flex gap-1">
                            {rec.has_quote ? (
                              <Badge tone="navy">{t('adminNew.calculator.records.quote')}</Badge>
                            ) : null}
                            {rec.has_invoice ? (
                              <Badge tone="success">{t('adminNew.calculator.records.invoice')}</Badge>
                            ) : null}
                            {!rec.has_quote && !rec.has_invoice ? (
                              <span className="text-xs text-navy-400">—</span>
                            ) : null}
                          </div>
                        </AdminTableCell>
                        <AdminTableCell className="text-sm text-navy-600">
                          {String(rec.created_by_name ?? '—')}
                        </AdminTableCell>
                        <AdminTableCell className="font-semibold text-navy-900">
                          {formatCurrency(totalEuros, locale === 'en' ? 'en-GB' : 'nl-NL')}
                        </AdminTableCell>
                        <AdminTableCell onClick={(e) => e.stopPropagation()}>
                          <div className="flex flex-wrap justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => void loadRecord(id)}>
                              {t('adminNew.calculator.records.open')}
                            </Button>
                            {actions.create_quote !== false && !rec.has_quote ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => void createFromRecord(id, 'quote')}
                              >
                                {t('adminNew.calculator.records.createQuote')}
                              </Button>
                            ) : null}
                            {actions.create_invoice !== false && !rec.has_invoice ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => void createFromRecord(id, 'invoice')}
                              >
                                {t('adminNew.calculator.records.createInvoice')}
                              </Button>
                            ) : null}
                            {actions.duplicate !== false ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={duplicateRecord.loading}
                                onClick={() =>
                                  void runRecordAction(
                                    t('adminNew.calculator.records.duplicated'),
                                    () => duplicateRecord.mutate(id)
                                  )
                                }
                              >
                                {t('adminNew.calculator.records.duplicate')}
                              </Button>
                            ) : null}
                            {actions.archive !== false && String(rec.status) !== 'archived' ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setArchiveTarget(id)}
                              >
                                {t('adminNew.calculator.records.archive')}
                              </Button>
                            ) : null}
                          </div>
                        </AdminTableCell>
                      </AdminTableRow>
                    );
                  })}
                </tbody>
              </AdminTable>
            </AdminTableCard>
          )}
        </AdminSectionCard>
      </AdminContent>

      <AdminConfirmModal
        open={!!createConfirm}
        onClose={() => setCreateConfirm(null)}
        onConfirm={async () => {
          if (!createConfirm) return;
          await createFromCalculator(createConfirm);
          setCreateConfirm(null);
        }}
        title={
          createConfirm === 'invoice'
            ? t('adminNew.calculator.createInvoice')
            : t('adminNew.calculator.createQuote')
        }
        message={
          createConfirm === 'invoice'
            ? t('adminNew.calculator.confirmCreateInvoice')
            : t('adminNew.calculator.confirmCreateQuote')
        }
        confirmLabel={t('adminNew.common.confirm')}
        cancelLabel={t('adminNew.common.cancel')}
        variant="primary"
        icon={FilePlus2}
        loading={createInvoice.loading}
      />

      <AdminConfirmModal
        open={!!archiveTarget}
        onClose={() => setArchiveTarget(null)}
        onConfirm={async () => {
          if (!archiveTarget) return;
          await runRecordAction(
            t('adminNew.calculator.records.archived'),
            () => archiveRecord.mutate(archiveTarget)
          );
          setArchiveTarget(null);
        }}
        title={t('adminNew.calculator.records.archive')}
        message={t('adminNew.calculator.records.confirmArchive')}
        confirmLabel={t('adminNew.calculator.records.archive')}
        cancelLabel={t('adminNew.common.cancel')}
        variant="danger"
        loading={archiveRecord.loading}
      />

      <AdminConfirmModal
        open={!!bulkConfirm}
        onClose={() => setBulkConfirm(null)}
        onConfirm={async () => {
          if (bulkConfirm !== 'archive') return;
          await runBulkAction('archive');
          setBulkConfirm(null);
        }}
        title={t('adminNew.calculator.records.archive')}
        message={t('adminNew.calculator.records.confirmBulkArchive').replace(
          '{count}',
          String(selectedIds.length)
        )}
        confirmLabel={t('adminNew.calculator.records.archive')}
        cancelLabel={t('adminNew.common.cancel')}
        variant="danger"
        loading={bulkRecords.loading}
      />
    </>
  );
}
