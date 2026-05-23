'use client';

import * as React from 'react';
import { Calculator, FilePlus2, Receipt, UserPlus } from 'lucide-react';
import { AdminPageHeader } from '@/components/admin/AdminShell';
import { AdminContent, AdminPanel } from '@/components/admin/AdminUi';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useMutation, useQuery } from '@/lib/hooks/useAsync';
import { customersService, invoicesService, pricingService } from '@/lib/services';
import { formatCurrency } from '@/lib/format';
import { useIntl } from '@/i18n/IntlProvider';
import { useToast } from '@/components/ui/ToastProvider';

const SERVICE_IDS = ['afspuiten', 'kranen', 'stalling', 'hal'];

export default function CalculatorPage() {
  const { locale, t } = useIntl();
  const { push } = useToast();

  const [lengthCm, setLengthCm] = React.useState('880');
  const [contractType, setContractType] = React.useState('winter');
  const [selectedServices, setSelectedServices] = React.useState<string[]>(['afspuiten']);
  const [customerId, setCustomerId] = React.useState('');
  const [result, setResult] = React.useState<Record<string, unknown> | null>(null);

  const customers = useQuery(['calculator-customers'], () =>
    customersService.list({ per_page: 100 })
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
        locale: locale === 'en' ? 'en-GB' : 'nl-NL',
        channel: 'calculator',
      };
      const [calc, prev] = await Promise.all([calculate.mutate(payload), preview.mutate(payload)]);
      setResult({ ...calc, preview: prev });
    } catch (err) {
      push({
        tone: 'error',
        title: t('adminNew.calculator.toasts.failed'),
        message: err instanceof Error ? err.message : undefined,
      });
    }
  };

  const resolveTotal = React.useMemo(() => {
    if (!result) return 0;
    const direct = Number(result.total_amount_euros ?? result.total_euros ?? result.total ?? 0);
    if (Number.isFinite(direct) && direct > 0) return direct;
    const nested =
      result.preview && typeof result.preview === 'object'
        ? Number((result.preview as Record<string, unknown>).total_amount_euros ?? 0)
        : 0;
    return Number.isFinite(nested) ? nested : 0;
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
        value: String(previewData?.matched_range ?? result.matched_range ?? '-'),
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
            unit_price: Math.round(resolveTotal * 100),
            vat_rate: 21,
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
        message: err instanceof Error ? err.message : undefined,
      });
    }
  };

  return (
    <>
      <AdminPageHeader
        title={t('adminNew.calculator.title')}
        subtitle={t('adminNew.calculator.subtitle')}
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
        <AdminPanel title={t('adminNew.calculator.title')} description={t('adminNew.calculator.subtitle')}>
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
                    onClick={() => toggleService(service)}
                    className={`rounded-lg border px-3 py-2 text-left text-sm ${
                      active
                        ? 'border-navy-900 bg-navy-900 text-white'
                        : 'border-navy-100 bg-white text-navy-700 hover:bg-sand-50'
                    }`}
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
              onClick={() => void createFromCalculator('quote')}
            >
              {t('adminNew.calculator.createQuote')}
            </Button>
            <Button
              variant="outline"
              leftIcon={<FilePlus2 className="h-4 w-4" />}
              onClick={() => void createFromCalculator('invoice')}
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
        </AdminPanel>

        <AdminPanel title={t('adminNew.calculator.result.title')}>
          {!result ? (
            <div className="mt-3 text-sm text-navy-500">
              {t('adminNew.calculator.result.empty')}
            </div>
          ) : (
            <div className="mt-3 space-y-3 text-sm">
              {breakdown.map((item) => (
                <div key={item.key} className="rounded-lg border border-navy-100 px-3 py-2">
                  <div className="text-xs text-navy-500">{item.key}</div>
                  <div className="font-medium text-navy-900">{item.value}</div>
                </div>
              ))}
              <div className="rounded-lg border border-navy-100 bg-sand-50 px-3 py-2">
                <div className="text-xs text-navy-500">{t('adminNew.calculator.result.totalPrice')}</div>
                <div className="text-xl font-semibold text-navy-900">
                  {formatCurrency(resolveTotal, locale === 'en' ? 'en-GB' : 'nl-NL')}
                </div>
              </div>
              <details className="rounded-lg border border-navy-100 p-3">
                <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-navy-500">
                  {t('adminNew.calculator.result.rawApi')}
                </summary>
                <pre className="mt-2 max-h-64 overflow-auto text-xs text-navy-700">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </details>
            </div>
          )}
        </AdminPanel>
      </AdminContent>
    </>
  );
}
