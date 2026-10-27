'use client';
import Link from 'next/link';
import { usePermission } from '@/lib/permissions';
import { IntegrationSettingsPanel } from '@/components/admin/IntegrationSettingsPanel';
import { ContactSubjectsEditor } from '@/components/cms/ContactSubjectsEditor';
import { SearchSelect } from '@/components/ui/SearchSelect';

import * as React from 'react';
import { Globe2, Mail, Save, ShieldCheck, Sliders, TestTube2 } from 'lucide-react';
import { AdminPageHeader } from '@/components/admin/AdminShell';
import { AdminContent, AdminSectionCard, AdminTabBar } from '@/components/admin/AdminUi';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { settingsService } from '@/lib/services';
import { useMutation, useQuery } from '@/lib/hooks/useAsync';
import { useToast } from '@/components/ui/ToastProvider';
import { getApiErrorMessage } from '@/lib/api-error';
import { LoadingState, ErrorState } from '@/components/admin/DataState';
import { useIntl } from '@/i18n/IntlProvider';

export default function SettingsPage() {
  const { push } = useToast();
  const { t, locale } = useIntl();
  const { can } = usePermission();
  const operational = can('settings.view');
  const canEdit = can(['settings.update', 'settings.financial.update']);
  const [search, setSearch] = React.useState('');

  const [activeTab, setActiveTab] = React.useState<
    'company' | 'invoicing' | 'payments' | 'locales' | 'email_ocr' | 'contact_subjects'
  >('company');
  React.useEffect(() => {
    const tab = window.location.hash.slice(1);
    if (['company', 'invoicing', 'payments', 'locales', 'email_ocr', 'contact_subjects'].includes(tab) && (operational || ['invoicing', 'payments'].includes(tab))) setActiveTab(tab as typeof activeTab);
    else if (!operational) setActiveTab('invoicing');
  }, [operational]);
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
  });

  const [paymentsForm, setPaymentsForm] = React.useState({
    provider: 'mollie',
    test_mode: true,
    pos_methods: [] as string[],
    online_methods: [] as string[],
  });

  const [localeForm, setLocaleForm] = React.useState({
    default_locale: 'nl-NL',
    fallback_locale: 'en-GB',
    supported_locales: ['nl-NL','en-GB','de-DE','fr-FR'],
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
    });
    setPaymentsForm({
      provider: s.payments.provider || 'mollie',
      test_mode: Boolean(s.payments.test_mode),
      pos_methods: s.payments.pos_methods || [],
      online_methods: s.payments.online_methods || [],
    });
    setLocaleForm({
      default_locale: s.locales.default_locale || 'nl-NL',
      fallback_locale: s.locales.fallback_locale || 'en-GB',
      supported_locales: s.locales.supported_locales || [],
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
        message: getApiErrorMessage(err),
      });
    }
  };

  // Trello #81 / #90: inbound mailbox, OCR model, Twilio/WhatsApp status.
  // These may not be strongly typed on AppSettings yet — read defensively.

  return (
    <>
      <AdminPageHeader
        title={t('adminNew.settings.title')}
        subtitle={t('adminNew.settings.subtitle')}
        stats={[
          {
            label: t('adminNew.settings.tabs.company'),
            value: settings.data?.company.name || '—',
            icon: ShieldCheck,
            tone: 'marine',
            loading: settings.loading,
          },
          {
            label: t('adminNew.settings.tabs.invoicing'),
            value: settings.data?.invoicing.currency || 'EUR',
            icon: Sliders,
            tone: 'gold',
            loading: settings.loading,
          },
          {
            label: t('adminNew.settings.tabs.payments'),
            value: settings.data?.payments.test_mode ? 'Test' : 'Live',
            icon: TestTube2,
            tone: settings.data?.payments.test_mode ? 'warning' : 'success',
            loading: settings.loading,
          },
          {
            label: t('adminNew.settings.tabs.locales'),
            value: localeForm.supported_locales.length,
            icon: Globe2,
            tone: 'navy',
            loading: settings.loading,
          },
        ]}
      />
      <AdminContent>
        <Input label={t('settingsHub.search')} value={search} onChange={e => setSearch(e.target.value)} />
        <div className="my-4 flex flex-wrap gap-4 text-sm">
          <Link href={`/${locale}/admin/reminders`} className="underline">{t('settingsHub.reminderRules')}</Link>
          <button onClick={() => {setActiveTab('payments'); window.history.replaceState(null, '', '#payments');}} className="underline">{t('settingsHub.paymentHealth')}: {settings.data?.payments.connected ? t('adminNew.settings.payments.connected') : t('settingsHub.untested')}</button>
          {operational ? <button onClick={() => {setActiveTab('email_ocr'); window.history.replaceState(null, '', '#email_ocr');}} className="underline">{t('settingsHub.integrationHealth')}</button> : null}
        </div>
        {settings.loading ? (
          <LoadingState label={t('adminNew.settings.loading')} variant="detail" />
        ) : null}
        {!settings.loading && settings.error ? (
          <ErrorState message={settings.error} onRetry={() => void settings.refetch()} />
        ) : null}

        {!settings.loading && settings.data ? (
          <>
            <AdminTabBar
              active={activeTab}
              onChange={tab => {setActiveTab(tab); window.history.replaceState(null, '', '#'+tab); window.dispatchEvent(new HashChangeEvent('hashchange'));}}
              tabs={[
                { id: 'contact_subjects' as const, label: t('contactSubjects.title'), icon: Mail },
                { id: 'company' as const, label: t('adminNew.settings.tabs.company'), icon: ShieldCheck },
                { id: 'invoicing' as const, label: t('adminNew.settings.tabs.invoicing'), icon: Sliders },
                { id: 'payments' as const, label: t('adminNew.settings.tabs.payments'), icon: TestTube2 },
                { id: 'locales' as const, label: t('adminNew.settings.tabs.locales'), icon: Globe2 },
                { id: 'email_ocr' as const, label: t('adminNew.settings.tabs.emailOcr'), icon: Mail },
              ].filter(tab => (operational || ['invoicing', 'payments'].includes(tab.id)) && (!search || (tab.label + ' ' + ({company:'company address contact iban kvk vat',invoicing:'invoice prefix currency tax due reminders',payments:'pos cash pin invoice online mollie ideal creditcard bancontact banktransfer test live',locales:'locale languages default fallback Nederlands English Deutsch Français',email_ocr:'email smtp mailbox ocr whatsapp signhost integrations',contact_subjects:'contact subjects'}[tab.id])).toLowerCase().includes(search.toLowerCase())))}
            />

            {operational && activeTab === 'contact_subjects' ? <div className="rounded-xl bg-white p-6"><ContactSubjectsEditor /></div> : null}
            {operational && activeTab === 'company' ? (
              <AdminSectionCard
                title={t('adminNew.settings.company.title')}
                description={t('adminNew.settings.tabs.company')}
                icon={ShieldCheck}
              >
                <div className="grid gap-3 sm:grid-cols-2">
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
                    disabled={!canEdit}
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
              </AdminSectionCard>
            ) : null}

            {activeTab === 'invoicing' ? (
              <AdminSectionCard
                title={t('adminNew.settings.invoicing.title')}
                description={t('adminNew.settings.tabs.invoicing')}
                icon={Sliders}
              >
                <div className="grid gap-3 sm:grid-cols-2">
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
                  <Link className="self-center text-sm underline" href={`/${locale}/admin/reminders`}>{t('settingsHub.reminderRules')}</Link>
                </div>
                <div className="mt-5 flex justify-end">
                  <Button
                    variant="gold"
                    disabled={!canEdit}
                    leftIcon={<Save className="h-4 w-4" />}
                    onClick={() =>
                      void save(
                        () =>
                          updateInvoicing.mutate({
                            invoice_prefix: invoicingForm.invoice_prefix,
                            default_due_days: Number(invoicingForm.default_due_days),
                            currency: invoicingForm.currency,
                            default_vat_rate: Number(invoicingForm.default_vat_rate),
                          }),
                        t('adminNew.settings.toasts.invoicingSaved')
                      )
                    }
                  >
                    {t('adminNew.common.save')}
                  </Button>
                </div>
              </AdminSectionCard>
            ) : null}

            {activeTab === 'payments' ? (
              <AdminSectionCard
                title={t('adminNew.settings.payments.title')}
                description={t('adminNew.settings.tabs.payments')}
                icon={TestTube2}
              >
                <div className="flex items-center gap-2">
                  <Badge tone={settings.data.payments.connected ? 'success' : 'danger'} dot>
                    {settings.data.payments.connected
                      ? t('adminNew.settings.payments.connected')
                      : t('adminNew.settings.payments.notConnected')}
                  </Badge>
                  <Badge tone="navy">{t('adminNew.settings.payments.secretsBackendOnly')}</Badge>
                </div>
                <p className="mt-3 text-sm text-navy-500">{t('settingsHub.mollieSetup')}</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-navy-800">
                      {t('adminNew.settings.payments.provider')}
                    </label>
                    <SearchSelect
                      className="input-base"
                      disabled={!can('settings.update')}
                      value={paymentsForm.provider}
                      onChange={(e) =>
                        setPaymentsForm((p) => ({ ...p, provider: e.target.value }))
                      }
                    >
                      <option value="mollie">Mollie</option>
                      <option value="manual">Manual</option>
                    </SearchSelect>
                  </div>
                  {(['pos_methods', 'online_methods'] as const).map(scope => <fieldset key={scope} className="space-y-2"><legend>{t(scope === 'pos_methods' ? 'settingsHub.pos_methods' : 'settingsHub.online_methods')}</legend>{(scope === 'pos_methods' ? ['cash','pin','invoice','manual','banktransfer','other'] : ['ideal','creditcard','bancontact','banktransfer']).map(method => <label key={method} className="mr-4 inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={paymentsForm[scope].includes(method)} onChange={e => setPaymentsForm(p => ({...p, [scope]: e.target.checked ? [...p[scope],method] : p[scope].filter(m => m !== method)}))} />{method}</label>)}</fieldset>)}
                </div>
                <div className="mt-3">
                  <label className="inline-flex items-center gap-2 text-sm text-navy-700">
                    <input
                      type="checkbox"
                      disabled={!can('settings.update')}
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
                    disabled={!can('settings.update')}
                    leftIcon={<TestTube2 className="h-4 w-4" />}
                    onClick={() =>
                      void save(
                        async () => { await testMollie.mutate(); },
                        t('adminNew.settings.toasts.mollieTestSuccess')
                      )
                    }
                  >
                    {t('settingsHub.runDiagnostic')}
                  </Button>
                  <Button
                    variant="gold"
                    disabled={!canEdit}
                    leftIcon={<Save className="h-4 w-4" />}
                    onClick={() =>
                      void save(
                        () =>
                          updatePayments.mutate({
                            ...(can('settings.update') ? {provider: paymentsForm.provider, test_mode: paymentsForm.test_mode} : {}),
                            pos_methods: paymentsForm.pos_methods,
                            online_methods: paymentsForm.online_methods,
                          }),
                        t('adminNew.settings.toasts.paymentsSaved')
                      )
                    }
                  >
                    {t('adminNew.common.save')}
                  </Button>
                </div>
              </AdminSectionCard>
            ) : null}

            {operational && activeTab === 'locales' ? (
              <AdminSectionCard
                title={t('adminNew.settings.locales.title')}
                description={t('adminNew.settings.tabs.locales')}
                icon={Globe2}
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-sm">{t('adminNew.settings.locales.defaultLocale')}<select className="input-base mt-2" value={localeForm.default_locale} onChange={e => setLocaleForm(p => ({...p, default_locale:e.target.value}))}>{localeForm.supported_locales.map(code => <option key={code} value={code}>{code}</option>)}</select></label>
                  <label className="text-sm">{t('adminNew.settings.locales.fallbackLocale')}<select className="input-base mt-2" value={localeForm.fallback_locale} onChange={e => setLocaleForm(p => ({...p, fallback_locale:e.target.value}))}>{localeForm.supported_locales.map(code => <option key={code} value={code}>{code}</option>)}</select></label>
                </div>
                <div className="mt-3">
                  <fieldset><legend>{t('adminNew.settings.locales.supportedLocales')}</legend>{[['nl-NL','Nederlands'],['en-GB','English'],['de-DE','Deutsch'],['fr-FR','Français']].map(([code,label]) => <label key={code} className="mr-4 inline-flex items-center gap-2"><input type="checkbox" checked={localeForm.supported_locales.includes(code)} disabled={code === localeForm.default_locale || code === localeForm.fallback_locale} onChange={e => setLocaleForm(p => ({...p,supported_locales: e.target.checked ? [...p.supported_locales,code] : p.supported_locales.filter(l=>l!==code)}))} />{label}</label>)}</fieldset>
                </div>
                <div className="mt-5 flex justify-end">
                  <Button
                    variant="gold"
                    disabled={!canEdit}
                    leftIcon={<Save className="h-4 w-4" />}
                    onClick={() =>
                      void save(
                        () =>
                          updateLocales.mutate({
                            default_locale: localeForm.default_locale,
                            fallback_locale: localeForm.fallback_locale,
                            supported_locales: localeForm.supported_locales,
                          }),
                        t('adminNew.settings.toasts.localesSaved')
                      )
                    }
                  >
                    {t('adminNew.common.save')}
                  </Button>
                </div>
              </AdminSectionCard>
            ) : null}

            {operational && activeTab === 'email_ocr' ? <IntegrationSettingsPanel /> : null}
          </>
        ) : null}
      </AdminContent>
    </>
  );
}
