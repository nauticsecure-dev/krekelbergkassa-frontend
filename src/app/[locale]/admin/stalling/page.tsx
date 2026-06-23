'use client';

import * as React from 'react';
import Link from 'next/link';
import { Eye, FilePlus2, MapPin, Pencil, Plus, Receipt, Ship, ShieldCheck, Warehouse, XCircle } from 'lucide-react';
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
  const [editLifecycle, setEditLifecycle] = React.useState('');
  const [editLocation, setEditLocation] = React.useState('');
  const [editNote, setEditNote] = React.useState('');
  // Trello #73: dedicated full-edit modal (separate from the quick status edit).
  const [editFullTarget, setEditFullTarget] = React.useState<StallingContract | null>(null);
  const [editForm, setEditForm] = React.useState({
    customer_id: '',
    boat_id: '',
    type: '',
    start_date: '',
    end_date: '',
    paid_until: '',
    billing_type: '',
    bok_number: '',
    notes: '',
    change_note: '',
  });
  // Trello #73: click-to-edit cells for paid_until / bok_number.
  const [inlineEdit, setInlineEdit] = React.useState<{ id: string; field: 'paid_until' | 'bok_number'; value: string } | null>(null);
  const [showCreate, setShowCreate] = React.useState(false);
  const [createForm, setCreateForm] = React.useState({
    boat_id: '',
    customer_id: '',
    type: 'winter',
    start_date: '',
    end_date: '',
    paid_until: '',
    location: '',
    bok_number: '',
    payment_route: 'email',
    send_contract_email: true,
    deposit_pct: '',
    price_total_euros: '',
    notes: '',
  });
  // Trello #107: live price preview for the chosen contract type + boat.
  const [pricePreview, setPricePreview] = React.useState<{ total_incl_vat: number; range_label?: string } | null>(null);
  // Trello #107: inline "+ new boat / + new customer" so staff don't have to
  // leave the contract modal. Both call the existing create endpoints, refetch
  // the option lists, and auto-select the freshly created record.
  const [showNewBoat, setShowNewBoat] = React.useState(false);
  const [showNewCustomer, setShowNewCustomer] = React.useState(false);
  const [newBoat, setNewBoat] = React.useState({ name: '', length_cm: '', boat_type: '', width_cm: '', draft_cm: '', build_year: '', registration_number: '' });
  const [newCustomer, setNewCustomer] = React.useState({ name: '', email: '', phone: '', street: '', house_number: '', postal_code: '', city: '', company_name: '' });
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

  // Trello #107: live price preview from the catalog product matching the type.
  const TYPE_PRODUCT_CODE: Record<string, string> = {
    winter: 'STALL-WINTER',
    summer: 'STALL-SUMMER',
    year: 'STALL-SUMMER',
    week: 'KRANEN',
  };
  React.useEffect(() => {
    const code = TYPE_PRODUCT_CODE[createForm.type];
    if (!code || !createForm.boat_id) {
      setPricePreview(null);
      return;
    }
    let cancelled = false;
    void pricingService
      .previewProduct({ product_code: code, entity_id: createForm.boat_id, entity_type: 'boat' })
      .then((res) => {
        if (cancelled) return;
        const total = Number(res.total_incl_vat ?? res.price_incl_vat ?? 0);
        setPricePreview(total > 0 ? { total_incl_vat: total, range_label: typeof res.range_label === 'string' ? res.range_label : undefined } : null);
      })
      .catch(() => {
        if (!cancelled) setPricePreview(null);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createForm.type, createForm.boat_id]);

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
        width_cm: newBoat.width_cm ? Number(newBoat.width_cm) : undefined,
        draft_cm: newBoat.draft_cm ? Number(newBoat.draft_cm) : undefined,
        build_year: newBoat.build_year ? Number(newBoat.build_year) : undefined,
        registration_number: newBoat.registration_number || undefined,
        customer_id: createForm.customer_id || undefined,
      });
      await boats.refetch();
      if (created?.id) setCreateForm((f) => ({ ...f, boat_id: created.id }));
      setShowNewBoat(false);
      setNewBoat({ name: '', length_cm: '', boat_type: '', width_cm: '', draft_cm: '', build_year: '', registration_number: '' });
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
        company_name: newCustomer.company_name || undefined,
        address:
          newCustomer.street || newCustomer.city
            ? {
                street: newCustomer.street || undefined,
                house_number: newCustomer.house_number || undefined,
                postal_code: newCustomer.postal_code || undefined,
                city: newCustomer.city || undefined,
                country: 'NL',
              }
            : undefined,
      });
      await customers.refetch();
      if (created?.id) setCreateForm((f) => ({ ...f, customer_id: created.id }));
      setShowNewCustomer(false);
      setNewCustomer({ name: '', email: '', phone: '', street: '', house_number: '', postal_code: '', city: '', company_name: '' });
      push({ tone: 'success', title: t('adminNew.customers.toasts.created') });
    } catch (err) {
      push({ tone: 'error', title: t('adminNew.common.operationFailed'), message: getApiErrorMessage(err) });
    }
  };

  const createContract = useMutation(stallingService.create);
  const createInvoice = useMutation((id: string) => stallingService.generateInvoice(id));
  const cancelContract = useMutation((id: string) => stallingService.cancel(id, 'Cancelled by staff'));
  const setLocationM = useMutation((p: { id: string; location: string }) =>
    stallingService.setLocation(p.id, p.location || null)
  );
  const setLifecycleM = useMutation((p: { id: string; status: string; note?: string }) =>
    stallingService.setLifecycle(p.id, p.status, p.note)
  );
  const updateContract = useMutation((p: { id: string; payload: Record<string, unknown> }) =>
    stallingService.update(p.id, p.payload)
  );

  // Trello #73: quick-edit now changes ONLY the lifecycle status (payment status
  // is computed and cannot be set) and records an optional change note.
  const openEdit = (contract: StallingContract) => {
    setEditTarget(contract);
    setEditLifecycle(contract.status ?? 'active');
    setEditLocation(contract.boat?.location_code ?? contract.location_code ?? '');
    setEditNote('');
  };

  // Trello #73: full edit modal — change customer/boat/period/billing/notes.
  const openFullEdit = (contract: StallingContract) => {
    setEditFullTarget(contract);
    setEditForm({
      customer_id: contract.customer?.id ?? '',
      boat_id: contract.boat?.id ?? '',
      type: contract.type ?? '',
      start_date: contract.start_date ?? '',
      end_date: contract.end_date ?? '',
      paid_until: contract.paid_until ?? '',
      billing_type: contract.billing_type ?? '',
      bok_number: contract.bok_number ?? '',
      notes: contract.notes ?? '',
      change_note: '',
    });
  };

  const onSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    const id = editTarget.id;
    try {
      if (editLifecycle && editLifecycle !== (editTarget.status ?? '')) {
        await setLifecycleM.mutate({ id, status: editLifecycle, note: editNote });
        push({ tone: 'success', title: t('adminNew.stalling.toasts.statusUpdated') });
      }
      if (editLocation !== (editTarget.boat?.location_code ?? editTarget.location_code ?? '')) {
        await setLocationM.mutate({ id, location: editLocation });
        push({ tone: 'success', title: t('adminNew.stalling.toasts.locationUpdated') });
      }
      setEditTarget(null);
      await contracts.refetch();
    } catch (err) {
      push({ tone: 'error', title: t('adminNew.common.operationFailed'), message: getApiErrorMessage(err) });
    }
  };

  const onSaveFullEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editFullTarget) return;
    try {
      await updateContract.mutate({
        id: editFullTarget.id,
        payload: {
          customer_id: editForm.customer_id || undefined,
          boat_id: editForm.boat_id || undefined,
          type: editForm.type || undefined,
          start_date: editForm.start_date || undefined,
          end_date: editForm.end_date || undefined,
          paid_until: editForm.paid_until || null,
          billing_type: editForm.billing_type || undefined,
          bok_number: editForm.bok_number || null,
          notes: editForm.notes || null,
          change_note: editForm.change_note || undefined,
        },
      });
      setEditFullTarget(null);
      await contracts.refetch();
      push({ tone: 'success', title: t('adminNew.stalling.toasts.contractUpdated') });
    } catch (err) {
      push({ tone: 'error', title: t('adminNew.common.operationFailed'), message: getApiErrorMessage(err) });
    }
  };

  // Trello #73: click-to-edit a single cell (paid_until / bok_number) inline.
  const saveInline = async () => {
    if (!inlineEdit) return;
    try {
      await updateContract.mutate({ id: inlineEdit.id, payload: { [inlineEdit.field]: inlineEdit.value || null } });
      setInlineEdit(null);
      await contracts.refetch();
      push({ tone: 'success', title: t('adminNew.stalling.toasts.contractUpdated') });
    } catch (err) {
      push({ tone: 'error', title: t('adminNew.common.operationFailed'), message: getApiErrorMessage(err) });
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
      const created = await createContract.mutate({
        boat_id: createForm.boat_id,
        customer_id: createForm.customer_id || undefined,
        type: createForm.type,
        start_date: createForm.start_date,
        end_date: createForm.end_date,
        paid_until: createForm.paid_until || undefined,
        location: createForm.location || undefined,
        bok_number: createForm.bok_number || undefined,
        payment_route: createForm.payment_route || undefined,
        send_contract_email: createForm.send_contract_email,
        deposit_pct: createForm.deposit_pct ? Number(createForm.deposit_pct) : undefined,
        deposit_percentage: createForm.deposit_pct ? Number(createForm.deposit_pct) : undefined,
        price_total: createForm.price_total_euros
          ? Math.round(parseFloat(createForm.price_total_euros) * 100)
          : undefined,
        notes: createForm.notes || undefined,
      });
      // Trello #107: after create, follow the chosen payment route.
      const newId = (created as { id?: string } | null)?.id;
      if (newId && createForm.payment_route === 'email') {
        try {
          await stallingService.generateDepositInvoice(newId);
          push({ tone: 'success', title: t('adminNew.stalling.toasts.depositInvoiceSent') });
        } catch {
          /* deposit automation is best-effort; contract is already created */
        }
      } else if (newId && createForm.payment_route === 'kassa') {
        try {
          const pre = await stallingService.kassaPrefill(newId);
          const qs = new URLSearchParams();
          if (pre.contract_id) qs.set('contract_id', String(pre.contract_id));
          if (pre.customer_id) qs.set('customer_id', String(pre.customer_id));
          if (pre.prefill_amount != null) qs.set('prefill_amount', String(pre.prefill_amount));
          if (pre.invoice_id) qs.set('invoice_id', String(pre.invoice_id));
          if (pre.description) qs.set('description', String(pre.description));
          window.open(`/${locale}/admin/kassa?${qs.toString()}`, '_blank');
          push({ tone: 'success', title: t('adminNew.stalling.toasts.kassaOpened') });
        } catch {
          /* best-effort */
        }
      }
      setShowCreate(false);
      setCreateForm({
        boat_id: '',
        customer_id: '',
        type: 'winter',
        start_date: '',
        end_date: '',
        paid_until: '',
        location: '',
        bok_number: '',
        payment_route: 'email',
        send_contract_email: true,
        deposit_pct: '',
        price_total_euros: '',
        notes: '',
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
              <optgroup label={t('adminNew.stalling.filterPaymentGroup')}>
                <option value="paid">{t('adminNew.status.paid')}</option>
                <option value="expiring">{t('adminNew.status.expiring')}</option>
                <option value="overdue">{t('adminNew.status.overdue')}</option>
                <option value="open">{t('adminNew.status.open')}</option>
              </optgroup>
              <optgroup label={t('adminNew.stalling.filterLifecycleGroup')}>
                <option value="active">{t('adminNew.stalling.lifecycle.active')}</option>
                <option value="draft">{t('adminNew.stalling.lifecycle.draft')}</option>
                <option value="ended">{t('adminNew.stalling.lifecycle.ended')}</option>
                <option value="checked_out">{t('adminNew.stalling.lifecycle.checkedOut')}</option>
                <option value="cancelled">{t('adminNew.status.cancelled')}</option>
              </optgroup>
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
                    <AdminTableCell>
                      {inlineEdit?.id === contract.id && inlineEdit.field === 'paid_until' ? (
                        <span className="flex items-center gap-1">
                          <input
                            type="date"
                            autoFocus
                            value={inlineEdit.value}
                            onChange={(e) => setInlineEdit({ ...inlineEdit, value: e.target.value })}
                            onKeyDown={(e) => { if (e.key === 'Enter') void saveInline(); if (e.key === 'Escape') setInlineEdit(null); }}
                            className="input-base h-8 w-36 px-2 py-1 text-xs"
                          />
                          <Button size="sm" variant="gold" onClick={() => void saveInline()} disabled={updateContract.loading}>
                            {t('adminNew.stalling.inline.save')}
                          </Button>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setInlineEdit({ id: contract.id, field: 'paid_until', value: contract.paid_until ?? '' })}
                          title={t('adminNew.stalling.inline.editPaidUntil')}
                          className="rounded px-1 text-left hover:bg-sand-50 hover:underline"
                        >
                          {formatDate(contract.paid_until, dateLocale)}
                        </button>
                      )}
                    </AdminTableCell>
                    <AdminTableCell className="font-semibold text-navy-900">
                      {formatCurrency(contract.open_balance_cents / 100, dateLocale)}
                    </AdminTableCell>
                    <AdminTableCell>
                      <div className="flex flex-col gap-0.5">
                        {contract.boat?.location_code ?? contract.location_code ? (
                          <span className="inline-flex items-center gap-1 text-sm text-navy-700">
                            <MapPin className="h-3.5 w-3.5 text-navy-400" />
                            {contract.boat?.location_code ?? contract.location_code}
                          </span>
                        ) : (
                          <span className="text-xs text-navy-400">
                            {t('adminNew.stalling.quickEdit.locationEmpty')}
                          </span>
                        )}
                        {inlineEdit?.id === contract.id && inlineEdit.field === 'bok_number' ? (
                          <span className="flex items-center gap-1">
                            <input
                              autoFocus
                              value={inlineEdit.value}
                              onChange={(e) => setInlineEdit({ ...inlineEdit, value: e.target.value })}
                              onKeyDown={(e) => { if (e.key === 'Enter') void saveInline(); if (e.key === 'Escape') setInlineEdit(null); }}
                              className="input-base h-7 w-24 px-2 py-1 text-xs"
                              placeholder={t('adminNew.stalling.columns.bok')}
                            />
                            <Button size="sm" variant="gold" onClick={() => void saveInline()} disabled={updateContract.loading}>
                              {t('adminNew.stalling.inline.save')}
                            </Button>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setInlineEdit({ id: contract.id, field: 'bok_number', value: contract.bok_number ?? '' })}
                            title={t('adminNew.stalling.inline.editBok')}
                            className="text-left text-[11px] text-navy-500 hover:text-marine-700 hover:underline"
                          >
                            {t('adminNew.stalling.columns.bok')}: {contract.bok_number || '—'}
                          </button>
                        )}
                      </div>
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
                      <div className="flex flex-wrap justify-end gap-2">
                        <Link href={`/${locale}/admin/stalling/${contract.id}`}>
                          <Button
                            variant="outline"
                            size="sm"
                            leftIcon={<Eye className="h-3.5 w-3.5" />}
                          >
                            {t('adminNew.common.open')}
                          </Button>
                        </Link>
                        <Button
                          variant="outline"
                          size="sm"
                          leftIcon={<Pencil className="h-3.5 w-3.5" />}
                          onClick={() => openFullEdit(contract)}
                        >
                          {t('adminNew.stalling.editContract')}
                        </Button>
                        {/* Trello #107: deep link to the deposit (10%) invoice when present. */}
                        {contract.deposit_invoice_id ? (
                          <Link href={`/${locale}/admin/facturen/${contract.deposit_invoice_id}`}>
                            <Button variant="ghost" size="sm" leftIcon={<Receipt className="h-3.5 w-3.5" />}>
                              {t('adminNew.stalling.invoiceLabels.deposit')}
                            </Button>
                          </Link>
                        ) : null}
                        <Button
                          variant="outline"
                          size="sm"
                          leftIcon={<FilePlus2 className="h-3.5 w-3.5" />}
                          disabled={createInvoice.loading || cancelContract.loading}
                          onClick={() => setInvoiceTarget(contract.id)}
                        >
                          {contract.deposit_invoice_id
                            ? t('adminNew.stalling.invoiceLabels.final')
                            : t('adminNew.stalling.invoice')}
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
                  <AdminTableHeaderCell>{t('adminNew.audit.columns.changes')}</AdminTableHeaderCell>
                </tr>
              </AdminTableHead>
              <tbody>
                {(auditLogs.data?.data ?? []).map((log) => {
                  const changes =
                    ((log as unknown as { changes?: Array<{ field_name?: string; old_value?: unknown; new_value?: unknown }> }).changes) ?? [];
                  return (
                  <AdminTableRow key={log.id}>
                    <AdminTableCell className="whitespace-nowrap text-sm">
                      {formatDate(log.created_at, dateLocale)}
                    </AdminTableCell>
                    <AdminTableCell>{log.user?.name ?? '—'}</AdminTableCell>
                    <AdminTableCell>
                      <Badge tone="neutral">{log.action}</Badge>
                    </AdminTableCell>
                    <AdminTableCell>
                      {changes.length === 0 ? (
                        <span className="text-xs text-navy-400">—</span>
                      ) : (
                        <div className="space-y-0.5">
                          {changes.map((c, j) => (
                            <div key={j} className="text-xs text-navy-600">
                              <span className="font-medium text-navy-700">{c.field_name}</span>:{' '}
                              <span className="text-rose-600">{String(c.old_value ?? '—')}</span> →{' '}
                              <span className="text-emerald-700">{String(c.new_value ?? '—')}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </AdminTableCell>
                  </AdminTableRow>
                  );
                })}
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
            {/* Trello #107: live price preview for the selected type + boat. */}
            {pricePreview ? (
              <div className="rounded-lg bg-sand-50 p-3 text-sm">
                <span className="font-medium text-navy-900">
                  {t(`adminNew.stalling.type.${createForm.type}`)}: {formatCurrency(pricePreview.total_incl_vat / 100, dateLocale)}
                </span>
                {createForm.deposit_pct ? (
                  <span className="ml-3 text-navy-500">
                    {t('adminNew.stalling.pricePreview.deposit')} {createForm.deposit_pct}%:{' '}
                    {formatCurrency((pricePreview.total_incl_vat * Number(createForm.deposit_pct)) / 10000, dateLocale)}
                  </span>
                ) : null}
                {pricePreview.range_label ? (
                  <span className="ml-3 text-xs text-navy-400">{pricePreview.range_label}</span>
                ) : null}
              </div>
            ) : null}
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
            <Input
              label={t('adminNew.stalling.fields.bokNumber')}
              value={createForm.bok_number}
              onChange={(e) => setCreateForm({ ...createForm, bok_number: e.target.value })}
              placeholder={t('adminNew.stalling.fields.bokNumberPlaceholder')}
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
            <Input
              label={t('adminNew.stalling.fields.priceTotal')}
              type="number"
              step="0.01"
              min={0}
              value={createForm.price_total_euros}
              onChange={(e) => setCreateForm({ ...createForm, price_total_euros: e.target.value })}
              placeholder="0,00"
            />
            <div>
              <label className="mb-1.5 block text-sm font-medium text-navy-800">{t('adminNew.stalling.fields.notes')}</label>
              <textarea
                className="input-base w-full"
                rows={2}
                value={createForm.notes}
                onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
              />
            </div>
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
            <div className="grid grid-cols-2 gap-2">
              <Input label={t('adminNew.stalling.fields.lengthCm')} type="number" min={0} value={newBoat.length_cm} onChange={(e) => setNewBoat({ ...newBoat, length_cm: e.target.value })} />
              <Input label={t('adminNew.stalling.fields.widthCm')} type="number" min={0} value={newBoat.width_cm} onChange={(e) => setNewBoat({ ...newBoat, width_cm: e.target.value })} />
              <Input label={t('adminNew.stalling.fields.draftCm')} type="number" min={0} value={newBoat.draft_cm} onChange={(e) => setNewBoat({ ...newBoat, draft_cm: e.target.value })} />
              <Input label={t('adminNew.stalling.fields.buildYear')} type="number" value={newBoat.build_year} onChange={(e) => setNewBoat({ ...newBoat, build_year: e.target.value })} />
            </div>
            <Input label={t('adminNew.stalling.fields.boatType')} value={newBoat.boat_type} onChange={(e) => setNewBoat({ ...newBoat, boat_type: e.target.value })} />
            <Input label={t('adminNew.stalling.fields.registration')} value={newBoat.registration_number} onChange={(e) => setNewBoat({ ...newBoat, registration_number: e.target.value })} />
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
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <Input label={t('adminNew.stalling.fields.street')} value={newCustomer.street} onChange={(e) => setNewCustomer({ ...newCustomer, street: e.target.value })} />
              </div>
              <Input label={t('adminNew.stalling.fields.houseNumber')} value={newCustomer.house_number} onChange={(e) => setNewCustomer({ ...newCustomer, house_number: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input label={t('adminNew.stalling.fields.postalCode')} value={newCustomer.postal_code} onChange={(e) => setNewCustomer({ ...newCustomer, postal_code: e.target.value })} />
              <Input label={t('adminNew.stalling.fields.city')} value={newCustomer.city} onChange={(e) => setNewCustomer({ ...newCustomer, city: e.target.value })} />
            </div>
            <Input label={t('adminNew.stalling.fields.companyName')} value={newCustomer.company_name} onChange={(e) => setNewCustomer({ ...newCustomer, company_name: e.target.value })} />
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
            {/* Trello #73: current (computed) payment status is shown read-only —
                only the lifecycle status can actually be set. */}
            {editTarget ? (
              <div className="flex items-center gap-2 rounded-lg bg-sand-50 px-3 py-2 text-sm">
                <span className="text-navy-500">{t('adminNew.stalling.quickEdit.statusLabel')}:</span>
                <PaymentStatusBadge status={editTarget.payment_status} />
              </div>
            ) : null}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-navy-800">
                {t('adminNew.stalling.quickEdit.lifecycleLabel')}
              </label>
              <select
                className="input-base w-full"
                value={editLifecycle}
                onChange={(e) => setEditLifecycle(e.target.value)}
              >
                <option value="active">{t('adminNew.stalling.lifecycle.active')}</option>
                <option value="ended">{t('adminNew.stalling.lifecycle.ended')}</option>
                <option value="checked_out">{t('adminNew.stalling.lifecycle.checkedOut')}</option>
                <option value="cancelled">{t('adminNew.stalling.lifecycle.cancelled')}</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-navy-800">
                {t('adminNew.stalling.quickEdit.noteLabel')}
              </label>
              <textarea
                className="input-base w-full"
                rows={2}
                value={editNote}
                onChange={(e) => setEditNote(e.target.value)}
                placeholder={t('adminNew.stalling.quickEdit.notePlaceholder')}
              />
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
            <Button type="submit" variant="gold" disabled={setLifecycleM.loading || setLocationM.loading}>
              {t('adminNew.common.save')}
            </Button>
          </AdminModalFooter>
        </form>
      </Modal>

      {/* Trello #73: full edit modal (customer/boat/period/billing/notes). */}
      <Modal open={!!editFullTarget} onClose={() => setEditFullTarget(null)} size="md">
        <form onSubmit={onSaveFullEdit}>
          <AdminModalHeader
            title={t('adminNew.stalling.editFull.title')}
            subtitle={editFullTarget?.contract_number ?? t('adminNew.stalling.editFull.subtitle')}
          />
          <AdminModalBody>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-navy-800">{t('adminNew.stalling.columns.customer')}</label>
              <select className="input-base w-full" value={editForm.customer_id} onChange={(e) => setEditForm({ ...editForm, customer_id: e.target.value })}>
                <option value="">{t('adminNew.kassa.selectCustomer')}</option>
                {(customers.data?.data ?? []).map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-navy-800">{t('adminNew.stalling.columns.boat')}</label>
              <select className="input-base w-full" value={editForm.boat_id} onChange={(e) => setEditForm({ ...editForm, boat_id: e.target.value })}>
                <option value="">{t('adminNew.boats.selectCustomer')}</option>
                {(boats.data?.data ?? []).map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-navy-800">{t('adminNew.stalling.columns.type')}</label>
              <select className="input-base w-full" value={editForm.type} onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}>
                <option value="winter">{t('adminNew.stalling.type.winter')}</option>
                <option value="summer">{t('adminNew.stalling.type.summer')}</option>
                <option value="year">{t('adminNew.stalling.type.year')}</option>
                <option value="week">{t('adminNew.stalling.type.week')}</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input label={t('adminNew.stalling.fields.startDate')} type="date" value={editForm.start_date} onChange={(e) => setEditForm({ ...editForm, start_date: e.target.value })} />
              <Input label={t('adminNew.stalling.fields.endDate')} type="date" value={editForm.end_date} onChange={(e) => setEditForm({ ...editForm, end_date: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input label={t('adminNew.stalling.columns.paidUntil')} type="date" value={editForm.paid_until} onChange={(e) => setEditForm({ ...editForm, paid_until: e.target.value })} />
              <Input label={t('adminNew.stalling.fields.bokNumber')} value={editForm.bok_number} onChange={(e) => setEditForm({ ...editForm, bok_number: e.target.value })} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-navy-800">{t('adminNew.stalling.fields.billingType')}</label>
              <select className="input-base w-full" value={editForm.billing_type} onChange={(e) => setEditForm({ ...editForm, billing_type: e.target.value })}>
                <option value="one_time">{t('adminNew.stalling.billing.oneTime')}</option>
                <option value="monthly">{t('adminNew.stalling.billing.monthly')}</option>
                <option value="yearly">{t('adminNew.stalling.billing.yearly')}</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-navy-800">{t('adminNew.stalling.fields.notes')}</label>
              <textarea className="input-base w-full" rows={2} value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} />
            </div>
            <Input
              label={t('adminNew.stalling.fields.changeNote')}
              value={editForm.change_note}
              onChange={(e) => setEditForm({ ...editForm, change_note: e.target.value })}
              placeholder={t('adminNew.stalling.fields.changeNotePlaceholder')}
            />
          </AdminModalBody>
          <AdminModalFooter>
            <Button type="button" variant="ghost" onClick={() => setEditFullTarget(null)}>{t('adminNew.common.cancel')}</Button>
            <Button type="submit" variant="gold" disabled={updateContract.loading}>{t('adminNew.common.save')}</Button>
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

