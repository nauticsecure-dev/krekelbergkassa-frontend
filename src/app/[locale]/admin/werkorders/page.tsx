'use client';

import * as React from 'react';
import Link from 'next/link';
import { AlertCircle, Clock, Filter, Plus, Search, Wrench } from 'lucide-react';
import { AdminPageHeader } from '@/components/admin/AdminShell';
import {
  AdminContent,
  AdminModalBody,
  AdminModalFooter,
  AdminModalHeader,
  AdminSectionCard,
  AdminTable,
  AdminTableCard,
  AdminTableCell,
  AdminTableFooter,
  AdminTableHead,
  AdminTableHeaderCell,
  AdminTableRow,
} from '@/components/admin/AdminUi';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { boatsService, workOrdersService } from '@/lib/services';
import { getApiErrorMessage } from '@/lib/api-error';
import { useMutation, useQuery } from '@/lib/hooks/useAsync';
import { EmptyState, ErrorState, LoadingState } from '@/components/admin/DataState';
import { useToast } from '@/components/ui/ToastProvider';
import { useIntl } from '@/i18n/IntlProvider';
import { formatDate } from '@/lib/format';

const TYPE_LABELS: Record<string, string> = {
  pressure_washing: 'Hogedrukreiniging',
  crane_service: 'Kraanservice',
  winter_storage_preparation: 'Winterklaar maken',
  summer_storage_preparation: 'Zomerklaar maken',
  engine_maintenance: 'Motoronderhoud',
  electrical_work: 'Elektrawerk',
  painting: 'Schilderwerk',
  polishing: 'Polijsten',
  cleaning: 'Reiniging',
  battery_service: 'Accu service',
  inspection: 'Inspectie',
  transport: 'Transport',
  insurance_inspection: 'Verzekeringskeuring',
  supplier_workbon: 'Leverancier werkbon',
  custom: 'Overig',
};

const ALL_STATUSES = [
  'draft', 'new', 'planned', 'assigned', 'in_progress',
  'waiting_for_customer', 'waiting_for_parts', 'waiting_for_supplier_invoice',
  'waiting_for_payment', 'completed', 'invoiced', 'cancelled', 'archived',
];

function workOrderTypeLabel(
  type: string | undefined | null,
  t: (key: string, vars?: Record<string, string | number>) => string,
  metaTypes?: Array<{ value: string; label: string }>
): string {
  if (!type) return '—';
  const fromMeta = metaTypes?.find((o) => o.value === type)?.label;
  if (fromMeta) return fromMeta;
  const key = `adminNew.workOrders.types.${type}`;
  const translated = t(key);
  if (translated !== key) return translated;
  return TYPE_LABELS[type] ?? type;
}

function priorityTone(priority: string): React.ComponentProps<typeof Badge>['tone'] {
  if (priority === 'emergency' || priority === 'urgent') return 'danger';
  if (priority === 'high') return 'gold';
  return 'neutral';
}

function isOverdue(row: Record<string, unknown>): boolean {
  const due = row.due_date as string | undefined;
  if (!due) return false;
  const terminalStatuses = ['completed', 'invoiced', 'cancelled', 'archived'];
  if (terminalStatuses.includes(String(row.status ?? ''))) return false;
  return new Date(due) < new Date(new Date().toDateString());
}

