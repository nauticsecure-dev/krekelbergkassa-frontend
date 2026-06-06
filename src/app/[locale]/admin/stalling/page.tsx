'use client';

import * as React from 'react';
import Link from 'next/link';
import { FilePlus2, MapPin, Pencil, Plus, Ship, ShieldCheck, Warehouse, XCircle } from 'lucide-react';
import { AdminPageHeader } from '@/components/admin/AdminShell';
import { PaymentStatusBadge } from '@/components/admin/StatusBadge';
import type { StallingContract } from '@/lib/api-types';
import { AdminConfirmModal } from '@/components/admin/AdminConfirmModal';
import {
  AdminContent,
  AdminModalBody,
  AdminModalFooter,
  AdminModalHeader,
  AdminSearchInput,
  AdminSectionCard,
  AdminSelect,
  AdminTable,
  AdminTableCard,
  AdminTableCell,
  AdminTableFooter,
  AdminTableHead,
  AdminTableHeaderCell,
  AdminTableRow,
  AdminToolbar,
} from '@/components/admin/AdminUi';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { LoadingState, EmptyState, ErrorState } from '@/components/admin/DataState';
import { useMutation, useQuery } from '@/lib/hooks/useAsync';
import {
  auditService,
  boatsService,
  customersService,
  pricingService,
  stallingService,
  type BrokeragePreview,
} from '@/lib/services';
import { formatCurrency, formatDate } from '@/lib/format';
import { useIntl } from '@/i18n/IntlProvider';
import { useToast } from '@/components/ui/ToastProvider';
import { getApiErrorMessage } from '@/lib/api-error';

