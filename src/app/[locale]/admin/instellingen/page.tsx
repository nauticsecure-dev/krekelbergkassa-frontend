'use client';

import Link from 'next/link';
import * as React from 'react';
import {
  AlertTriangle,
  Building2,
  CreditCard,
  Globe2,
  Languages,
  Mail,
  Save,
  Sliders,
  TestTube2,
} from 'lucide-react';
import { usePermission } from '@/lib/permissions';
import { IntegrationSettingsPanel } from '@/components/admin/IntegrationSettingsPanel';
import { SearchSelect } from '@/components/ui/SearchSelect';
import { AddressAutocomplete, type AddressSelection } from '@/components/ui/AddressAutocomplete';
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
import { cn } from '@/lib/cn';
import type { AppSettings, SettingsOverviewCard } from '@/lib/api-types';

type SettingsTab =
  | 'company'
  | 'invoicing'
  | 'reminders'
  | 'payments'
  | 'locales'
  | 'email_import'
  | 'integrations';

const TAB_SEARCH: Record<SettingsTab, string> = {
  company: 'bedrijf company address contact iban bic kvk vat btw website logo mollie',
  invoicing: 'facturatie invoice prefix currency tax btw due term templates INV',
  reminders: 'herinneringen reminder 7 dagen 14 30 template whatsapp email',
  payments: 'betalingen pos cash pin invoice online mollie ideal creditcard bancontact banktransfer test live IBAN',
  locales: 'talen locale languages default fallback Nederlands English Deutsch Français NL DE EN FR',
  email_import: 'email smtp mailbox import ocr facturen@ relay',
  integrations: 'integraties mollie google places mailbox ocr whatsapp twilio signhost accounting',
};

const LOCALE_OPTIONS: Array<{ code: string; label: string }> = [
  { code: 'nl-NL', label: 'Nederlands (NL)' },
  { code: 'de-DE', label: 'Deutsch (DE)' },
  { code: 'en-GB', label: 'English (EN)' },
  { code: 'fr-FR', label: 'Français (FR)' },
];

const POS_METHODS = [
  { id: 'cash', label: 'Contant' },
  { id: 'pin', label: 'PIN' },
  { id: 'invoice', label: 'Op rekening' },
  { id: 'manual', label: 'Handmatig' },
  { id: 'banktransfer', label: 'Bankoverschrijving' },
  { id: 'other', label: 'Overig / split' },
] as const;

const ONLINE_METHODS = [
  { id: 'ideal', label: 'iDEAL' },
  { id: 'creditcard', label: 'Creditcard' },
  { id: 'bancontact', label: 'Bancontact' },
  { id: 'banktransfer', label: 'Bankoverschrijving' },
] as const;

function statusTone(status?: string): 'success' | 'warning' | 'danger' | 'navy' {
  if (status === 'ok') return 'success';
  if (status === 'danger') return 'danger';
  if (status === 'warning') return 'warning';
  return 'navy';
}

