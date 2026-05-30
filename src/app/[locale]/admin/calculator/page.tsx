'use client';

import * as React from 'react';
import Link from 'next/link';
import { Calculator, FilePlus2, Receipt, Settings, UserPlus } from 'lucide-react';
import { AdminPageHeader } from '@/components/admin/AdminShell';
import { AdminContent, AdminSectionCard, AdminTable, AdminTableCard, AdminTableCell, AdminTableHead, AdminTableHeaderCell, AdminTableRow } from '@/components/admin/AdminUi';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
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

  const customers = useQuery(['calculator-customers'], () =>
    customersService.list({ per_page: 100 })
  );
  const records = useQuery(['calculator-records'], () =>
    pricingService.calculatorRecords({ per_page: 50 })
  );
  const calculate = useMutation(pricingService.calculate);
  const preview = useMutation(pricingService.preview);
  const createInvoice = useMutation((payload: Record<string, unknown>) =>
    invoicesService.create(payload)
  );

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
      };
      const [calc, prev] = await Promise.all([calculate.mutate(payload), preview.mutate(payload)]);
      setResult({ ...calc, preview: prev });
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
        metadata: {
          contract_type: contractType,
          mode,
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
        <AdminSectionCard title={t('adminNew.calculator.records.title')} icon={Calculator}>
          {(records.data?.data ?? []).length === 0 ? (
            <div className="text-sm text-navy-500">{t('adminNew.calculator.records.empty')}</div>
          ) : (
            <AdminTableCard>
              <AdminTable minWidth={720}>
                <AdminTableHead>
                  <tr>
                    <AdminTableHeaderCell>{t('adminNew.calculator.records.number')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{t('adminNew.calculator.records.date')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{t('adminNew.calculator.records.service')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{t('adminNew.calculator.records.total')}</AdminTableHeaderCell>
                  </tr>
                </AdminTableHead>
                <tbody>
                  {(records.data?.data ?? []).map((rec) => (
                    <AdminTableRow key={String(rec.id)}>
                      <AdminTableCell className="font-semibold">{String(rec.number ?? rec.id)}</AdminTableCell>
                      <AdminTableCell>{rec.created_at ? new Date(String(rec.created_at)).toLocaleDateString() : '—'}</AdminTableCell>
                      <AdminTableCell>{String(rec.service_type ?? '—')}</AdminTableCell>
                      <AdminTableCell>
                        {formatCurrency(Number(rec.total_amount ?? 0) / 100, locale === 'en' ? 'en-GB' : 'nl-NL')}
                      </AdminTableCell>
                    </AdminTableRow>
                  ))}
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
    </>
  );
}
