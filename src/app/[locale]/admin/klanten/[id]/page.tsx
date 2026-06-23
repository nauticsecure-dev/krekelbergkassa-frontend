'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Activity, FilePlus2, Save, Ship, Users, Warehouse, CreditCard, Wallet, FileText, UserRound, Clock, ShieldCheck, Download, UserX } from 'lucide-react';
import { AdminPageHeader } from '@/components/admin/AdminShell';
import {
  AdminContent,
  AdminDetailGrid,
  AdminSectionCard,
  AdminStatusStrip,
  AdminTable,
  AdminTableCell,
  AdminTableHead,
  AdminTableHeaderCell,
  AdminTableRow,
} from '@/components/admin/AdminUi';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { EmptyState, ErrorState, LoadingState } from '@/components/admin/DataState';
import { AdminConfirmModal } from '@/components/admin/AdminConfirmModal';
import { InvoiceStatusBadge } from '@/components/admin/StatusBadge';
import {
  boatsService,
  customersService,
  filesService,
  invoicesService,
  stallingService,
  walletsService,
  adminService,
  governanceService,
} from '@/lib/services';
import { findUserIdByEmail, impersonateUser, ImpersonationError } from '@/lib/impersonate';
import { useMutation, useQuery } from '@/lib/hooks/useAsync';
import { formatCurrency, formatDate, centsToEuro } from '@/lib/format';
import { useIntl } from '@/i18n/IntlProvider';
import { useToast } from '@/components/ui/ToastProvider';
import { getApiErrorMessage } from '@/lib/api-error';