export default function SettingsPage() {
  const { push } = useToast();
  const { t, locale } = useIntl();
  const { can } = usePermission();
  const operational = can('settings.view');
  const canEdit = can(['settings.update', 'settings.financial.update']);
  const canUpdateOps = can('settings.update');
  const [search, setSearch] = React.useState('');
  const [saveState, setSaveState] = React.useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [dirty, setDirty] = React.useState<Partial<Record<SettingsTab, boolean>>>({});
  const [liveConfirm, setLiveConfirm] = React.useState(false);
  const [localeImpact, setLocaleImpact] = React.useState<string | null>(null);

  const [activeTab, setActiveTab] = React.useState<SettingsTab>('company');

  const goTab = React.useCallback((tab: SettingsTab) => {
    setActiveTab(tab);
    window.history.replaceState(null, '', `#${tab}`);
  }, []);

  React.useEffect(() => {
    const applyHash = () => {
      const tab = window.location.hash.slice(1) as SettingsTab;
      const allowed: SettingsTab[] = [
        'company',
        'invoicing',
        'reminders',
        'payments',
        'locales',
        'email_import',
        'integrations',
      ];
      // legacy hash
      const normalized =
        tab === ('email_ocr' as SettingsTab) ? 'email_import' : tab === ('contact_subjects' as SettingsTab) ? 'company' : tab;
      if (allowed.includes(normalized) && (operational || ['invoicing', 'payments', 'reminders'].includes(normalized))) {
        setActiveTab(normalized);
      } else if (!operational) {
        setActiveTab('invoicing');
      }
    };
    applyHash();
    window.addEventListener('hashchange', applyHash);
    return () => window.removeEventListener('hashchange', applyHash);
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
    website: '',
    iban: '',
    bic: '',
    logo_url: '',
    street: '',
    postal_code: '',
    city: '',
    country: 'NL',
  });

  const [invoicingForm, setInvoicingForm] = React.useState({
    invoice_prefix: 'INV',
    credit_prefix: 'CN',
    default_due_days: '14',
    currency: 'EUR',
    default_vat_rate: '21',
    bank_instructions: '',
    payment_instructions: '',
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
    supported_locales: ['nl-NL', 'en-GB', 'de-DE', 'fr-FR'],
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
      website: s.company.website || '',
      iban: s.company.iban || '',
      bic: s.company.bic || '',
      logo_url: s.company.logo_url || '',
      street: s.company.address?.street || '',
      postal_code: s.company.address?.postal_code || '',
      city: s.company.address?.city || '',
      country: s.company.address?.country || 'NL',
    });
    setInvoicingForm({
      invoice_prefix: s.invoicing.invoice_prefix || 'INV',
      credit_prefix: s.invoicing.credit_prefix || 'CN',
      default_due_days: String(s.invoicing.default_due_days ?? 14),
      currency: s.invoicing.currency || 'EUR',
      default_vat_rate: String(s.invoicing.default_vat_rate ?? 21),
      bank_instructions: s.invoicing.bank_instructions || '',
      payment_instructions: s.invoicing.payment_instructions || '',
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
    setDirty({});
  }, [settings.data]);

  const markDirty = (tab: SettingsTab) => setDirty((p) => ({ ...p, [tab]: true }));

  const save = async (tab: SettingsTab, fn: () => Promise<unknown>, successMessage: string) => {
    setSaveState('saving');
    try {
      await fn();
      setSaveState('saved');
      setDirty((p) => ({ ...p, [tab]: false }));
      push({ tone: 'success', title: successMessage });
      await settings.refetch();
      window.setTimeout(() => setSaveState('idle'), 1800);
    } catch (err) {
      setSaveState('error');
      push({
        tone: 'error',
        title: t('adminNew.common.operationFailed'),
        message: getApiErrorMessage(err),
      });
    }
  };

  const matchesSearch = (tab: SettingsTab, label: string) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return `${label} ${TAB_SEARCH[tab]}`.toLowerCase().includes(q);
  };

  const overview = settings.data?.overview;
  const attention = settings.data?.attention ?? [];

  const overviewCards: Array<{
    id: SettingsTab;
    label: string;
    card?: SettingsOverviewCard;
  }> = [
    { id: 'company', label: t('adminNew.settings.tabs.company'), card: overview?.company },
    { id: 'invoicing', label: t('adminNew.settings.tabs.invoicing'), card: overview?.invoicing },
    { id: 'reminders', label: t('settingsHub.tabs.reminders'), card: overview?.reminders },
    { id: 'payments', label: t('adminNew.settings.tabs.payments'), card: overview?.payments },
    { id: 'locales', label: t('adminNew.settings.tabs.locales'), card: overview?.locales },
  ];

  const onAddressSelect = (address: AddressSelection) => {
    setCompanyForm((p) => ({
      ...p,
      street: [address.street, address.house_number].filter(Boolean).join(' '),
      postal_code: address.postal_code,
      city: address.city,
      country: address.country || p.country || 'NL',
    }));
    markDirty('company');
  };

  const toggleLocale = (code: string, enabled: boolean) => {
    if (!enabled && (code === localeForm.default_locale || code === localeForm.fallback_locale)) {
      push({
        tone: 'error',
        title: t('settingsHub.locale.cannotDisableDefault'),
      });
      return;
    }
    if (!enabled) {
      setLocaleImpact(code);
      return;
    }
    setLocaleForm((p) => ({
      ...p,
      supported_locales: [...p.supported_locales, code],
    }));
    markDirty('locales');
  };

  const confirmDisableLocale = () => {
    if (!localeImpact) return;
    setLocaleForm((p) => ({
      ...p,
      supported_locales: p.supported_locales.filter((l) => l !== localeImpact),
    }));
    markDirty('locales');
    setLocaleImpact(null);
  };

  const switchToLive = () => {
    if (!liveConfirm) {
      setLiveConfirm(true);
      return;
    }
    setPaymentsForm((p) => ({ ...p, test_mode: false }));
    markDirty('payments');
    setLiveConfirm(false);
  };

  const financialOnly = !operational;

  return (
    <>
      <AdminPageHeader
        title={t('adminNew.settings.title')}
        subtitle={t('settingsHub.subtitle')}
      />
      <AdminContent>
        <Input
          label={t('settingsHub.search')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Mollie, IBAN, 7 dagen, WhatsApp…"
        />

        {saveState !== 'idle' ? (
          <p
            role="status"
            className={cn(
              'text-sm',
              saveState === 'saving' && 'text-navy-600',
              saveState === 'saved' && 'text-emerald-700',
              saveState === 'error' && 'text-red-700',
            )}
          >
            {saveState === 'saving'
              ? t('settingsHub.save.saving')
              : saveState === 'saved'
                ? t('settingsHub.save.saved')
                : t('settingsHub.save.failed')}
          </p>
        ) : null}

        {settings.loading ? <LoadingState label={t('adminNew.settings.loading')} variant="detail" /> : null}
        {!settings.loading && settings.error ? (
          <ErrorState message={settings.error} onRetry={() => void settings.refetch()} />
        ) : null}

        {!settings.loading && settings.data ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {overviewCards
                .filter((item) => operational || ['invoicing', 'payments', 'reminders'].includes(item.id))
                .filter((item) => matchesSearch(item.id, item.label))
                .map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => goTab(item.id)}
                    className="rounded-xl border border-navy-100 bg-white p-4 text-left shadow-sm transition hover:border-marine-300 hover:shadow"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-navy-600">{item.label}</p>
                      <Badge tone={statusTone(item.card?.status)} dot>
                        {item.card?.status === 'ok' ? '✓' : '⚠'}
                      </Badge>
                    </div>
                    <p className="mt-2 text-lg font-semibold text-navy-900">{item.card?.title || '—'}</p>
                    <p className="mt-1 text-sm text-navy-500">{item.card?.summary}</p>
                    <p className="mt-3 text-sm font-medium text-marine-800">
                      → {item.card?.action === 'configure' ? t('settingsHub.actions.configure') : t('settingsHub.actions.manage')}
                    </p>
                  </button>
                ))}
            </div>

            {attention.length > 0 ? (
              <section className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-amber-950">
                  <AlertTriangle className="h-4 w-4" />
                  {t('settingsHub.attention.title')}
                </h2>
                <ul className="mt-3 space-y-2">
                  {attention.map((item) => {
                    const href = item.href.startsWith('#')
                      ? item.href
                      : `/${locale}${item.href.startsWith('/') ? item.href : `/${item.href}`}`;
                    const onClick = () => {
                      if (item.href.startsWith('#')) {
                        const tab = item.href.slice(1) as SettingsTab;
                        if (tab) goTab(tab);
                      }
                    };
                    return (
                      <li key={item.code}>
                        {item.href.startsWith('#') ? (
                          <button type="button" onClick={onClick} className="text-left text-sm text-amber-950 underline-offset-2 hover:underline">
                            ⚠ {item.title}
                            <span className="ml-2 text-amber-800/80">{item.message}</span>
                          </button>
                        ) : (
                          <Link href={href} className="text-sm text-amber-950 underline-offset-2 hover:underline">
                            ⚠ {item.title}
                            <span className="ml-2 text-amber-800/80">{item.message}</span>
                          </Link>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            ) : null}

            <AdminTabBar
              active={activeTab}
              onChange={(tab) => goTab(tab)}
              tabs={(
                [
                  { id: 'company' as const, label: t('adminNew.settings.tabs.company'), icon: Building2 },
                  { id: 'invoicing' as const, label: t('adminNew.settings.tabs.invoicing'), icon: Sliders },
                  { id: 'reminders' as const, label: t('settingsHub.tabs.reminders'), icon: Mail },
                  { id: 'payments' as const, label: t('adminNew.settings.tabs.payments'), icon: CreditCard },
                  { id: 'locales' as const, label: t('adminNew.settings.tabs.locales'), icon: Languages },
                  { id: 'email_import' as const, label: t('settingsHub.tabs.emailImport'), icon: Mail },
                  { id: 'integrations' as const, label: t('settingsHub.tabs.integrations'), icon: Globe2 },
                ] as const
              )
                .filter((tab) => (operational || ['invoicing', 'payments', 'reminders'].includes(tab.id)) && matchesSearch(tab.id, tab.label))
                .map((tab) => ({
                  ...tab,
                  label: dirty[tab.id] ? `${tab.label} ●` : tab.label,
                }))}
            />

            {operational && activeTab === 'company' ? (
              <AdminSectionCard
                title={t('adminNew.settings.company.title')}
                description={t('settingsHub.company.description')}
                icon={Building2}
              >
                <div className="mb-4">
                  <AddressAutocomplete
                    label={t('settingsHub.company.addressSearch')}
                    onSelect={onAddressSelect}
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input label={t('adminNew.common.name')} value={companyForm.name} onChange={(e) => { setCompanyForm((p) => ({ ...p, name: e.target.value })); markDirty('company'); }} />
                  <Input label={t('adminNew.common.email')} value={companyForm.email} onChange={(e) => { setCompanyForm((p) => ({ ...p, email: e.target.value })); markDirty('company'); }} />
                  <Input label={t('adminNew.common.phone')} value={companyForm.phone} onChange={(e) => { setCompanyForm((p) => ({ ...p, phone: e.target.value })); markDirty('company'); }} />
                  <Input label={t('settingsHub.company.website')} value={companyForm.website} onChange={(e) => { setCompanyForm((p) => ({ ...p, website: e.target.value })); markDirty('company'); }} />
                  <Input label={t('adminNew.settings.company.kvk')} value={companyForm.kvk} onChange={(e) => { setCompanyForm((p) => ({ ...p, kvk: e.target.value })); markDirty('company'); }} />
                  <Input label={t('adminNew.settings.company.vatNumber')} value={companyForm.vat_number} onChange={(e) => { setCompanyForm((p) => ({ ...p, vat_number: e.target.value })); markDirty('company'); }} />
                  <Input label={t('adminNew.settings.company.iban')} value={companyForm.iban} onChange={(e) => { setCompanyForm((p) => ({ ...p, iban: e.target.value })); markDirty('company'); }} />
                  <Input label={t('settingsHub.company.bic')} value={companyForm.bic} onChange={(e) => { setCompanyForm((p) => ({ ...p, bic: e.target.value })); markDirty('company'); }} />
                  <Input label={t('adminNew.settings.company.street')} value={companyForm.street} onChange={(e) => { setCompanyForm((p) => ({ ...p, street: e.target.value })); markDirty('company'); }} />
                  <Input label={t('adminNew.settings.company.postalCode')} value={companyForm.postal_code} onChange={(e) => { setCompanyForm((p) => ({ ...p, postal_code: e.target.value })); markDirty('company'); }} />
                  <Input label={t('adminNew.settings.company.city')} value={companyForm.city} onChange={(e) => { setCompanyForm((p) => ({ ...p, city: e.target.value })); markDirty('company'); }} />
                  <Input label={t('adminNew.settings.company.country')} value={companyForm.country} onChange={(e) => { setCompanyForm((p) => ({ ...p, country: e.target.value })); markDirty('company'); }} />
                  <Input label={t('settingsHub.company.logoUrl')} value={companyForm.logo_url} onChange={(e) => { setCompanyForm((p) => ({ ...p, logo_url: e.target.value })); markDirty('company'); }} className="sm:col-span-2" />
                </div>
                <div className="sticky bottom-3 mt-5 flex justify-end rounded-xl bg-white/95 p-3 shadow-sm backdrop-blur">
                  <Button
                    variant="gold"
                    disabled={!canUpdateOps}
                    leftIcon={<Save className="h-4 w-4" />}
                    onClick={() =>
                      void save(
                        'company',
                        () =>
                          updateCompany.mutate({
                            name: companyForm.name,
                            kvk: companyForm.kvk || null,
                            vat_number: companyForm.vat_number || null,
                            email: companyForm.email,
                            phone: companyForm.phone || null,
                            website: companyForm.website || null,
                            iban: companyForm.iban || null,
                            bic: companyForm.bic || null,
                            logo_url: companyForm.logo_url || null,
                            address: {
                              street: companyForm.street,
                              postal_code: companyForm.postal_code,
                              city: companyForm.city,
                              country: companyForm.country,
                            },
                          }),
                        t('adminNew.settings.toasts.companySaved'),
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
                description={t('settingsHub.invoicing.description')}
                icon={Sliders}
              >
                <div className="mb-4 rounded-lg border border-navy-100 bg-sand-50 p-3 text-sm text-navy-700">
                  <p>
                    {t('settingsHub.invoicing.numbering')}:{' '}
                    <code className="font-mono">{settings.data.invoicing.numbering_pattern || 'INV-{YYYY}-{000001}'}</code>
                  </p>
                  <p className="mt-1">
                    {t('settingsHub.invoicing.example')}:{' '}
                    <code className="font-mono">{settings.data.invoicing.example_number}</code>
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input label={t('adminNew.settings.invoicing.invoicePrefix')} value={invoicingForm.invoice_prefix} onChange={(e) => { setInvoicingForm((p) => ({ ...p, invoice_prefix: e.target.value.toUpperCase() })); markDirty('invoicing'); }} />
                  <Input label={t('settingsHub.invoicing.creditPrefix')} value={invoicingForm.credit_prefix} onChange={(e) => { setInvoicingForm((p) => ({ ...p, credit_prefix: e.target.value.toUpperCase() })); markDirty('invoicing'); }} />
                  <Input label={t('adminNew.settings.invoicing.defaultDueDays')} value={invoicingForm.default_due_days} type="number" onChange={(e) => { setInvoicingForm((p) => ({ ...p, default_due_days: e.target.value })); markDirty('invoicing'); }} />
                  <Input label={t('adminNew.settings.invoicing.currency')} value={invoicingForm.currency} onChange={(e) => { setInvoicingForm((p) => ({ ...p, currency: e.target.value.toUpperCase() })); markDirty('invoicing'); }} />
                  <Input label={t('adminNew.settings.invoicing.defaultVatRate')} value={invoicingForm.default_vat_rate} type="number" onChange={(e) => { setInvoicingForm((p) => ({ ...p, default_vat_rate: e.target.value })); markDirty('invoicing'); }} />
                </div>
                <div className="mt-3 grid gap-3">
                  <label className="text-sm font-medium text-navy-800">
                    {t('settingsHub.invoicing.bankInstructions')}
                    <textarea
                      className="input-base mt-1.5 min-h-[80px] w-full"
                      value={invoicingForm.bank_instructions}
                      onChange={(e) => { setInvoicingForm((p) => ({ ...p, bank_instructions: e.target.value })); markDirty('invoicing'); }}
                    />
                  </label>
                  <label className="text-sm font-medium text-navy-800">
                    {t('settingsHub.invoicing.paymentInstructions')}
                    <textarea
                      className="input-base mt-1.5 min-h-[80px] w-full"
                      value={invoicingForm.payment_instructions}
                      onChange={(e) => { setInvoicingForm((p) => ({ ...p, payment_instructions: e.target.value })); markDirty('invoicing'); }}
                    />
                  </label>
                </div>
                <div className="mt-4 flex flex-wrap gap-3 text-sm">
                  <Link className="underline" href={`/${locale}/admin/facturen/templates`}>{t('settingsHub.invoicing.openTemplates')}</Link>
                  <Link className="underline" href={`/${locale}/admin/facturen`}>{t('settingsHub.invoicing.openInvoices')}</Link>
                  <button type="button" className="underline" onClick={() => goTab('reminders')}>{t('settingsHub.reminderRules')}</button>
                </div>
                <div className="sticky bottom-3 mt-5 flex justify-end rounded-xl bg-white/95 p-3 shadow-sm backdrop-blur">
                  <Button
                    variant="gold"
                    disabled={!canEdit}
                    leftIcon={<Save className="h-4 w-4" />}
                    onClick={() =>
                      void save(
                        'invoicing',
                        () =>
                          updateInvoicing.mutate({
                            invoice_prefix: invoicingForm.invoice_prefix,
                            credit_prefix: invoicingForm.credit_prefix,
                            default_due_days: Number(invoicingForm.default_due_days),
                            currency: invoicingForm.currency,
                            default_vat_rate: Number(invoicingForm.default_vat_rate),
                            bank_instructions: invoicingForm.bank_instructions || null,
                            payment_instructions: invoicingForm.payment_instructions || null,
                          } as Partial<AppSettings['invoicing']>),
                        t('adminNew.settings.toasts.invoicingSaved'),
                      )
                    }
                  >
                    {t('adminNew.common.save')}
                  </Button>
                </div>
              </AdminSectionCard>
            ) : null}

            {activeTab === 'reminders' ? (
              <AdminSectionCard
                title={t('settingsHub.tabs.reminders')}
                description={t('settingsHub.reminders.description')}
                icon={Mail}
              >
                <ol className="mb-4 space-y-2 text-sm text-navy-700">
                  <li>{t('settingsHub.reminders.flowDue')}</li>
                  <li>+7 {t('settingsHub.reminders.days')} → Reminder 1</li>
                  <li>+14 {t('settingsHub.reminders.days')} → Reminder 2</li>
                  <li>+30 {t('settingsHub.reminders.days')} → {t('settingsHub.reminders.final')}</li>
                </ol>
                <p className="text-sm text-navy-600">{t('settingsHub.reminders.rulesAuthoritative')}</p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Link href={`/${locale}/admin/reminders`}>
                    <Button variant="gold">{t('settingsHub.reminderRules')}</Button>
                  </Link>
                  <Link href={`/${locale}/admin/facturen/templates`} className="self-center text-sm underline">
                    {t('settingsHub.reminders.openTemplates')}
                  </Link>
                </div>
              </AdminSectionCard>
            ) : null}

            {activeTab === 'payments' ? (
              <AdminSectionCard
                title={t('adminNew.settings.payments.title')}
                description={t('settingsHub.payments.description')}
                icon={TestTube2}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={settings.data.payments.test_mode ? 'warning' : 'success'} dot>
                    Mollie · {settings.data.payments.test_mode ? 'TEST' : 'LIVE'}
                  </Badge>
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
                      disabled={!canUpdateOps}
                      value={paymentsForm.provider}
                      onChange={(e) => {
                        setPaymentsForm((p) => ({ ...p, provider: e.target.value }));
                        markDirty('payments');
                      }}
                    >
                      <option value="mollie">Mollie</option>
                      <option value="manual">Manual</option>
                    </SearchSelect>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  <fieldset className="rounded-lg border border-navy-100 p-4">
                    <legend className="px-1 text-sm font-semibold">{t('settingsHub.online_methods')}</legend>
                    <p className="mb-2 text-xs text-navy-500">{t('settingsHub.payments.onlineHint')}</p>
                    {ONLINE_METHODS.map((method) => (
                      <label key={method.id} className="mb-2 flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={paymentsForm.online_methods.includes(method.id)}
                          onChange={(e) => {
                            setPaymentsForm((p) => ({
                              ...p,
                              online_methods: e.target.checked
                                ? [...p.online_methods, method.id]
                                : p.online_methods.filter((m) => m !== method.id),
                            }));
                            markDirty('payments');
                          }}
                        />
                        {method.label}
                      </label>
                    ))}
                  </fieldset>
                  <fieldset className="rounded-lg border border-navy-100 p-4">
                    <legend className="px-1 text-sm font-semibold">{t('settingsHub.pos_methods')}</legend>
                    <p className="mb-2 text-xs text-navy-500">{t('settingsHub.payments.posHint')}</p>
                    {POS_METHODS.map((method) => (
                      <label key={method.id} className="mb-2 flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={paymentsForm.pos_methods.includes(method.id)}
                          onChange={(e) => {
                            setPaymentsForm((p) => ({
                              ...p,
                              pos_methods: e.target.checked
                                ? [...p.pos_methods, method.id]
                                : p.pos_methods.filter((m) => m !== method.id),
                            }));
                            markDirty('payments');
                          }}
                        />
                        {method.label}
                      </label>
                    ))}
                  </fieldset>
                </div>

                <div className="mt-4 space-y-2">
                  {paymentsForm.test_mode ? (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
                      <p className="font-medium">{t('settingsHub.payments.testModeActive')}</p>
                      {liveConfirm ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Button variant="gold" disabled={!canUpdateOps} onClick={switchToLive}>
                            {t('settingsHub.payments.confirmLive')}
                          </Button>
                          <Button variant="outline" onClick={() => setLiveConfirm(false)}>
                            {t('adminNew.common.cancel')}
                          </Button>
                        </div>
                      ) : (
                        <Button className="mt-2" variant="outline" disabled={!canUpdateOps} onClick={switchToLive}>
                          {t('settingsHub.payments.switchLive')}
                        </Button>
                      )}
                    </div>
                  ) : (
                    <label className="inline-flex items-center gap-2 text-sm text-navy-700">
                      <input
                        type="checkbox"
                        disabled={!canUpdateOps}
                        checked={paymentsForm.test_mode}
                        onChange={(e) => {
                          setPaymentsForm((p) => ({ ...p, test_mode: e.target.checked }));
                          markDirty('payments');
                        }}
                      />
                      {t('adminNew.settings.payments.testMode')}
                    </label>
                  )}
                </div>

                <div className="sticky bottom-3 mt-5 flex flex-wrap justify-end gap-2 rounded-xl bg-white/95 p-3 shadow-sm backdrop-blur">
                  <Button
                    variant="outline"
                    disabled={!canUpdateOps}
                    leftIcon={<TestTube2 className="h-4 w-4" />}
                    onClick={() =>
                      void save('payments', async () => { await testMollie.mutate(); }, t('adminNew.settings.toasts.mollieTestSuccess'))
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
                        'payments',
                        () =>
                          updatePayments.mutate({
                            ...(canUpdateOps
                              ? { provider: paymentsForm.provider, test_mode: paymentsForm.test_mode }
                              : {}),
                            pos_methods: paymentsForm.pos_methods,
                            online_methods: paymentsForm.online_methods,
                          }),
                        t('adminNew.settings.toasts.paymentsSaved'),
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
                description={t('settingsHub.locales.description')}
                icon={Languages}
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-sm">
                    {t('adminNew.settings.locales.defaultLocale')}
                    <select
                      className="input-base mt-2"
                      value={localeForm.default_locale}
                      onChange={(e) => {
                        setLocaleForm((p) => ({ ...p, default_locale: e.target.value }));
                        markDirty('locales');
                      }}
                    >
                      {localeForm.supported_locales.map((code) => (
                        <option key={code} value={code}>{code}</option>
                      ))}
                    </select>
                  </label>
                  <label className="text-sm">
                    {t('adminNew.settings.locales.fallbackLocale')}
                    <select
                      className="input-base mt-2"
                      value={localeForm.fallback_locale}
                      onChange={(e) => {
                        setLocaleForm((p) => ({ ...p, fallback_locale: e.target.value }));
                        markDirty('locales');
                      }}
                    >
                      {localeForm.supported_locales.map((code) => (
                        <option key={code} value={code}>{code}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="mt-4 space-y-2">
                  {LOCALE_OPTIONS.map((opt) => {
                    const enabled = localeForm.supported_locales.includes(opt.code);
                    const isDefault = opt.code === localeForm.default_locale;
                    return (
                      <label key={opt.code} className="flex items-center gap-3 rounded-lg border border-navy-100 px-3 py-2 text-sm">
                        <input
                          type="checkbox"
                          checked={enabled}
                          onChange={(e) => toggleLocale(opt.code, e.target.checked)}
                        />
                        <span className="font-medium">{opt.label}</span>
                        {isDefault ? <Badge tone="success">DEFAULT</Badge> : null}
                        {!enabled ? <span className="text-navy-500">{t('settingsHub.locales.disabledKept')}</span> : null}
                      </label>
                    );
                  })}
                </div>
                <p className="mt-3 text-xs text-navy-500">{t('settingsHub.locales.fallbackChain')}</p>
                {localeImpact ? (
                  <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
                    <p className="font-medium">{t('settingsHub.locales.disableTitle', { code: localeImpact })}</p>
                    <p className="mt-1">{t('settingsHub.locales.disableBody')}</p>
                    <div className="mt-2 flex gap-2">
                      <Button variant="gold" onClick={confirmDisableLocale}>{t('settingsHub.locales.confirmDisable')}</Button>
                      <Button variant="outline" onClick={() => setLocaleImpact(null)}>{t('adminNew.common.cancel')}</Button>
                    </div>
                  </div>
                ) : null}
                <div className="sticky bottom-3 mt-5 flex justify-end rounded-xl bg-white/95 p-3 shadow-sm backdrop-blur">
                  <Button
                    variant="gold"
                    disabled={!canUpdateOps}
                    leftIcon={<Save className="h-4 w-4" />}
                    onClick={() =>
                      void save(
                        'locales',
                        () =>
                          updateLocales.mutate({
                            default_locale: localeForm.default_locale,
                            fallback_locale: localeForm.fallback_locale,
                            supported_locales: localeForm.supported_locales,
                          }),
                        t('adminNew.settings.toasts.localesSaved'),
                      )
                    }
                  >
                    {t('adminNew.common.save')}
                  </Button>
                </div>
              </AdminSectionCard>
            ) : null}

            {operational && (activeTab === 'email_import' || activeTab === 'integrations') ? (
              <div className="space-y-4">
                <AdminSectionCard
                  title={activeTab === 'email_import' ? t('settingsHub.tabs.emailImport') : t('settingsHub.tabs.integrations')}
                  description={t('settingsHub.integrations.description')}
                  icon={activeTab === 'email_import' ? Mail : Globe2}
                >
                  <IntegrationSettingsPanel />
                </AdminSectionCard>
              </div>
            ) : null}

            {financialOnly && activeTab === 'company' ? (
              <p className="text-sm text-navy-600">{t('settingsHub.rbac.financeLimited')}</p>
            ) : null}
          </>
        ) : null}
      </AdminContent>
    </>
  );
}
