'use client';

import * as React from 'react';
import { Globe2, Save, ShieldCheck, Sliders, TestTube2 } from 'lucide-react';
import { AdminPageHeader } from '@/components/admin/AdminShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { settingsService } from '@/lib/services';
import { useMutation, useQuery } from '@/lib/hooks/useAsync';
import { useToast } from '@/components/ui/ToastProvider';
import { LoadingState, ErrorState } from '@/components/admin/DataState';
import { useIntl } from '@/i18n/IntlProvider';

export default function SettingsPage() {
  const { push } = useToast();
  const { t } = useIntl();

  const [activeTab, setActiveTab] = React.useState<
    'company' | 'invoicing' | 'payments' | 'locales'
  >('company');

  const settings = useQuery(['settings'], () => settingsService.get());
  const updateCompany = useMutation(settingsService.updateCompany);
  const updateInvoicing = useMutation(settingsService.updateInvoicing);
  const updatePayments = useMutation(settingsService.updatePayments);
  const updateLocales = useMutation(settingsService.updateLocales);
  const testMollie = useMutation(settingsService.testMollie);

  const [companyForm, setCompanyForm] = React.useState({
    name: '',
    kvk: '',
    vat_number: '',
    email: '',
    phone: '',
    iban: '',
    street: '',
    postal_code: '',
    city: '',
    country: '',
  });

  const [invoicingForm, setInvoicingForm] = React.useState({
    invoice_prefix: '',
    default_due_days: '14',
    currency: 'EUR',
    default_vat_rate: '21',
    reminder_first_days: '7',
    reminder_second_days: '14',
    reminder_final_days: '21',
  });

  const [paymentsForm, setPaymentsForm] = React.useState({
    provider: 'mollie',
    test_mode: true,
    enabled_methods: 'cash,pin,invoice,ideal,creditcard',
  });

  const [localeForm, setLocaleForm] = React.useState({
    default_locale: 'nl-NL',
    fallback_locale: 'en-GB',
    supported_locales: 'nl-NL,en-GB,de-DE,fr-FR',
  });

  React.useEffect(() => {
    const s = settings.data;
    if (!s) return;
    setCompanyForm({
      name: s.company.name || '',
      kvk: s.company.kvk || '',
      vat_number: s.company.vat_number || '',
      email: s.company.email || '',
      phone: s.company.phone || '',
      iban: s.company.iban || '',
      street: s.company.address?.street || '',
      postal_code: s.company.address?.postal_code || '',
      city: s.company.address?.city || '',
      country: s.company.address?.country || '',
    });
    setInvoicingForm({
      invoice_prefix: s.invoicing.invoice_prefix || '',
      default_due_days: String(s.invoicing.default_due_days ?? 14),
      currency: s.invoicing.currency || 'EUR',
      default_vat_rate: String(s.invoicing.default_vat_rate ?? 21),
      reminder_first_days: String(s.invoicing.reminder_first_days ?? 7),
      reminder_second_days: String(s.invoicing.reminder_second_days ?? 14),
      reminder_final_days: String(s.invoicing.reminder_final_days ?? 21),
    });
    setPaymentsForm({
      provider: s.payments.provider || 'mollie',
      test_mode: Boolean(s.payments.test_mode),
      enabled_methods: (s.payments.enabled_methods || []).join(','),
    });
    setLocaleForm({
      default_locale: s.locales.default_locale || 'nl-NL',
      fallback_locale: s.locales.fallback_locale || 'en-GB',
      supported_locales: (s.locales.supported_locales || []).join(','),
    });
  }, [settings.data]);

  const save = async (fn: () => Promise<unknown>, successMessage: string) => {
    try {
      await fn();
      push({ tone: 'success', title: successMessage });
      await settings.refetch();
    } catch (err) {
      push({
        tone: 'error',
        title: t('adminNew.common.operationFailed'),
        message: err instanceof Error ? err.message : undefined,
      });
    }
  };

  return (
    <>
      <AdminPageHeader
        title={t('adminNew.settings.title')}
        subtitle={t('adminNew.settings.subtitle')}
      />
      <div className="space-y-4 px-4 py-6 sm:px-6">
        {settings.loading ? (
          <LoadingState label={t('adminNew.settings.loading')} variant="detail" />
        ) : null}
        {!settings.loading && settings.error ? (
          <ErrorState message={settings.error} onRetry={() => void settings.refetch()} />
        ) : null}

        {!settings.loading && settings.data ? (
          <>
            <Card className="p-2">
              <div className="grid gap-2 sm:grid-cols-4">
                <TabButton
                  active={activeTab === 'company'}
                  onClick={() => setActiveTab('company')}
                  icon={<ShieldCheck className="h-4 w-4" />}
                  label={t('adminNew.settings.tabs.company')}
                />
                <TabButton
                  active={activeTab === 'invoicing'}
                  onClick={() => setActiveTab('invoicing')}
                  icon={<Sliders className="h-4 w-4" />}
                  label={t('adminNew.settings.tabs.invoicing')}
                />
                <TabButton
                  active={activeTab === 'payments'}
                  onClick={() => setActiveTab('payments')}
                  icon={<TestTube2 className="h-4 w-4" />}
                  label={t('adminNew.settings.tabs.payments')}
                />
                <TabButton
                  active={activeTab === 'locales'}
                  onClick={() => setActiveTab('locales')}
                  icon={<Globe2 className="h-4 w-4" />}
                  label={t('adminNew.settings.tabs.locales')}
                />
              </div>
            </Card>

            {activeTab === 'company' ? (
              <Card className="p-5">
                <h2 className="text-base font-semibold text-navy-900">
                  {t('adminNew.settings.company.title')}
                </h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <Input
                    label={t('adminNew.common.name')}
                    value={companyForm.name}
                    onChange={(e) => setCompanyForm((p) => ({ ...p, name: e.target.value }))}
                  />
                  <Input
                    label={t('adminNew.common.email')}
                    value={companyForm.email}
                    onChange={(e) => setCompanyForm((p) => ({ ...p, email: e.target.value }))}
                  />
                  <Input
                    label={t('adminNew.settings.company.kvk')}
                    value={companyForm.kvk}
                    onChange={(e) => setCompanyForm((p) => ({ ...p, kvk: e.target.value }))}
                  />
                  <Input
                    label={t('adminNew.settings.company.vatNumber')}
                    value={companyForm.vat_number}
                    onChange={(e) =>
                      setCompanyForm((p) => ({ ...p, vat_number: e.target.value }))
                    }
                  />
                  <Input
                    label={t('adminNew.common.phone')}
                    value={companyForm.phone}
                    onChange={(e) => setCompanyForm((p) => ({ ...p, phone: e.target.value }))}
                  />
                  <Input
                    label={t('adminNew.settings.company.iban')}
                    value={companyForm.iban}
                    onChange={(e) => setCompanyForm((p) => ({ ...p, iban: e.target.value }))}
                  />
                  <Input
                    label={t('adminNew.settings.company.street')}
                    value={companyForm.street}
                    onChange={(e) => setCompanyForm((p) => ({ ...p, street: e.target.value }))}
                  />
                  <Input
                    label={t('adminNew.settings.company.postalCode')}
                    value={companyForm.postal_code}
                    onChange={(e) =>
                      setCompanyForm((p) => ({ ...p, postal_code: e.target.value }))
                    }
                  />
                  <Input
                    label={t('adminNew.settings.company.city')}
                    value={companyForm.city}
                    onChange={(e) => setCompanyForm((p) => ({ ...p, city: e.target.value }))}
                  />
                  <Input
                    label={t('adminNew.settings.company.country')}
                    value={companyForm.country}
                    onChange={(e) => setCompanyForm((p) => ({ ...p, country: e.target.value }))}
                  />
                </div>
                <div className="mt-5 flex justify-end">
                  <Button
                    variant="gold"
                    leftIcon={<Save className="h-4 w-4" />}
                    onClick={() =>
                      void save(
                        () =>
                          updateCompany.mutate({
                            name: companyForm.name,
                            kvk: companyForm.kvk || null,
                            vat_number: companyForm.vat_number || null,
                            email: companyForm.email,
                            phone: companyForm.phone || null,
                            iban: companyForm.iban || null,
                            address: {
                              street: companyForm.street,
                              postal_code: companyForm.postal_code,
                              city: companyForm.city,
                              country: companyForm.country,
                            },
                          }),
                        t('adminNew.settings.toasts.companySaved')
                      )
                    }
                  >
                    {t('adminNew.common.save')}
                  </Button>
                </div>
              </Card>
            ) : null}

            {activeTab === 'invoicing' ? (
              <Card className="p-5">
                <h2 className="text-base font-semibold text-navy-900">
                  {t('adminNew.settings.invoicing.title')}
                </h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <Input
                    label={t('adminNew.settings.invoicing.invoicePrefix')}
                    value={invoicingForm.invoice_prefix}
                    onChange={(e) =>
                      setInvoicingForm((p) => ({ ...p, invoice_prefix: e.target.value }))
                    }
                  />
                  <Input
                    label={t('adminNew.settings.invoicing.defaultDueDays')}
                    value={invoicingForm.default_due_days}
                    onChange={(e) =>
                      setInvoicingForm((p) => ({ ...p, default_due_days: e.target.value }))
                    }
                    type="number"
                  />
                  <Input
                    label={t('adminNew.settings.invoicing.currency')}
                    value={invoicingForm.currency}
                    onChange={(e) =>
                      setInvoicingForm((p) => ({ ...p, currency: e.target.value }))
                    }
                  />
                  <Input
                    label={t('adminNew.settings.invoicing.defaultVatRate')}
                    value={invoicingForm.default_vat_rate}
                    onChange={(e) =>
                      setInvoicingForm((p) => ({ ...p, default_vat_rate: e.target.value }))
                    }
                    type="number"
                  />
                  <Input
                    label={t('adminNew.settings.invoicing.reminderFirstDays')}
                    value={invoicingForm.reminder_first_days}
                    onChange={(e) =>
                      setInvoicingForm((p) => ({ ...p, reminder_first_days: e.target.value }))
                    }
                    type="number"
                  />
                  <Input
                    label={t('adminNew.settings.invoicing.reminderSecondDays')}
                    value={invoicingForm.reminder_second_days}
                    onChange={(e) =>
                      setInvoicingForm((p) => ({ ...p, reminder_second_days: e.target.value }))
                    }
                    type="number"
                  />
                  <Input
                    label={t('adminNew.settings.invoicing.reminderFinalDays')}
                    value={invoicingForm.reminder_final_days}
                    onChange={(e) =>
                      setInvoicingForm((p) => ({ ...p, reminder_final_days: e.target.value }))
                    }
                    type="number"
                  />
                </div>
                <div className="mt-5 flex justify-end">
                  <Button
                    variant="gold"
                    leftIcon={<Save className="h-4 w-4" />}
                    onClick={() =>
                      void save(
                        () =>
                          updateInvoicing.mutate({
                            invoice_prefix: invoicingForm.invoice_prefix,
                            default_due_days: Number(invoicingForm.default_due_days),
                            currency: invoicingForm.currency,
                            default_vat_rate: Number(invoicingForm.default_vat_rate),
                            reminder_first_days: Number(invoicingForm.reminder_first_days),
                            reminder_second_days: Number(invoicingForm.reminder_second_days),
                            reminder_final_days: Number(invoicingForm.reminder_final_days),
                          }),
                        t('adminNew.settings.toasts.invoicingSaved')
                      )
                    }
                  >
                    {t('adminNew.common.save')}
                  </Button>
                </div>
              </Card>
            ) : null}

            {activeTab === 'payments' ? (
              <Card className="p-5">
                <h2 className="text-base font-semibold text-navy-900">
                  {t('adminNew.settings.payments.title')}
                </h2>
                <div className="mt-2 flex items-center gap-2">
                  <Badge tone={settings.data.payments.connected ? 'success' : 'danger'} dot>
                    {settings.data.payments.connected
                      ? t('adminNew.settings.payments.connected')
                      : t('adminNew.settings.payments.notConnected')}
                  </Badge>
                  <Badge tone="navy">{t('adminNew.settings.payments.secretsBackendOnly')}</Badge>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-navy-800">
                      {t('adminNew.settings.payments.provider')}
                    </label>
                    <select
                      className="input-base"
                      value={paymentsForm.provider}
                      onChange={(e) =>
                        setPaymentsForm((p) => ({ ...p, provider: e.target.value }))
                      }
                    >
                      <option value="mollie">Mollie</option>
                      <option value="manual">Manual</option>
                    </select>
                  </div>
                  <Input
                    label={t('adminNew.settings.payments.enabledMethods')}
                    value={paymentsForm.enabled_methods}
                    onChange={(e) =>
                      setPaymentsForm((p) => ({ ...p, enabled_methods: e.target.value }))
                    }
                  />
                </div>
                <div className="mt-3">
                  <label className="inline-flex items-center gap-2 text-sm text-navy-700">
                    <input
                      type="checkbox"
                      checked={paymentsForm.test_mode}
                      onChange={(e) =>
                        setPaymentsForm((p) => ({ ...p, test_mode: e.target.checked }))
                      }
                    />
                    {t('adminNew.settings.payments.testMode')}
                  </label>
                </div>
                <div className="mt-5 flex flex-wrap justify-end gap-2">
                  <Button
                    variant="outline"
                    leftIcon={<TestTube2 className="h-4 w-4" />}
                    onClick={() =>
                      void save(
                        () => testMollie.mutate(),
                        t('adminNew.settings.toasts.mollieTestSuccess')
                      )
                    }
                  >
                    {t('adminNew.settings.payments.testConnection')}
                  </Button>
                  <Button
                    variant="gold"
                    leftIcon={<Save className="h-4 w-4" />}
                    onClick={() =>
                      void save(
                        () =>
                          updatePayments.mutate({
                            provider: paymentsForm.provider,
                            test_mode: paymentsForm.test_mode,
                            enabled_methods: paymentsForm.enabled_methods
                              .split(',')
                              .map((x) => x.trim())
                              .filter(Boolean),
                          }),
                        t('adminNew.settings.toasts.paymentsSaved')
                      )
                    }
                  >
                    {t('adminNew.common.save')}
                  </Button>
                </div>
              </Card>
            ) : null}

            {activeTab === 'locales' ? (
              <Card className="p-5">
                <h2 className="text-base font-semibold text-navy-900">
                  {t('adminNew.settings.locales.title')}
                </h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <Input
                    label={t('adminNew.settings.locales.defaultLocale')}
                    value={localeForm.default_locale}
                    onChange={(e) =>
                      setLocaleForm((p) => ({ ...p, default_locale: e.target.value }))
                    }
                  />
                  <Input
                    label={t('adminNew.settings.locales.fallbackLocale')}
                    value={localeForm.fallback_locale}
                    onChange={(e) =>
                      setLocaleForm((p) => ({ ...p, fallback_locale: e.target.value }))
                    }
                  />
                </div>
                <div className="mt-3">
                  <Input
                    label={t('adminNew.settings.locales.supportedLocales')}
                    value={localeForm.supported_locales}
                    onChange={(e) =>
                      setLocaleForm((p) => ({ ...p, supported_locales: e.target.value }))
                    }
                  />
                </div>
                <div className="mt-5 flex justify-end">
                  <Button
                    variant="gold"
                    leftIcon={<Save className="h-4 w-4" />}
                    onClick={() =>
                      void save(
                        () =>
                          updateLocales.mutate({
                            default_locale: localeForm.default_locale,
                            fallback_locale: localeForm.fallback_locale,
                            supported_locales: localeForm.supported_locales
                              .split(',')
                              .map((x) => x.trim())
                              .filter(Boolean),
                          }),
                        t('adminNew.settings.toasts.localesSaved')
                      )
                    }
                  >
                    {t('adminNew.common.save')}
                  </Button>
                </div>
              </Card>
            ) : null}
          </>
        ) : null}
      </div>
    </>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition ${
        active
          ? 'border-navy-900 bg-navy-900 text-white'
          : 'border-navy-100 bg-white text-navy-700 hover:bg-sand-50'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