export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const customerId = params?.id;
  const { locale, t } = useIntl();
  const { push } = useToast();

  const [showEdit, setShowEdit] = React.useState(false);
  const [showBoat, setShowBoat] = React.useState(false);
  const [showWalletCredit, setShowWalletCredit] = React.useState(false);
  const [showImpersonateConfirm, setShowImpersonateConfirm] = React.useState(false);
  const [confirmNewInvoice, setConfirmNewInvoice] = React.useState(false);
  const [confirmWalletCredit, setConfirmWalletCredit] = React.useState(false);
  const [walletAmount, setWalletAmount] = React.useState('');
  const [walletDescription, setWalletDescription] = React.useState('');
  const [showMonthlyStatement, setShowMonthlyStatement] = React.useState(false);
  const [statementYear, setStatementYear] = React.useState(String(new Date().getFullYear()));
  const [statementMonth, setStatementMonth] = React.useState(String(new Date().getMonth() + 1));

  const data = useQuery([customerId], async () => {
    if (!customerId) throw new Error('Missing customer id');
    const [customer, boats, stalling, invoices, files, wallet, timeline] = await Promise.all([
      customersService.get(customerId),
      boatsService.list({ customer_id: customerId, per_page: 100 }),
      stallingService.list({ customer_id: customerId, per_page: 100 }),
      invoicesService.list({ customer_id: customerId, per_page: 100 }),
      filesService
        .list({ entity_type: 'customer', entity_id: customerId, per_page: 100 })
        .catch(() => ({ data: [] })),
      walletsService.get(customerId).catch(() => null),
      adminService.timeline({ customer_id: customerId, per_page: 30 }).catch(() => ({ data: [] })),
    ]);

    return {
      customer,
      boats: boats.data,
      stalling: stalling.data,
      invoices: invoices.data,
      files: files.data,
      wallet,
      timeline: timeline.data ?? [],
    };
  });

  // Trello #90: customer health score widget.
  const health = useQuery([customerId, 'health'], () =>
    customerId ? adminService.customerHealth(customerId).catch(() => null) : Promise.resolve(null)
  );
  const recomputeHealth = useMutation(() => adminService.recomputeCustomerHealth(customerId!));
  const onRecomputeHealth = async () => {
    try {
      await recomputeHealth.mutate();
      await health.refetch();
      push({ tone: 'success', title: t('adminNew.customerDetail.health.recomputed') });
    } catch (err) {
      push({ tone: 'error', title: t('adminNew.common.operationFailed'), message: getApiErrorMessage(err) });
    }
  };

  const updateCustomer = useMutation((payload: Record<string, unknown>) =>
    customersService.update(customerId, payload)
  );
  const createBoat = useMutation((payload: Record<string, unknown>) =>
    boatsService.create(payload)
  );
  const createInvoice = useMutation(() =>
    invoicesService.create({
      customer_id: customerId,
      source: 'manual',
      lines: [
        {
          description: t('adminNew.customerDetail.defaultInvoiceLine'),
          quantity: 1,
          unit_price: 0,
          vat_rate: 21,
        },
      ],
    })
  );
  const creditWallet = useMutation((payload: { amount_cents: number; description: string }) =>
    walletsService.credit(customerId!, payload)
  );
  const monthlyStatement = useMutation(() =>
    walletsService.generateMonthlyStatement(customerId!, {
      year: Number(statementYear),
      month: Number(statementMonth),
      locale: locale === 'en' ? 'en-GB' : locale === 'de' ? 'de-DE' : 'nl-NL',
    })
  );

  // Trello #104 (Pillar 20): GDPR data export + anonymisation.
  const [showAnonymize, setShowAnonymize] = React.useState(false);
  const [anonymizeConfirm, setAnonymizeConfirm] = React.useState('');
  const [anonymizeReason, setAnonymizeReason] = React.useState('');
  const gdprExport = useMutation(() => governanceService.gdprExport(customerId!));
  const gdprAnonymize = useMutation((reason: string) =>
    governanceService.gdprAnonymize(customerId!, { confirm: 'ANONYMIZE', reason })
  );

  const onGdprExport = async () => {
    if (!customerId) return;
    try {
      const data = await gdprExport.mutate();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `gdpr-${customerId}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      push({ tone: 'success', title: t('adminNew.gdpr.toasts.exported') });
    } catch (err) {
      push({
        tone: 'error',
        title: t('adminNew.common.operationFailed'),
        message: getApiErrorMessage(err),
      });
    }
  };

  const onAnonymize = async () => {
    if (!customerId) return;
    try {
      await gdprAnonymize.mutate(anonymizeReason);
      push({ tone: 'success', title: t('adminNew.gdpr.toasts.anonymized') });
      setShowAnonymize(false);
      setAnonymizeConfirm('');
      setAnonymizeReason('');
      await data.refetch();
    } catch (err) {
      push({
        tone: 'error',
        title: t('adminNew.common.operationFailed'),
        message: getApiErrorMessage(err),
      });
    }
  };

  const [editForm, setEditForm] = React.useState({
    name: '',
    email: '',
    phone: '',
    preferred_locale: 'nl-NL',
    gender: '',
    street: '',
    postal_code: '',
    city: '',
    country: '',
    notes: '',
  });

  const [boatForm, setBoatForm] = React.useState({
    name: '',
    type: 'motor',
    length_cm: '',
    location_code: '',
  });

  // Trello #89: post a timeline message (internal note or customer-visible).
  const [tlBody, setTlBody] = React.useState('');
  const [tlVisibility, setTlVisibility] = React.useState<'internal' | 'customer'>('internal');
  const postTimeline = useMutation((payload: { title: string; body: string; visibility: 'internal' | 'customer' }) =>
    adminService.timelineMessage({ customer_id: customerId!, ...payload })
  );

  const handlePostTimeline = async () => {
    if (!tlBody.trim() || !customerId) return;
    try {
      await postTimeline.mutate({
        title: tlBody.trim().slice(0, 60),
        body: tlBody.trim(),
        visibility: tlVisibility,
      });
      setTlBody('');
      push({ tone: 'success', title: t('adminNew.customerDetail.timelinePosted') });
      await data.refetch();
    } catch (err) {
      push({
        tone: 'error',
        title: t('adminNew.common.operationFailed'),
        message: getApiErrorMessage(err),
      });
    }
  };

  React.useEffect(() => {
    if (!data.data?.customer) return;
    const c = data.data.customer as unknown as Record<string, unknown>;
    const s = (k: string) => (typeof c[k] === 'string' ? (c[k] as string) : '');
    setEditForm({
      name: data.data.customer.name,
      email: data.data.customer.email ?? '',
      phone: data.data.customer.phone ?? '',
      preferred_locale: data.data.customer.preferred_locale || 'nl-NL',
      gender: s('gender'),
      street: s('street') || s('address'),
      postal_code: s('postal_code') || s('zip'),
      city: s('city'),
      country: s('country'),
      notes: data.data.customer.notes ?? '',
    });
  }, [data.data?.customer]);

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateCustomer.mutate({
        name: editForm.name,
        email: editForm.email || null,
        phone: editForm.phone || null,
        preferred_locale: editForm.preferred_locale,
        gender: editForm.gender || null,
        street: editForm.street || null,
        postal_code: editForm.postal_code || null,
        city: editForm.city || null,
        country: editForm.country || null,
        notes: editForm.notes || null,
      });
      push({ tone: 'success', title: t('adminNew.customerDetail.toasts.customerUpdated') });
      setShowEdit(false);
      await data.refetch();
    } catch (err) {
      push({
        tone: 'error',
        title: t('adminNew.customerDetail.toasts.saveFailed'),
        message: getApiErrorMessage(err),
      });
    }
  };

  const handleCreateBoat = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createBoat.mutate({
        customer_id: customerId,
        name: boatForm.name,
        type: boatForm.type,
        length_cm: boatForm.length_cm ? Number(boatForm.length_cm) : null,
        location_code: boatForm.location_code || null,
      });
      push({ tone: 'success', title: t('adminNew.customerDetail.toasts.boatAdded') });
      setShowBoat(false);
      setBoatForm({ name: '', type: 'motor', length_cm: '', location_code: '' });
      await data.refetch();
    } catch (err) {
      push({
        tone: 'error',
        title: t('adminNew.customerDetail.toasts.createFailed'),
        message: getApiErrorMessage(err),
      });
    }
  };

  const onCreateInvoice = async () => {
    try {
      const invoice = await createInvoice.mutate();
      push({ tone: 'success', title: t('adminNew.customerDetail.toasts.invoiceCreated') });
      window.location.href = `/${locale}/admin/facturen/${invoice.id}`;
    } catch (err) {
      push({
        tone: 'error',
        title: t('adminNew.customerDetail.toasts.invoiceCreateFailed'),
        message: getApiErrorMessage(err),
      });
    }
  };

  const onCreditWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    const euros = Number(walletAmount);
    if (!euros) return;
    setConfirmWalletCredit(true);
  };

  const executeWalletCredit = async () => {
    const euros = Number(walletAmount);
    if (!euros) return;
    try {
      await creditWallet.mutate({
        amount_cents: Math.round(euros * 100),
        description: walletDescription || t('adminNew.wallet.defaultCreditDescription'),
      });
      push({ tone: 'success', title: t('adminNew.wallet.toasts.credited') });
      setShowWalletCredit(false);
      setWalletAmount('');
      setWalletDescription('');
      await data.refetch();
    } catch (err) {
      push({
        tone: 'error',
        title: t('adminNew.common.operationFailed'),
        message: getApiErrorMessage(err),
      });
    }
  };

  const invoiceCount = data.data?.invoices.length ?? 0;
  const stallingCount = data.data?.stalling.length ?? 0;
  const boatsCount = data.data?.boats.length ?? 0;
  const openBalance =
    data.data?.invoices.reduce((sum, inv) => sum + inv.outstanding_cents / 100, 0) ?? 0;

  return (
    <>
      <AdminPageHeader
        title={data.data?.customer.name ?? t('adminNew.customerDetail.fallbackTitle')}
        subtitle={data.data?.customer.customer_number}
        rightSlot={
          <>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<UserRound className="h-4 w-4" />}
              onClick={() => setShowImpersonateConfirm(true)}
            >
              {t('adminNew.impersonation.action')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Save className="h-4 w-4" />}
              onClick={() => setShowEdit(true)}
            >
              {t('adminNew.customerDetail.actions.editCustomer')}
            </Button>
            <Button
              variant="gold"
              size="sm"
              leftIcon={<FilePlus2 className="h-4 w-4" />}
              onClick={() => setConfirmNewInvoice(true)}
            >
              {t('adminNew.customerDetail.actions.newInvoice')}
            </Button>
          </>
        }
        stats={[
          {
            label: t('adminNew.customerDetail.boats'),
            value: boatsCount,
            icon: Ship,
            tone: 'marine',
            loading: data.loading,
          },
          {
            label: t('adminNew.customerDetail.stallingContracts'),
            value: stallingCount,
            icon: Warehouse,
            tone: 'gold',
            loading: data.loading,
          },
          {
            label: t('adminNew.customerDetail.invoices'),
            value: invoiceCount,
            icon: CreditCard,
            tone: 'navy',
            loading: data.loading,
          },
          {
            label: t('adminNew.customerDetail.openBalance'),
            value: formatCurrency(openBalance, locale === 'en' ? 'en-GB' : 'nl-NL'),
            icon: Users,
            tone: openBalance > 0 ? 'warning' : 'success',
            loading: data.loading,
          },
        ]}
      />

      <AdminContent>
        {data.loading ? (
          <LoadingState label={t('adminNew.customerDetail.loading')} variant="detail" />
        ) : null}
        {!data.loading && data.error ? (
          <ErrorState message={data.error} onRetry={() => void data.refetch()} />
        ) : null}
        {!data.loading && !data.error && !data.data ? <EmptyState /> : null}

        {!data.loading && data.data ? (
          <>
            <div className="bento-grid lg:grid-cols-3">
              <AdminSectionCard
                className="lg:col-span-2"
                title={t('adminNew.customerDetail.infoTitle')}
                description={data.data.customer.customer_number}
                icon={Users}
              >
                <AdminDetailGrid
                  items={[
                    { label: t('adminNew.common.name'), value: data.data.customer.name },
                    {
                      label: t('adminNew.common.email'),
                      value: data.data.customer.email ?? '-',
                    },
                    {
                      label: t('adminNew.common.phone'),
                      value: data.data.customer.phone ?? '-',
                    },
                    {
                      label: t('adminNew.customerDetail.preferredLocale'),
                      value: data.data.customer.preferred_locale,
                    },
                    {
                      label: t('adminNew.customerDetail.company'),
                      value: data.data.customer.company_name ?? '-',
                    },
                    {
                      label: t('adminNew.customerDetail.vatNumber'),
                      value: data.data.customer.vat_number ?? '-',
                    },
                  ]}
                />
                <div className="mt-4 rounded-xl border border-navy-100/70 bg-sand-50/60 p-4 text-sm text-navy-700">
                  <div className="font-medium text-navy-900">{t('adminNew.customerDetail.notes')}</div>
                  <div className="mt-1 whitespace-pre-wrap text-sm">
                    {data.data.customer.notes ?? t('adminNew.customerDetail.noNotes')}
                  </div>
                </div>
              </AdminSectionCard>

              <div className="space-y-5">
              <AdminSectionCard
                title={t('adminNew.customerDetail.summaryTitle')}
                description={t('adminNew.customerDetail.infoTitle')}
                icon={CreditCard}
              >
                <div className="space-y-2">
                  <AdminStatusStrip label={t('adminNew.customerDetail.boats')} value={boatsCount} tone="marine" />
                  <AdminStatusStrip
                    label={t('adminNew.customerDetail.stallingContracts')}
                    value={stallingCount}
                    tone="gold"
                  />
                  <AdminStatusStrip
                    label={t('adminNew.customerDetail.invoices')}
                    value={invoiceCount}
                    tone="navy"
                  />
                  <AdminStatusStrip
                    label={t('adminNew.customerDetail.openBalance')}
                    value={formatCurrency(
                      openBalance,
                      locale === 'en' ? 'en-GB' : 'nl-NL'
                    )}
                    tone={openBalance > 0 ? 'warning' : 'success'}
                  />
                </div>
                <Link
                  href={`/${locale}/admin/klanten/${customerId}/timeline`}
                  className="mt-3 inline-flex text-sm font-semibold text-marine-700 hover:text-marine-900"
                >
                  {t('adminNew.customerDetail.viewTimeline')} →
                </Link>
              </AdminSectionCard>

              {/* Trello #90: customer health score */}
              {(() => {
                const h = health.data as Record<string, unknown> | null;
                if (!h || h.score == null) return null;
                const label = String(h.label ?? 'good');
                const tone =
                  label === 'excellent' ? 'success'
                  : label === 'good' ? 'marine'
                  : label === 'fair' ? 'gold'
                  : 'danger';
                const breakdown = (h.breakdown ?? {}) as Record<string, unknown>;
                return (
                  <AdminSectionCard
                    title={t('adminNew.customerDetail.health.title')}
                    description={t('adminNew.customerDetail.health.subtitle')}
                    icon={Activity}
                    action={
                      <Button size="sm" variant="ghost" onClick={() => void onRecomputeHealth()} disabled={recomputeHealth.loading}>
                        {t('adminNew.customerDetail.health.recompute')}
                      </Button>
                    }
                  >
                    <div className="flex items-center gap-4">
                      <div className={`text-4xl font-bold ${tone === 'danger' ? 'text-rose-600' : tone === 'gold' ? 'text-amber-600' : 'text-marine-700'}`}>
                        {String(h.score)}
                      </div>
                      <Badge tone={tone}>{t(`adminNew.customerDetail.health.labels.${label}`)}</Badge>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-navy-600">
                      <span>{t('adminNew.customerDetail.health.recentPaid')}: <strong>{String(breakdown.recent_paid_invoices ?? 0)}</strong></span>
                      <span>{t('adminNew.customerDetail.health.overdue')}: <strong>{String(breakdown.overdue_invoices ?? 0)}</strong></span>
                      <span>{t('adminNew.customerDetail.health.activeContract')}: <strong>{breakdown.active_contract ? t('adminNew.common.yes') : t('adminNew.common.no')}</strong></span>
                      <span>{t('adminNew.customerDetail.health.openOrders')}: <strong>{String(breakdown.open_work_orders ?? 0)}</strong></span>
                    </div>
                  </AdminSectionCard>
                );
              })()}

              <AdminSectionCard
                title={t('adminNew.wallet.title')}
                description={t('adminNew.wallet.balanceHint')}
                icon={Wallet}
                action={
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setShowMonthlyStatement(true)}>
                      {t('adminNew.wallet.monthlyStatement')}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setShowWalletCredit(true)}>
                      {t('adminNew.wallet.credit')}
                    </Button>
                  </div>
                }
              >
                <div className="text-2xl font-semibold text-navy-900">
                  {formatCurrency(
                    data.data.wallet?.balance_euros ?? centsToEuro(data.data.wallet?.balance_cents),
                    locale === 'en' ? 'en-GB' : 'nl-NL'
                  )}
                </div>
                <p className="mt-1 text-xs text-navy-500">{t('adminNew.wallet.balanceHint')}</p>
                {(data.data.wallet?.transactions ?? []).slice(0, 3).map((tx) => (
                  <div key={tx.id} className="mt-3 flex items-center justify-between border-t border-navy-100 pt-3 text-sm">
                    <span className="text-navy-600">{tx.description}</span>
                    <span className="font-medium">{formatCurrency((tx.amount_euros ?? tx.amount_cents / 100), locale === 'en' ? 'en-GB' : 'nl-NL')}</span>
                  </div>
                ))}
              </AdminSectionCard>
              </div>
            </div>

            <AdminSectionCard
              title={t('adminNew.customerDetail.boats')}
              description={t('adminNew.customerDetail.noBoats')}
              icon={Ship}
              action={
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<Ship className="h-4 w-4" />}
                  onClick={() => setShowBoat(true)}
                >
                  {t('adminNew.customerDetail.actions.addBoat')}
                </Button>
              }
            >
              <AdminTable minWidth={760}>
                <AdminTableHead>
                  <tr>
                    <AdminTableHeaderCell>{t('adminNew.customerDetail.table.boats.name')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{t('adminNew.customerDetail.table.boats.type')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{t('adminNew.customerDetail.table.boats.length')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{t('adminNew.customerDetail.table.boats.location')}</AdminTableHeaderCell>
                  </tr>
                </AdminTableHead>
                <tbody>
                  {data.data.boats.length ? (
                    data.data.boats.map((boat) => (
                      <AdminTableRow key={boat.id}>
                        <AdminTableCell className="font-semibold text-navy-900">
                          {boat.name}
                        </AdminTableCell>
                        <AdminTableCell className="capitalize">{boat.type}</AdminTableCell>
                        <AdminTableCell>
                          {boat.length_cm ? `${boat.length_cm} cm` : '-'}
                        </AdminTableCell>
                        <AdminTableCell>{boat.location_code ?? '-'}</AdminTableCell>
                      </AdminTableRow>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="border-t border-navy-100 px-4 py-8 text-center text-sm text-navy-500">
                        {t('adminNew.customerDetail.noBoats')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </AdminTable>
            </AdminSectionCard>

            <div className="bento-grid lg:grid-cols-2">
              <AdminSectionCard
                title={t('adminNew.customerDetail.invoices')}
                description={t('adminNew.customerDetail.noInvoices')}
                icon={CreditCard}
              >
                <div className="divide-y divide-navy-100 rounded-xl border border-navy-100/70">
                  {data.data.invoices.length ? (
                    data.data.invoices.slice(0, 10).map((invoice) => (
                      <Link
                        key={invoice.id}
                        href={`/${locale}/admin/facturen/${invoice.id}`}
                        className="flex items-center justify-between px-4 py-3 transition hover:bg-sand-50/80"
                      >
                        <div>
                          <div className="font-medium text-navy-900">{invoice.invoice_number}</div>
                          <div className="text-xs text-navy-500">
                            {t('adminNew.customerDetail.dueDate')}:{' '}
                            {formatDate(invoice.due_date)}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-sm font-semibold text-navy-900">
                            {formatCurrency(
                              invoice.total_amount_euros,
                              locale === 'en' ? 'en-GB' : 'nl-NL'
                            )}
                          </div>
                          <InvoiceStatusBadge status={invoice.status} isOverdue={invoice.is_overdue} />
                        </div>
                      </Link>
                    ))
                  ) : (
                    <div className="px-4 py-6 text-sm text-navy-500">
                      {t('adminNew.customerDetail.noInvoices')}
                    </div>
                  )}
                </div>
              </AdminSectionCard>

              <AdminSectionCard
                title={t('adminNew.customerDetail.stallingContracts')}
                description={t('adminNew.customerDetail.noContracts')}
                icon={Warehouse}
              >
                <div className="divide-y divide-navy-100 rounded-xl border border-navy-100/70">
                  {data.data.stalling.length ? (
                    data.data.stalling.slice(0, 10).map((contract) => (
                      <div
                        key={contract.id}
                        className="flex items-center justify-between px-4 py-3"
                      >
                        <div>
                          <div className="font-medium text-navy-900">{contract.contract_number}</div>
                          <div className="text-xs text-navy-500">
                            {contract.type} · {formatDate(contract.start_date)} -{' '}
                            {formatDate(contract.end_date)}
                          </div>
                        </div>
                        <div className="text-sm font-semibold text-navy-900">
                          {formatCurrency(
                            contract.open_balance_cents / 100,
                            locale === 'en' ? 'en-GB' : 'nl-NL'
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="px-4 py-6 text-sm text-navy-500">
                      {t('adminNew.customerDetail.noContracts')}
                    </div>
                  )}
                </div>
              </AdminSectionCard>
            </div>

            <AdminSectionCard
              title={t('adminNew.customerDetail.timelineTitle')}
              description={t('adminNew.customerDetail.timelineSubtitle')}
              icon={Clock}
            >
              {/* Trello #89: composer for internal notes / customer-visible messages */}
              <div className="mb-4 rounded-xl border border-navy-100 bg-sand-50/40 p-3">
                <textarea
                  className="input-base min-h-16 w-full"
                  placeholder={t('adminNew.customerDetail.timelinePlaceholder')}
                  value={tlBody}
                  onChange={(e) => setTlBody(e.target.value)}
                />
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="inline-flex overflow-hidden rounded-lg border border-navy-200">
                    {(['internal', 'customer'] as const).map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setTlVisibility(v)}
                        className={
                          'px-3 py-1.5 text-xs font-semibold transition ' +
                          (tlVisibility === v
                            ? 'bg-marine-600 text-white'
                            : 'bg-white text-navy-600 hover:bg-sand-50')
                        }
                      >
                        {v === 'internal'
                          ? t('adminNew.customerDetail.timelineInternal')
                          : t('adminNew.customerDetail.timelineCustomer')}
                      </button>
                    ))}
                  </div>
                  <Button
                    size="sm"
                    variant="gold"
                    disabled={!tlBody.trim() || postTimeline.loading}
                    onClick={() => void handlePostTimeline()}
                  >
                    {t('adminNew.customerDetail.timelinePost')}
                  </Button>
                </div>
              </div>

              {data.data.timeline.length ? (
                <div className="divide-y divide-navy-100 rounded-xl border border-navy-100/70">
                  {data.data.timeline.map((item, idx) => {
                    const internal = String(item.visibility ?? '') === 'internal';
                    return (
                    <div key={String(item.id ?? idx)} className="px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-navy-900">{String(item.title ?? item.type ?? '—')}</span>
                            {internal ? (
                              <Badge tone="sand">{t('adminNew.customerDetail.timelineInternal')}</Badge>
                            ) : null}
                          </div>
                          {item.body ? (
                            <div className="mt-1 text-sm text-navy-600">{String(item.body)}</div>
                          ) : null}
                        </div>
                        <div className="shrink-0 text-xs text-navy-500">
                          {item.created_at ? formatDate(String(item.created_at)) : '—'}
                        </div>
                      </div>
                    </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-sm text-navy-500">{t('adminNew.customerDetail.timelineEmpty')}</div>
              )}
            </AdminSectionCard>

            <AdminSectionCard
              title={t('adminNew.customerDetail.files')}
              description={t('adminNew.customerDetail.noFiles')}
              icon={FileText}
            >
              {data.data.files.length ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  {data.data.files.map((file, idx) => (
                    <div
                      key={String(file.id ?? idx)}
                      className="rounded-xl border border-navy-100/70 bg-sand-50/40 px-3 py-2.5 text-sm"
                    >
                      <div className="font-medium text-navy-900">
                        {String(
                          file.original_name ?? file.name ?? `${t('adminNew.customerDetail.file')} ${idx + 1}`
                        )}
                      </div>
                      <div className="text-xs text-navy-500">{String(file.mime_type ?? '')}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-navy-500">{t('adminNew.customerDetail.noFiles')}</div>
              )}
            </AdminSectionCard>

            {/* Trello #104 (Pillar 20): AVG / GDPR */}
            <AdminSectionCard
              title={t('adminNew.gdpr.title')}
              description={t('adminNew.gdpr.subtitle')}
              icon={ShieldCheck}
            >
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<Download className="h-4 w-4" />}
                  disabled={gdprExport.loading}
                  onClick={() => void onGdprExport()}
                >
                  {gdprExport.loading ? t('adminNew.common.loading') : t('adminNew.gdpr.export')}
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  leftIcon={<UserX className="h-4 w-4" />}
                  onClick={() => {
                    setAnonymizeConfirm('');
                    setAnonymizeReason('');
                    setShowAnonymize(true);
                  }}
                >
                  {t('adminNew.gdpr.anonymize')}
                </Button>
              </div>
              <p className="mt-3 text-xs text-navy-500">{t('adminNew.gdpr.hint')}</p>
            </AdminSectionCard>
          </>
        ) : null}
      </AdminContent>

      <Modal open={showEdit} onClose={() => setShowEdit(false)} size="md">
        <form onSubmit={handleSaveCustomer} className="p-6">
          <h2 className="text-lg font-semibold text-navy-900">
            {t('adminNew.customerDetail.modals.editTitle')}
          </h2>
          <div className="mt-4 space-y-3">
            <Input
              label={t('adminNew.common.name')}
              value={editForm.name}
              onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
              required
            />
            <Input
              label={t('adminNew.common.email')}
              value={editForm.email}
              onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))}
            />
            <Input
              label={t('adminNew.common.phone')}
              value={editForm.phone}
              onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value }))}
            />
            <div>
              <label className="mb-1.5 block text-sm font-medium text-navy-800">
                {t('adminNew.customerDetail.preferredLocale')}
              </label>
              <select
                className="input-base w-full"
                value={editForm.preferred_locale}
                onChange={(e) => setEditForm((p) => ({ ...p, preferred_locale: e.target.value }))}
              >
                <option value="nl-NL">Nederlands (NL)</option>
                <option value="en-GB">English (EN)</option>
                <option value="de-DE">Deutsch (DE)</option>
                <option value="fr-FR">Français (FR)</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-navy-800">
                {t('adminNew.customerDetail.gender')}
              </label>
              <select
                className="input-base w-full"
                value={editForm.gender}
                onChange={(e) => setEditForm((p) => ({ ...p, gender: e.target.value }))}
              >
                <option value="">{t('adminNew.customerDetail.genderUnspecified')}</option>
                <option value="male">{t('adminNew.customerDetail.genderMale')}</option>
                <option value="female">{t('adminNew.customerDetail.genderFemale')}</option>
                <option value="other">{t('adminNew.customerDetail.genderOther')}</option>
              </select>
            </div>
            <Input
              label={t('adminNew.customerDetail.street')}
              value={editForm.street}
              onChange={(e) => setEditForm((p) => ({ ...p, street: e.target.value }))}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label={t('adminNew.customerDetail.postalCode')}
                value={editForm.postal_code}
                onChange={(e) => setEditForm((p) => ({ ...p, postal_code: e.target.value }))}
              />
              <Input
                label={t('adminNew.customerDetail.city')}
                value={editForm.city}
                onChange={(e) => setEditForm((p) => ({ ...p, city: e.target.value }))}
              />
            </div>
            <Input
              label={t('adminNew.customerDetail.country')}
              value={editForm.country}
              onChange={(e) => setEditForm((p) => ({ ...p, country: e.target.value }))}
            />
            <div>
              <label className="mb-1.5 block text-sm font-medium text-navy-800">
                {t('adminNew.customerDetail.notes')}
              </label>
              <textarea
                className="input-base min-h-24"
                value={editForm.notes}
                onChange={(e) => setEditForm((p) => ({ ...p, notes: e.target.value }))}
              />
            </div>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setShowEdit(false)}>
              {t('adminNew.common.cancel')}
            </Button>
            <Button type="submit" variant="gold" disabled={updateCustomer.loading}>
              {updateCustomer.loading
                ? t('adminNew.common.saving')
                : t('adminNew.common.save')}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={showBoat} onClose={() => setShowBoat(false)} size="md">
        <form onSubmit={handleCreateBoat} className="p-6">
          <h2 className="text-lg font-semibold text-navy-900">
            {t('adminNew.customerDetail.modals.addBoatTitle')}
          </h2>
          <div className="mt-4 space-y-3">
            <Input
              label={t('adminNew.common.name')}
              value={boatForm.name}
              onChange={(e) => setBoatForm((p) => ({ ...p, name: e.target.value }))}
              required
            />
            <div>
              <label className="mb-1.5 block text-sm font-medium text-navy-800">
                {t('adminNew.customerDetail.boatType')}
              </label>
              <select
                className="input-base"
                value={boatForm.type}
                onChange={(e) => setBoatForm((p) => ({ ...p, type: e.target.value }))}
              >
                <option value="motor">{t('adminNew.boats.type.motor')}</option>
                <option value="sail">{t('adminNew.boats.type.sail')}</option>
                <option value="rib">RIB</option>
                <option value="trailer">Trailer</option>
                <option value="other">{t('adminNew.boats.type.other')}</option>
              </select>
            </div>
            <Input
              label={t('adminNew.customerDetail.lengthCm')}
              value={boatForm.length_cm}
              onChange={(e) => setBoatForm((p) => ({ ...p, length_cm: e.target.value }))}
            />
            <Input
              label={t('adminNew.customerDetail.locationCode')}
              value={boatForm.location_code}
              onChange={(e) =>
                setBoatForm((p) => ({ ...p, location_code: e.target.value }))
              }
            />
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setShowBoat(false)}>
              {t('adminNew.common.cancel')}
            </Button>
            <Button type="submit" variant="gold" disabled={createBoat.loading}>
              {createBoat.loading
                ? t('adminNew.common.saving')
                : t('adminNew.customerDetail.actions.addBoat')}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={showWalletCredit} onClose={() => setShowWalletCredit(false)} size="md">
        <form onSubmit={onCreditWallet} className="p-6">
          <h2 className="text-lg font-semibold text-navy-900">{t('adminNew.wallet.creditModal.title')}</h2>
          <div className="mt-4 space-y-3">
            <Input
              label={t('adminNew.wallet.creditModal.amount')}
              inputMode="decimal"
              value={walletAmount}
              onChange={(e) => setWalletAmount(e.target.value)}
              required
            />
            <Input
              label={t('adminNew.wallet.creditModal.description')}
              value={walletDescription}
              onChange={(e) => setWalletDescription(e.target.value)}
              required
            />
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setShowWalletCredit(false)}>
              {t('adminNew.common.cancel')}
            </Button>
            <Button type="submit" variant="gold" disabled={creditWallet.loading}>
              {creditWallet.loading ? t('adminNew.common.saving') : t('adminNew.wallet.credit')}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={showMonthlyStatement} onClose={() => setShowMonthlyStatement(false)} size="md">
        <form
          className="p-6"
          onSubmit={(e) => {
            e.preventDefault();
            void (async () => {
              try {
                const result = await monthlyStatement.mutate();
                push({ tone: 'success', title: t('adminNew.wallet.toasts.statementGenerated') });
                setShowMonthlyStatement(false);
                await data.refetch();
                if (result?.invoice_id) {
                  window.location.href = `/${locale}/admin/facturen/${result.invoice_id}`;
                }
              } catch (err) {
                push({
                  tone: 'error',
                  title: t('adminNew.common.operationFailed'),
                  message: getApiErrorMessage(err),
                });
              }
            })();
          }}
        >
          <h2 className="text-lg font-semibold text-navy-900">{t('adminNew.wallet.statementModal.title')}</h2>
          <p className="mt-1 text-sm text-navy-500">{t('adminNew.wallet.statementModal.subtitle')}</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Input
              label={t('adminNew.wallet.statementModal.year')}
              type="number"
              min={2020}
              max={2100}
              value={statementYear}
              onChange={(e) => setStatementYear(e.target.value)}
              required
            />
            <Input
              label={t('adminNew.wallet.statementModal.month')}
              type="number"
              min={1}
              max={12}
              value={statementMonth}
              onChange={(e) => setStatementMonth(e.target.value)}
              required
            />
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setShowMonthlyStatement(false)}>
              {t('adminNew.common.cancel')}
            </Button>
            <Button type="submit" variant="gold" disabled={monthlyStatement.loading}>
              {monthlyStatement.loading
                ? t('adminNew.common.saving')
                : t('adminNew.wallet.statementModal.generate')}
            </Button>
          </div>
        </form>
      </Modal>

      <AdminConfirmModal
        open={showImpersonateConfirm}
        onClose={() => setShowImpersonateConfirm(false)}
        onConfirm={async () => {
          const email = data.data?.customer.email;
          if (!email) {
            push({ tone: 'error', title: t('adminNew.impersonation.noEmail') });
            setShowImpersonateConfirm(false);
            return;
          }
          try {
            const userId = await findUserIdByEmail(email);
            if (!userId) {
              push({ tone: 'error', title: t('adminNew.impersonation.noUser') });
              setShowImpersonateConfirm(false);
              return;
            }
            await impersonateUser(userId, locale);
          } catch (err) {
            push({
              tone: 'error',
              title:
                err instanceof ImpersonationError
                  ? t('adminNew.impersonation.notAllowed')
                  : t('adminNew.impersonation.failed'),
              message: err instanceof ImpersonationError ? undefined : getApiErrorMessage(err),
            });
          } finally {
            setShowImpersonateConfirm(false);
          }
        }}
        title={t('adminNew.impersonation.confirmTitle')}
        message={t('adminNew.impersonation.confirmMessage', { name: data.data?.customer.name ?? '' })}
        confirmLabel={t('adminNew.impersonation.action')}
        cancelLabel={t('adminNew.common.cancel')}
        variant="primary"
        icon={UserRound}
      />

      <AdminConfirmModal
        open={confirmNewInvoice}
        onClose={() => setConfirmNewInvoice(false)}
        onConfirm={async () => {
          await onCreateInvoice();
          setConfirmNewInvoice(false);
        }}
        title={t('adminNew.customerDetail.actions.newInvoice')}
        message={t('adminNew.customerDetail.confirmNewInvoice')}
        confirmLabel={t('adminNew.customerDetail.actions.newInvoice')}
        cancelLabel={t('adminNew.common.cancel')}
        variant="primary"
        icon={FilePlus2}
        loading={createInvoice.loading}
      />

      <AdminConfirmModal
        open={confirmWalletCredit}
        onClose={() => setConfirmWalletCredit(false)}
        onConfirm={async () => {
          await executeWalletCredit();
          setConfirmWalletCredit(false);
        }}
        title={t('adminNew.wallet.creditModal.title')}
        message={t('adminNew.wallet.confirmCredit', {
          amount: formatCurrency(Number(walletAmount) || 0, locale === 'en' ? 'en-GB' : 'nl-NL'),
        })}
        confirmLabel={t('adminNew.wallet.credit')}
        cancelLabel={t('adminNew.common.cancel')}
        variant="primary"
        icon={Wallet}
        loading={creditWallet.loading}
      />

      {/* Trello #104 (Pillar 20): anonymise — requires typing ANONYMIZE + a reason. */}
      <Modal open={showAnonymize} onClose={() => setShowAnonymize(false)} size="md">
        <form
          className="p-6"
          onSubmit={(e) => {
            e.preventDefault();
            void onAnonymize();
          }}
        >
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
              <UserX className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-navy-900">{t('adminNew.gdpr.anonymizeModal.title')}</h2>
              <p className="mt-1 text-sm text-navy-500">{t('adminNew.gdpr.anonymizeModal.message')}</p>
            </div>
          </div>
          <div className="mt-4 space-y-3">
            <Input
              label={t('adminNew.gdpr.anonymizeModal.confirmLabel')}
              placeholder="ANONYMIZE"
              value={anonymizeConfirm}
              onChange={(e) => setAnonymizeConfirm(e.target.value)}
              required
            />
            <Input
              label={t('adminNew.gdpr.anonymizeModal.reasonLabel')}
              value={anonymizeReason}
              onChange={(e) => setAnonymizeReason(e.target.value)}
              required
            />
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setShowAnonymize(false)}>
              {t('adminNew.common.cancel')}
            </Button>
            <Button
              type="submit"
              variant="danger"
              disabled={
                gdprAnonymize.loading ||
                anonymizeConfirm.trim() !== 'ANONYMIZE' ||
                anonymizeReason.trim().length < 5
              }
            >
              {gdprAnonymize.loading ? t('adminNew.common.saving') : t('adminNew.gdpr.anonymize')}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