export default function StallingPage() {
  const { locale, t } = useIntl();
  const { push } = useToast();
  const dateLocale = locale === 'en' ? 'en-GB' : locale === 'de' ? 'de-DE' : 'nl-NL';

  const [search, setSearch] = React.useState('');
  const [status, setStatus] = React.useState('');
  const [type, setType] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [cancelTarget, setCancelTarget] = React.useState<string | null>(null);
  const [invoiceTarget, setInvoiceTarget] = React.useState<string | null>(null);
  const [editTarget, setEditTarget] = React.useState<StallingContract | null>(null);
  const [editStatus, setEditStatus] = React.useState('');
  const [editLocation, setEditLocation] = React.useState('');
  const [showCreate, setShowCreate] = React.useState(false);
  const [createForm, setCreateForm] = React.useState({
    boat_id: '',
    customer_id: '',
    type: 'winter',
    start_date: '',
    end_date: '',
    paid_until: '',
    location: '',
    payment_route: 'email',
    send_contract_email: true,
    deposit_pct: '',
  });
  // Trello #107: inline "+ new boat / + new customer" so staff don't have to
  // leave the contract modal. Both call the existing create endpoints, refetch
  // the option lists, and auto-select the freshly created record.
  const [showNewBoat, setShowNewBoat] = React.useState(false);
  const [showNewCustomer, setShowNewCustomer] = React.useState(false);
  const [newBoat, setNewBoat] = React.useState({ name: '', length_cm: '', boat_type: '' });
  const [newCustomer, setNewCustomer] = React.useState({ name: '', email: '', phone: '' });
  // Trello #107: brokerage (makelaardij) preview. The brokerage start date is
  // its own date (not the storage start) — the free-period runs from here.
  const [brokerage, setBrokerage] = React.useState(false);
  const [brokerageStart, setBrokerageStart] = React.useState('');
  const [brokeragePreview, setBrokeragePreview] = React.useState<BrokeragePreview | null>(null);

  const contracts = useQuery([search, status, type, page], () =>
    stallingService.list({
      search: search || undefined,
      status: status || undefined,
      type: type || undefined,
      page,
      per_page: 25,
    })
  );
  const auditLogs = useQuery(['stalling-audit'], () =>
    auditService.logs({ entity_type: 'stalling_contract', per_page: 15 })
  );
  const boats = useQuery(['stalling-boats'], () => boatsService.list({ per_page: 200 }));
  const customers = useQuery(['stalling-customers'], () => customersService.list({ per_page: 200 }));

  const selectedBoatLength = React.useMemo(() => {
    const boat = (boats.data?.data ?? []).find((b) => b.id === createForm.boat_id);
    return boat?.length_cm ?? null;
  }, [boats.data, createForm.boat_id]);

  React.useEffect(() => {
    if (!brokerage || !selectedBoatLength) {
      setBrokeragePreview(null);
      return;
    }
    let cancelled = false;
    void pricingService
      .brokeragePreview({
        length_cm: selectedBoatLength,
        brokerage_start_date: brokerageStart || undefined,
      })
      .then((res) => {
        if (!cancelled) setBrokeragePreview(res);
      })
      .catch(() => {
        if (!cancelled) setBrokeragePreview(null);
      });
    return () => {
      cancelled = true;
    };
  }, [brokerage, selectedBoatLength, brokerageStart]);

  // Trello #107: when the contract type changes, prefill the season dates that
  // match each storage product. Staff can still override either date.
  const applyTypeDefaults = React.useCallback((nextType: string) => {
    const today = new Date();
    const iso = (d: Date) => d.toISOString().slice(0, 10);
    let start = '';
    let end = '';
    if (nextType === 'winter') {
      const y = today.getMonth() >= 9 ? today.getFullYear() : today.getFullYear() - 1;
      start = `${y}-10-01`;
      end = `${y + 1}-05-01`;
    } else if (nextType === 'summer') {
      const y = today.getFullYear();
      start = `${y}-05-01`;
      end = `${y}-10-01`;
    } else if (nextType === 'year') {
      start = iso(today);
      const next = new Date(today);
      next.setFullYear(next.getFullYear() + 1);
      end = iso(next);
    } else if (nextType === 'week') {
      start = iso(today);
      const next = new Date(today);
      next.setDate(next.getDate() + 7);
      end = iso(next);
    }
    return { start, end };
  }, []);

  const createBoat = useMutation(boatsService.create);
  const createCustomer = useMutation(customersService.create);

  const onCreateBoat = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await createBoat.mutate({
        name: newBoat.name,
        length_cm: newBoat.length_cm ? Number(newBoat.length_cm) : undefined,
        boat_type: newBoat.boat_type || undefined,
        customer_id: createForm.customer_id || undefined,
      });
      await boats.refetch();
      if (created?.id) setCreateForm((f) => ({ ...f, boat_id: created.id }));
      setShowNewBoat(false);
      setNewBoat({ name: '', length_cm: '', boat_type: '' });
      push({ tone: 'success', title: t('adminNew.boats.toasts.created') });
    } catch (err) {
      push({ tone: 'error', title: t('adminNew.common.operationFailed'), message: getApiErrorMessage(err) });
    }
  };

  const onCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await createCustomer.mutate({
        name: newCustomer.name,
        email: newCustomer.email || undefined,
        phone: newCustomer.phone || undefined,
      });
      await customers.refetch();
      if (created?.id) setCreateForm((f) => ({ ...f, customer_id: created.id }));
      setShowNewCustomer(false);
      setNewCustomer({ name: '', email: '', phone: '' });
      push({ tone: 'success', title: t('adminNew.customers.toasts.created') });
    } catch (err) {
      push({ tone: 'error', title: t('adminNew.common.operationFailed'), message: getApiErrorMessage(err) });
    }
  };

  const createContract = useMutation(stallingService.create);
  const createInvoice = useMutation((id: string) => stallingService.generateInvoice(id));
  const cancelContract = useMutation((id: string) => stallingService.cancel(id, 'Cancelled by staff'));
  const setStatusM = useMutation((p: { id: string; status: string }) =>
    stallingService.setStatus(p.id, p.status)
  );
  const setLocationM = useMutation((p: { id: string; location: string }) =>
    stallingService.setLocation(p.id, p.location || null)
  );

  const openEdit = (contract: StallingContract) => {
    setEditTarget(contract);
    setEditStatus(contract.payment_status);
    setEditLocation(contract.boat?.location_code ?? '');
  };

  const onSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    const id = editTarget.id;
    try {
      if (editStatus !== editTarget.payment_status) {
        await setStatusM.mutate({ id, status: editStatus });
        push({ tone: 'success', title: t('adminNew.stalling.toasts.statusUpdated') });
      }
      if (editLocation !== (editTarget.boat?.location_code ?? '')) {
        await setLocationM.mutate({ id, location: editLocation });
        push({ tone: 'success', title: t('adminNew.stalling.toasts.locationUpdated') });
      }
      setEditTarget(null);
      await contracts.refetch();
    } catch (err) {
      push({
        tone: 'error',
        title: t('adminNew.common.operationFailed'),
        message: getApiErrorMessage(err),
      });
    }
  };

  const execute = async (label: string, fn: () => Promise<unknown>, redirectInvoice = false) => {
    try {
      const result = await fn();
      push({ tone: 'success', title: label });
      await contracts.refetch();
      if (redirectInvoice && result && typeof result === 'object' && 'id' in result) {
        window.location.href = `/${locale}/admin/facturen/${(result as { id: string }).id}`;
      }
    } catch (err) {
      push({
        tone: 'error',
        title: t('adminNew.common.operationFailed'),
        message: getApiErrorMessage(err),
      });
    }
  };

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createContract.mutate({
        boat_id: createForm.boat_id,
        customer_id: createForm.customer_id || undefined,
        type: createForm.type,
        start_date: createForm.start_date,
        end_date: createForm.end_date,
        paid_until: createForm.paid_until || undefined,
        location: createForm.location || undefined,
        payment_route: createForm.payment_route || undefined,
        send_contract_email: createForm.send_contract_email,
        deposit_pct: createForm.deposit_pct ? Number(createForm.deposit_pct) : undefined,
      });
      setShowCreate(false);
      setCreateForm({
        boat_id: '',
        customer_id: '',
        type: 'winter',
        start_date: '',
        end_date: '',
        paid_until: '',
        location: '',
        payment_route: 'email',
        send_contract_email: true,
        deposit_pct: '',
      });
      setBrokerage(false);
      setBrokerageStart('');
      await contracts.refetch();
      push({ tone: 'success', title: t('adminNew.stalling.toasts.created') });
    } catch (err) {
      push({
        tone: 'error',
        title: t('adminNew.common.operationFailed'),
        message: getApiErrorMessage(err),
      });
    }
  };

  const rows = contracts.data?.data ?? [];
  const overdue = rows.filter((c) => c.payment_status === 'overdue').length;
  const openBalance = rows.reduce((sum, c) => sum + (c.open_balance_cents ?? 0) / 100, 0);

  return (
    <>
      <AdminPageHeader
        title={t('adminNew.stalling.title')}
        subtitle={t('adminNew.stalling.subtitle')}
        rightSlot={
          <Button variant="gold" size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setShowCreate(true)}>
            {t('adminNew.stalling.new')}
          </Button>
        }
        stats={[
          {
            label: t('adminNew.stalling.contracts', { count: contracts.data?.meta?.total ?? rows.length }),
            value: contracts.data?.meta?.total ?? rows.length,
            icon: Warehouse,
            tone: 'marine',
            loading: contracts.loading,
          },
          {
            label: t('adminNew.status.overdue'),
            value: overdue,
            icon: Ship,
            tone: overdue > 0 ? 'danger' : 'success',
            loading: contracts.loading,
          },
          {
            label: t('adminNew.stalling.columns.openBalance'),
            value: formatCurrency(openBalance, dateLocale),
            tone: 'gold',
            loading: contracts.loading,
          },
        ]}
      />

      <AdminContent>
        <AdminSectionCard
          title={t('adminNew.stalling.title')}
          description={t('adminNew.stalling.subtitle')}
          icon={Warehouse}
        >
        <AdminToolbar className="mb-4 border-0 bg-transparent p-0 shadow-none">
          <AdminSearchInput
            value={search}
            onChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
            placeholder={t('adminNew.stalling.searchPlaceholder')}
          />
          <label className="flex flex-col gap-1 lg:w-auto">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-navy-400">
              {t('adminNew.stalling.columns.status')}
            </span>
            <AdminSelect
              value={status}
              onChange={(value) => {
                setStatus(value);
                setPage(1);
              }}
            >
              <option value="">{t('adminNew.stalling.allStatuses')}</option>
              <option value="paid">{t('adminNew.status.paid')}</option>
              <option value="expiring">{t('adminNew.status.expiring')}</option>
              <option value="overdue">{t('adminNew.status.overdue')}</option>
              <option value="open">{t('adminNew.status.open')}</option>
              <option value="cancelled">{t('adminNew.status.cancelled')}</option>
            </AdminSelect>
          </label>
          <label className="flex flex-col gap-1 lg:w-auto">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-navy-400">
              {t('adminNew.stalling.columns.type')}
            </span>
            <AdminSelect
              value={type}
              onChange={(value) => {
                setType(value);
                setPage(1);
              }}
            >
              <option value="">{t('adminNew.stalling.allTypes')}</option>
              <option value="winter">{t('adminNew.stalling.type.winter')}</option>
              <option value="summer">{t('adminNew.stalling.type.summer')}</option>
              <option value="year">{t('adminNew.stalling.type.year')}</option>
              <option value="week">{t('adminNew.stalling.type.week')}</option>
            </AdminSelect>
          </label>
        </AdminToolbar>

        <AdminTableCard
          footer={
            rows.length > 0 ? (
              <AdminTableFooter
                summary={t('adminNew.stalling.contracts', {
                  count: contracts.data?.meta?.total ?? rows.length,
                })}
                meta={contracts.data?.meta}
                onPageChange={setPage}
              />
            ) : undefined
          }
        >
          {contracts.loading ? (
            <LoadingState label={t('adminNew.stalling.loading')} variant="table" />
          ) : null}
          {!contracts.loading && contracts.error ? (
            <ErrorState message={contracts.error} onRetry={() => void contracts.refetch()} />
          ) : null}
          {!contracts.loading && !contracts.error && rows.length === 0 ? (
            <EmptyState
              title={t('adminNew.stalling.emptyTitle')}
              message={t('adminNew.stalling.emptyMessage')}
            />
          ) : null}

          {!contracts.loading && !contracts.error && rows.length > 0 ? (
            <AdminTable minWidth={1100}>
              <AdminTableHead>
                <tr>
                  <AdminTableHeaderCell>{t('adminNew.stalling.columns.boat')}</AdminTableHeaderCell>
                  <AdminTableHeaderCell>{t('adminNew.stalling.columns.customer')}</AdminTableHeaderCell>
                  <AdminTableHeaderCell>{t('adminNew.stalling.columns.period')}</AdminTableHeaderCell>
                  <AdminTableHeaderCell>{t('adminNew.stalling.columns.type')}</AdminTableHeaderCell>
                  <AdminTableHeaderCell>{t('adminNew.stalling.columns.paidUntil')}</AdminTableHeaderCell>
                  <AdminTableHeaderCell>{t('adminNew.stalling.columns.openBalance')}</AdminTableHeaderCell>
                  <AdminTableHeaderCell>{t('adminNew.stalling.columns.location')}</AdminTableHeaderCell>
                  <AdminTableHeaderCell>{t('adminNew.stalling.columns.status')}</AdminTableHeaderCell>
                  <AdminTableHeaderCell className="text-right">&nbsp;</AdminTableHeaderCell>
                </tr>
              </AdminTableHead>
              <tbody>
                {rows.map((contract) => (
                  <AdminTableRow key={contract.id}>
                    <AdminTableCell>
                      <div className="font-semibold text-navy-900">{contract.boat?.name ?? '—'}</div>
                      <div className="text-xs text-navy-500">
                        {contract.boat?.length_cm ? `${contract.boat.length_cm} cm` : '—'}
                      </div>
                    </AdminTableCell>
                    <AdminTableCell>
                      <div className="font-medium text-navy-900">{contract.customer?.name ?? '—'}</div>
                      {contract.customer?.id ? (
                        <Link
                          href={`/${locale}/admin/klanten/${contract.customer.id}`}
                          className="text-xs font-semibold text-marine-700 hover:text-marine-900"
                        >
                          {t('adminNew.stalling.openCustomer')}
                        </Link>
                      ) : null}
                    </AdminTableCell>
                    <AdminTableCell className="whitespace-nowrap">
                      {formatDate(contract.start_date, dateLocale)} – {formatDate(contract.end_date, dateLocale)}
                    </AdminTableCell>
                    <AdminTableCell className="capitalize">{contract.type}</AdminTableCell>
                    <AdminTableCell>{formatDate(contract.paid_until, dateLocale)}</AdminTableCell>
                    <AdminTableCell className="font-semibold text-navy-900">
                      {formatCurrency(contract.open_balance_cents / 100, dateLocale)}
                    </AdminTableCell>
                    <AdminTableCell>
                      {contract.boat?.location_code ? (
                        <span className="inline-flex items-center gap-1 text-sm text-navy-700">
                          <MapPin className="h-3.5 w-3.5 text-navy-400" />
                          {contract.boat.location_code}
                        </span>
                      ) : (
                        <span className="text-xs text-navy-400">
                          {t('adminNew.stalling.quickEdit.locationEmpty')}
                        </span>
                      )}
                    </AdminTableCell>
                    <AdminTableCell>
                      <button
                        type="button"
                        onClick={() => openEdit(contract)}
                        aria-label={t('adminNew.stalling.quickEdit.editAria')}
                        className="inline-flex items-center gap-1.5 rounded-full transition hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-marine-400"
                      >
                        <PaymentStatusBadge status={contract.payment_status} />
                        <Pencil className="h-3 w-3 text-navy-400" />
                      </button>
                    </AdminTableCell>
                    <AdminTableCell>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          leftIcon={<FilePlus2 className="h-3.5 w-3.5" />}
                          disabled={createInvoice.loading || cancelContract.loading}
                          onClick={() => setInvoiceTarget(contract.id)}
                        >
                          {t('adminNew.stalling.invoice')}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          leftIcon={<XCircle className="h-3.5 w-3.5" />}
                          disabled={createInvoice.loading || cancelContract.loading}
                          onClick={() => setCancelTarget(contract.id)}
                        >
                          {t('adminNew.stalling.cancel')}
                        </Button>
                      </div>
                    </AdminTableCell>
                  </AdminTableRow>
                ))}
              </tbody>
            </AdminTable>
          ) : null}
        </AdminTableCard>
        </AdminSectionCard>

        <AdminSectionCard
          title={t('adminNew.stalling.auditTitle')}
          description={t('adminNew.stalling.auditSubtitle')}
          icon={ShieldCheck}
          className="mt-5"
        >
          {auditLogs.loading ? <LoadingState label={t('adminNew.common.loading')} variant="table" /> : null}
          {!auditLogs.loading && (auditLogs.data?.data ?? []).length === 0 ? (
            <EmptyState title={t('adminNew.stalling.auditEmpty')} message={t('adminNew.stalling.auditEmptyMessage')} />
          ) : null}
          {!auditLogs.loading && (auditLogs.data?.data ?? []).length > 0 ? (
            <AdminTable minWidth={700}>
              <AdminTableHead>
                <tr>
                  <AdminTableHeaderCell>{t('adminNew.audit.columns.time')}</AdminTableHeaderCell>
                  <AdminTableHeaderCell>{t('adminNew.audit.columns.actor')}</AdminTableHeaderCell>
                  <AdminTableHeaderCell>{t('adminNew.audit.columns.action')}</AdminTableHeaderCell>
                </tr>
              </AdminTableHead>
              <tbody>
                {(auditLogs.data?.data ?? []).map((log) => (
                  <AdminTableRow key={log.id}>
                    <AdminTableCell className="whitespace-nowrap text-sm">
                      {formatDate(log.created_at, dateLocale)}
                    </AdminTableCell>
                    <AdminTableCell>{log.user?.name ?? '—'}</AdminTableCell>
                    <AdminTableCell>
                      <Badge tone="neutral">{log.action}</Badge>
                    </AdminTableCell>
                  </AdminTableRow>
                ))}
              </tbody>
            </AdminTable>
          ) : null}
        </AdminSectionCard>
      </AdminContent>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} size="md">
        <form onSubmit={onCreate}>
          <AdminModalHeader title={t('adminNew.stalling.new')} subtitle={t('adminNew.stalling.createSubtitle')} />
          <AdminModalBody>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-navy-800">{t('adminNew.stalling.columns.boat')}</label>
              <div className="flex gap-2">
                <select className="input-base w-full" value={createForm.boat_id} onChange={(e) => setCreateForm({ ...createForm, boat_id: e.target.value })} required>
                  <option value="">{t('adminNew.boats.selectCustomer')}</option>
                  {(boats.data?.data ?? []).map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
                <Button type="button" variant="ghost" size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setShowNewBoat(true)}>
                  {t('adminNew.stalling.fields.newBoat')}
                </Button>
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-navy-800">{t('adminNew.stalling.columns.customer')}</label>
              <div className="flex gap-2">
                <select className="input-base w-full" value={createForm.customer_id} onChange={(e) => setCreateForm({ ...createForm, customer_id: e.target.value })}>
                  <option value="">{t('adminNew.kassa.selectCustomer')}</option>
                  {(customers.data?.data ?? []).map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <Button type="button" variant="ghost" size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setShowNewCustomer(true)}>
                  {t('adminNew.stalling.fields.newCustomer')}
                </Button>
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-navy-800">{t('adminNew.stalling.columns.type')}</label>
              <select
                className="input-base w-full"
                value={createForm.type}
                onChange={(e) => {
                  const nextType = e.target.value;
                  const { start, end } = applyTypeDefaults(nextType);
                  setCreateForm((f) => ({
                    ...f,
                    type: nextType,
                    // Only prefill empty fields so a manual override is never clobbered.
                    start_date: f.start_date || start,
                    end_date: f.end_date || end,
                  }));
                }}
              >
                <option value="winter">{t('adminNew.stalling.type.winter')}</option>
                <option value="summer">{t('adminNew.stalling.type.summer')}</option>
                <option value="year">{t('adminNew.stalling.type.year')}</option>
                <option value="week">{t('adminNew.stalling.type.week')}</option>
              </select>
            </div>
            <Input label={t('adminNew.stalling.fields.startDate')} type="date" value={createForm.start_date} onChange={(e) => setCreateForm({ ...createForm, start_date: e.target.value })} required />
            <Input label={t('adminNew.stalling.fields.endDate')} type="date" value={createForm.end_date} onChange={(e) => setCreateForm({ ...createForm, end_date: e.target.value })} required />
            <Input label={t('adminNew.stalling.columns.paidUntil')} type="date" value={createForm.paid_until} onChange={(e) => setCreateForm({ ...createForm, paid_until: e.target.value })} />
            <Input
              label={t('adminNew.stalling.fields.location')}
              value={createForm.location}
              onChange={(e) => setCreateForm({ ...createForm, location: e.target.value })}
              placeholder={t('adminNew.stalling.quickEdit.locationPlaceholder')}
              leftIcon={<MapPin className="h-4 w-4" />}
            />
            <div>
              <label className="mb-1.5 block text-sm font-medium text-navy-800">{t('adminNew.stalling.fields.paymentRoute')}</label>
              <select className="input-base w-full" value={createForm.payment_route} onChange={(e) => setCreateForm({ ...createForm, payment_route: e.target.value })}>
                <option value="email">{t('adminNew.stalling.fields.payByEmail')}</option>
                <option value="kassa">{t('adminNew.stalling.fields.payAtKassa')}</option>
              </select>
            </div>
            <Input
              label={t('adminNew.stalling.fields.depositPct')}
              type="number"
              min={0}
              max={100}
              value={createForm.deposit_pct}
              onChange={(e) => setCreateForm({ ...createForm, deposit_pct: e.target.value })}
              placeholder="0"
            />
            <label className="flex items-center gap-2 text-sm font-medium text-navy-800">
              <input
                type="checkbox"
                checked={createForm.send_contract_email}
                onChange={(e) => setCreateForm({ ...createForm, send_contract_email: e.target.checked })}
                className="h-4 w-4 rounded border-navy-300"
              />
              {t('adminNew.stalling.fields.sendContractEmail')}
            </label>

            {/* Trello #107: brokerage (makelaardij) toggle + live preview */}
            <div className="rounded-xl border border-navy-100 bg-sand-50/40 p-3">
              <label className="flex items-center gap-2 text-sm font-medium text-navy-800">
                <input
                  type="checkbox"
                  checked={brokerage}
                  onChange={(e) => setBrokerage(e.target.checked)}
                  className="h-4 w-4 rounded border-navy-300"
                />
                {t('adminNew.stalling.brokerage.toggle')}
              </label>
              {brokerage ? (
                <div className="mt-2 text-sm">
                  <Input
                    label={t('adminNew.stalling.brokerage.startDate')}
                    type="date"
                    value={brokerageStart}
                    onChange={(e) => setBrokerageStart(e.target.value)}
                  />
                  <div className="mt-2">
                  {!selectedBoatLength ? (
                    <p className="text-xs text-navy-500">{t('adminNew.stalling.brokerage.needLength')}</p>
                  ) : brokeragePreview ? (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-navy-500">{t('adminNew.stalling.brokerage.freeUntil')}</span>
                        <span className="font-semibold text-emerald-700">
                          {brokeragePreview.brokerage_free_until
                            ? formatDate(brokeragePreview.brokerage_free_until, dateLocale)
                            : `${brokeragePreview.free_months ?? 6} ${t('adminNew.stalling.brokerage.months')}`}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-navy-500">{t('adminNew.stalling.brokerage.monthlyFee')}</span>
                        <span className="font-semibold text-navy-900">
                          {formatCurrency(
                            brokeragePreview.monthly_fee_euros ??
                              (brokeragePreview.monthly_fee ?? 0) / 100,
                            dateLocale
                          )}
                        </span>
                      </div>
                      {brokeragePreview.tariff?.range_label ? (
                        <div className="text-xs text-navy-400">{brokeragePreview.tariff.range_label}</div>
                      ) : null}
                    </div>
                  ) : (
                    <p className="text-xs text-navy-400">{t('adminNew.common.loading')}</p>
                  )}
                  </div>
                </div>
              ) : null}
            </div>
          </AdminModalBody>
          <AdminModalFooter>
            <Button type="button" variant="ghost" onClick={() => setShowCreate(false)}>{t('adminNew.common.cancel')}</Button>
            <Button type="submit" variant="gold" disabled={createContract.loading}>{t('adminNew.common.save')}</Button>
          </AdminModalFooter>
        </form>
      </Modal>

      {/* Trello #107: inline new-boat modal */}
      <Modal open={showNewBoat} onClose={() => setShowNewBoat(false)} size="sm">
        <form onSubmit={onCreateBoat}>
          <AdminModalHeader title={t('adminNew.stalling.fields.newBoat')} />
          <AdminModalBody>
            <Input label={t('adminNew.stalling.fields.boatName')} value={newBoat.name} onChange={(e) => setNewBoat({ ...newBoat, name: e.target.value })} required leftIcon={<Ship className="h-4 w-4" />} />
            <Input label={t('adminNew.stalling.fields.lengthCm')} type="number" min={0} value={newBoat.length_cm} onChange={(e) => setNewBoat({ ...newBoat, length_cm: e.target.value })} />
            <Input label={t('adminNew.stalling.fields.boatType')} value={newBoat.boat_type} onChange={(e) => setNewBoat({ ...newBoat, boat_type: e.target.value })} />
          </AdminModalBody>
          <AdminModalFooter>
            <Button type="button" variant="ghost" onClick={() => setShowNewBoat(false)}>{t('adminNew.common.cancel')}</Button>
            <Button type="submit" variant="gold" disabled={createBoat.loading}>{t('adminNew.common.save')}</Button>
          </AdminModalFooter>
        </form>
      </Modal>

      {/* Trello #107: inline new-customer modal */}
      <Modal open={showNewCustomer} onClose={() => setShowNewCustomer(false)} size="sm">
        <form onSubmit={onCreateCustomer}>
          <AdminModalHeader title={t('adminNew.stalling.fields.newCustomer')} />
          <AdminModalBody>
            <Input label={t('adminNew.stalling.fields.customerName')} value={newCustomer.name} onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })} required />
            <Input label={t('adminNew.stalling.fields.customerEmail')} type="email" value={newCustomer.email} onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })} />
            <Input label={t('adminNew.stalling.fields.customerPhone')} value={newCustomer.phone} onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })} />
          </AdminModalBody>
          <AdminModalFooter>
            <Button type="button" variant="ghost" onClick={() => setShowNewCustomer(false)}>{t('adminNew.common.cancel')}</Button>
            <Button type="submit" variant="gold" disabled={createCustomer.loading}>{t('adminNew.common.save')}</Button>
          </AdminModalFooter>
        </form>
      </Modal>

      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} size="sm">
        <form onSubmit={onSaveEdit}>
          <AdminModalHeader
            title={t('adminNew.stalling.quickEdit.title')}
            subtitle={
              editTarget?.boat?.name
                ? `${editTarget.boat.name} · ${t('adminNew.stalling.quickEdit.subtitle')}`
                : t('adminNew.stalling.quickEdit.subtitle')
            }
          />
          <AdminModalBody>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-navy-800">
                {t('adminNew.stalling.quickEdit.statusLabel')}
              </label>
              <select
                className="input-base w-full"
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value)}
              >
                <option value="paid">{t('adminNew.status.paid')}</option>
                <option value="expiring">{t('adminNew.status.expiring')}</option>
                <option value="overdue">{t('adminNew.status.overdue')}</option>
                <option value="open">{t('adminNew.status.open')}</option>
                <option value="cancelled">{t('adminNew.status.cancelled')}</option>
              </select>
            </div>
            <Input
              label={t('adminNew.stalling.quickEdit.locationLabel')}
              value={editLocation}
              onChange={(e) => setEditLocation(e.target.value)}
              placeholder={t('adminNew.stalling.quickEdit.locationPlaceholder')}
              leftIcon={<MapPin className="h-4 w-4" />}
            />
          </AdminModalBody>
          <AdminModalFooter>
            <Button type="button" variant="ghost" onClick={() => setEditTarget(null)}>
              {t('adminNew.common.cancel')}
            </Button>
            <Button type="submit" variant="gold" disabled={setStatusM.loading || setLocationM.loading}>
              {t('adminNew.common.save')}
            </Button>
          </AdminModalFooter>
        </form>
      </Modal>

      <AdminConfirmModal
        open={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={async () => {
          if (!cancelTarget) return;
          await execute(t('adminNew.stalling.cancelled'), () => cancelContract.mutate(cancelTarget));
          setCancelTarget(null);
        }}
        title={t('adminNew.stalling.cancel')}
        message={t('adminNew.stalling.confirmCancel')}
        confirmLabel={t('adminNew.stalling.cancel')}
        cancelLabel={t('adminNew.common.cancel')}
        variant="danger"
        icon={XCircle}
        loading={cancelContract.loading}
      />

      <AdminConfirmModal
        open={!!invoiceTarget}
        onClose={() => setInvoiceTarget(null)}
        onConfirm={async () => {
          if (!invoiceTarget) return;
          await execute(
            t('adminNew.stalling.invoiceCreated'),
            () => createInvoice.mutate(invoiceTarget),
            true
          );
          setInvoiceTarget(null);
        }}
        title={t('adminNew.stalling.invoice')}
        message={t('adminNew.stalling.confirmCreateInvoice')}
        confirmLabel={t('adminNew.stalling.invoice')}
        cancelLabel={t('adminNew.common.cancel')}
        variant="primary"
        icon={FilePlus2}
        loading={createInvoice.loading}
      />
    </>
  );
}