export default function WorkOrdersPage() {
  const { locale, t } = useIntl();
  const { push } = useToast();
  const [page, setPage] = React.useState(1);
  const [showCreate, setShowCreate] = React.useState(false);
  const [showFilters, setShowFilters] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [searchInput, setSearchInput] = React.useState('');
  const [filterStatus, setFilterStatus] = React.useState('');
  const [filterPriority, setFilterPriority] = React.useState('');
  const [filterType, setFilterType] = React.useState('');
  const [filterAssignee, setFilterAssignee] = React.useState('');
  const [form, setForm] = React.useState({
    boat_id: '',
    type: '',
    priority: 'normal',
    description: '',
    due_date: '',
    assigned_to_user_id: '',
    estimated_hours: '',
  });

  const filters = {
    page,
    per_page: 20,
    ...(search ? { search } : {}),
    ...(filterStatus ? { status: filterStatus } : {}),
    ...(filterPriority ? { priority: filterPriority } : {}),
    ...(filterType ? { type: filterType } : {}),
    ...(filterAssignee ? { assigned_to_user_id: filterAssignee } : {}),
  };

  const orders = useQuery([page, search, filterStatus, filterPriority, filterType, filterAssignee], () =>
    workOrdersService.list(filters)
  );
  const stats = useQuery(['wo-stats'], () => workOrdersService.stats().catch(() => null));
  const boats = useQuery(['wo-boats'], () => boatsService.list({ per_page: 100 }));
  const metadata = useQuery(['wo-metadata'], () => workOrdersService.metadata().catch(() => null));
  const technicians = metadata.data?.technicians ?? [];
  const types = metadata.data?.types ?? [];
  const createOrder = useMutation(workOrdersService.create);
  const updateOrder = useMutation((payload: { id: string; data: Record<string, unknown> }) =>
    workOrdersService.update(payload.id, payload.data)
  );

  const rows = orders.data?.data ?? [];
  const dateLocale = locale === 'en' ? 'en-GB' : 'nl-NL';

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const clearFilters = () => {
    setSearch('');
    setSearchInput('');
    setFilterStatus('');
    setFilterPriority('');
    setFilterType('');
    setFilterAssignee('');
    setPage(1);
  };

  const hasActiveFilters = search || filterStatus || filterPriority || filterType || filterAssignee;

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createOrder.mutate({
        boat_id: form.boat_id,
        type: form.type,
        priority: form.priority,
        description: form.description,
        due_date: form.due_date || undefined,
        assigned_to_user_id: form.assigned_to_user_id || undefined,
        estimated_hours: form.estimated_hours ? Number(form.estimated_hours) : undefined,
      });
      setShowCreate(false);
      setForm({ boat_id: '', type: '', priority: 'normal', description: '', due_date: '', assigned_to_user_id: '', estimated_hours: '' });
      await orders.refetch();
      push({ tone: 'success', title: t('adminNew.workOrders.toasts.created') });
    } catch (err) {
      push({ tone: 'error', title: t('adminNew.common.operationFailed'), message: getApiErrorMessage(err) });
    }
  };

  const statsData = stats.data as Record<string, unknown> | null | undefined;

  return (
    <>
      <AdminPageHeader
        title={t('adminNew.workOrders.title')}
        subtitle={t('adminNew.workOrders.subtitle')}
        rightSlot={
          orders.errorStatus === 403 ? null : (
            <Button variant="gold" size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setShowCreate(true)}>
              {t('adminNew.workOrders.new')}
            </Button>
          )
        }
        stats={[
          { label: 'Open', value: String(statsData?.open ?? 0), icon: Wrench, tone: 'marine' as const, loading: stats.loading },
          { label: 'Te laat', value: String(statsData?.overdue ?? 0), icon: AlertCircle, tone: (statsData?.overdue ? 'danger' : 'navy') as 'danger' | 'navy', loading: stats.loading },
          { label: 'Afgerond', value: String(statsData?.completed_this_period ?? 0), icon: Wrench, tone: 'success' as const, loading: stats.loading },
          { label: 'Uren', value: `${String(statsData?.labor_hours ?? 0)}u`, icon: Clock, tone: 'gold' as const, loading: stats.loading },
        ]}
      />
      <AdminContent>
        {/* Filter bar */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <form onSubmit={handleSearch} className="flex items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-navy-400" />
              <input
                className="input-base h-9 pl-9 text-sm"
                placeholder={t('adminNew.common.search')}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
            <Button type="submit" size="sm" variant="outline">
              {t('adminNew.common.search')}
            </Button>
          </form>
          <Button
            size="sm"
            variant="outline"
            leftIcon={<Filter className="h-3.5 w-3.5" />}
            onClick={() => setShowFilters((v) => !v)}
          >
            {t('adminNew.common.filter')}
            {hasActiveFilters ? <span className="ml-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-marine-600 text-xs text-white">!</span> : null}
          </Button>
          {hasActiveFilters ? (
            <Button size="sm" variant="ghost" onClick={clearFilters}>
              {t('adminNew.common.clearFilters')}
            </Button>
          ) : null}
        </div>

        {showFilters ? (
          <div className="mb-4 grid grid-cols-2 gap-3 rounded-xl border border-navy-100 bg-white p-4 sm:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-navy-600">{t('adminNew.workOrders.columns.status')}</label>
              <select
                className="input-base w-full text-sm"
                value={filterStatus}
                onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
              >
                <option value="">{t('adminNew.common.all')}</option>
                {ALL_STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-navy-600">{t('adminNew.workOrders.columns.priority')}</label>
              <select
                className="input-base w-full text-sm"
                value={filterPriority}
                onChange={(e) => { setFilterPriority(e.target.value); setPage(1); }}
              >
                <option value="">{t('adminNew.common.all')}</option>
                {['low', 'normal', 'high', 'urgent', 'emergency'].map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-navy-600">{t('adminNew.workOrders.columns.type')}</label>
              <select
                className="input-base w-full text-sm"
                value={filterType}
                onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
              >
                <option value="">{t('adminNew.common.all')}</option>
                {(types.length ? types : Object.keys(TYPE_LABELS).map((v) => ({ value: v, label: TYPE_LABELS[v] }))).map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-navy-600">{t('adminNew.workOrders.columns.assignee')}</label>
              <select
                className="input-base w-full text-sm"
                value={filterAssignee}
                onChange={(e) => { setFilterAssignee(e.target.value); setPage(1); }}
              >
                <option value="">{t('adminNew.common.all')}</option>
                {technicians.map((tech) => (
                  <option key={tech.id} value={tech.id}>{tech.name}</option>
                ))}
              </select>
            </div>
          </div>
        ) : null}

        <AdminSectionCard title={t('adminNew.workOrders.title')} icon={Wrench}>
          {orders.loading ? <LoadingState label={t('adminNew.common.loading')} variant="table" /> : null}
          {orders.errorStatus === 403 ? (
            <ErrorState
              title={t('adminNew.workOrders.forbiddenTitle')}
              message={t('adminNew.workOrders.forbiddenMessage')}
            />
          ) : null}
          {orders.error && orders.errorStatus !== 403 ? (
            <ErrorState message={orders.error} onRetry={() => void orders.refetch()} />
          ) : null}
          {!orders.loading && !orders.error && rows.length === 0 ? (
            <EmptyState title={t('adminNew.workOrders.emptyTitle')} message={t('adminNew.workOrders.emptyMessage')} />
          ) : null}
          {!orders.loading && rows.length > 0 ? (
            <AdminTableCard
              footer={
                <AdminTableFooter
                  summary={t('adminNew.workOrders.total', { count: orders.data?.meta?.total ?? rows.length })}
                  meta={orders.data?.meta}
                  onPageChange={setPage}
                />
              }
            >
              <AdminTable minWidth={900}>
                <AdminTableHead>
                  <tr>
                    <AdminTableHeaderCell>{t('adminNew.workOrders.columns.number')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{t('adminNew.workOrders.columns.boat')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{t('adminNew.workOrders.columns.type')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{t('adminNew.workOrders.columns.assignee')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{t('adminNew.workOrders.columns.status')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{t('adminNew.workOrders.columns.priority')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{t('adminNew.workOrders.columns.hours')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{t('adminNew.workOrders.columns.invoiceStatus')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{t('adminNew.workOrders.columns.due')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>&nbsp;</AdminTableHeaderCell>
                  </tr>
                </AdminTableHead>
                <tbody>
                  {rows.map((row) => {
                    const overdue = isOverdue(row);
                    return (
                      <AdminTableRow key={String(row.id)} className={overdue ? 'bg-rose-50/40' : undefined}>
                        <AdminTableCell className="font-semibold">
                          <Link
                            href={`/${locale}/admin/werkorders/${row.id}`}
                            className="text-marine-700 hover:text-marine-900"
                          >
                            {String(row.number ?? row.id)}
                          </Link>
                          {overdue ? (
                            <AlertCircle className="ml-1.5 inline h-3.5 w-3.5 text-rose-500" aria-label="Te laat" />
                          ) : null}
                        </AdminTableCell>
                        <AdminTableCell className="text-sm">
                          {String(
                            row.boat_name ??
                              (row.boat as { name?: string } | undefined)?.name ??
                              '—'
                          )}
                          {row.customer_name ? (
                            <div className="text-xs text-navy-400">{String(row.customer_name)}</div>
                          ) : null}
                        </AdminTableCell>
                        <AdminTableCell>{workOrderTypeLabel(row.type as string | undefined, t, types)}</AdminTableCell>
                        <AdminTableCell className="text-sm">
                          {String(
                            (row.assigned_to as { name?: string } | undefined)?.name ??
                              row.assignee_name ??
                              '—'
                          )}
                        </AdminTableCell>
                        <AdminTableCell>
                          <select
                            className="input-base py-1 text-xs"
                            value={String(row.status ?? 'new')}
                            onChange={(e) =>
                              void updateOrder
                                .mutate({ id: String(row.id), data: { status: e.target.value } })
                                .then(() => orders.refetch())
                                .catch(() => null)
                            }
                          >
                            {ALL_STATUSES.map((s) => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        </AdminTableCell>
                        <AdminTableCell>
                          <Badge tone={priorityTone(String(row.priority ?? 'normal'))}>
                            {String(row.priority ?? 'normal')}
                          </Badge>
                        </AdminTableCell>
                        <AdminTableCell className="text-sm">
                          {(() => {
                            const totals = (row.totals as { labor_hours?: number } | undefined) ?? {};
                            return totals.labor_hours != null ? Number(totals.labor_hours).toFixed(2) : '—';
                          })()}
                        </AdminTableCell>
                        <AdminTableCell>
                          <Badge tone={String(row.invoice_status ?? '').includes('not') ? 'neutral' : 'marine'}>
                            {String(row.invoice_status ?? '—')}
                          </Badge>
                        </AdminTableCell>
                        <AdminTableCell className={overdue ? 'font-semibold text-rose-600' : ''}>
                          {row.due_date ? formatDate(String(row.due_date), dateLocale) : '—'}
                        </AdminTableCell>
                        <AdminTableCell className="text-right">
                          <Link
                            href={`/${locale}/admin/werkorders/${row.id}`}
                            className="text-sm font-semibold text-marine-700 hover:text-marine-900"
                          >
                            {t('adminNew.workOrders.detail.open')} →
                          </Link>
                        </AdminTableCell>
                      </AdminTableRow>
                    );
                  })}
                </tbody>
              </AdminTable>
            </AdminTableCard>
          ) : null}
        </AdminSectionCard>
      </AdminContent>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} size="md">
        <form onSubmit={onCreate}>
          <AdminModalHeader title={t('adminNew.workOrders.new')} subtitle={t('adminNew.workOrders.createSubtitle')} />
          <AdminModalBody>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-navy-800">{t('adminNew.boats.title')}</label>
              <select className="input-base w-full" value={form.boat_id} onChange={(e) => setForm({ ...form, boat_id: e.target.value })} required>
                <option value="">{t('adminNew.boats.selectCustomer')}</option>
                {(boats.data?.data ?? []).map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-navy-800">{t('adminNew.workOrders.columns.type')}</label>
              <select className="input-base w-full" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} required>
                <option value="">{t('adminNew.workOrders.selectType')}</option>
                {(types.length ? types : Object.keys(TYPE_LABELS).map((value) => ({ value, label: TYPE_LABELS[value] }))).map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-navy-800">{t('adminNew.workOrders.detail.priority')}</label>
                <select className="input-base w-full" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                  {['low', 'normal', 'high', 'urgent', 'emergency'].map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-navy-800">{t('adminNew.workOrders.columns.assignee')}</label>
                <select className="input-base w-full" value={form.assigned_to_user_id} onChange={(e) => setForm({ ...form, assigned_to_user_id: e.target.value })}>
                  <option value="">{t('adminNew.workOrders.detail.unassigned')}</option>
                  {technicians.map((tech) => (
                    <option key={tech.id} value={tech.id}>{tech.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input label={t('adminNew.workOrders.detail.estimatedHours')} type="number" value={form.estimated_hours} onChange={(e) => setForm({ ...form, estimated_hours: e.target.value })} />
              <Input label={t('adminNew.workOrders.columns.due')} type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
            </div>
            <textarea className="input-base min-h-24 w-full" placeholder={t('adminNew.workOrders.description')} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </AdminModalBody>
          <AdminModalFooter>
            <Button type="button" variant="ghost" onClick={() => setShowCreate(false)}>{t('adminNew.common.cancel')}</Button>
            <Button type="submit" variant="gold" disabled={createOrder.loading}>{t('adminNew.common.save')}</Button>
          </AdminModalFooter>
        </form>
      </Modal>
    </>
  );
}
