'use client';

import * as React from 'react';
import Link from 'next/link';
import { CalendarClock, CheckCircle2, CircleCheck, Wrench, XCircle } from 'lucide-react';
import { AdminPageHeader } from '@/components/admin/AdminShell';
import { AdminConfirmModal } from '@/components/admin/AdminConfirmModal';
import {
  AdminContent,
  AdminSectionCard,
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
import { Badge } from '@/components/ui/Badge';
import { appointmentsService, workOrdersService } from '@/lib/services';
import { useMutation, useQuery } from '@/lib/hooks/useAsync';
import { EmptyState, ErrorState, LoadingState } from '@/components/admin/DataState';
import { useToast } from '@/components/ui/ToastProvider';
import { getApiErrorMessage } from '@/lib/api-error';
import { useIntl } from '@/i18n/IntlProvider';
import { formatDate } from '@/lib/format';
import type { Appointment } from '@/lib/api-types';

// Trello #88: priority → calendar event colour for the work-orders overlay.
const WORK_ORDER_PRIORITY_STYLES: Record<string, string> = {
  urgent: 'border-rose-200 bg-rose-50 text-rose-700',
  high: 'border-amber-200 bg-amber-50 text-amber-700',
  normal: 'border-marine-200 bg-marine-50 text-marine-700',
};

function workOrderPriorityStyle(priority: unknown): string {
  return WORK_ORDER_PRIORITY_STYLES[String(priority ?? 'normal')] ?? WORK_ORDER_PRIORITY_STYLES.normal;
}

function monthRange(ref: Date): { from: string; to: string } {
  const from = new Date(ref.getFullYear(), ref.getMonth(), 1);
  const to = new Date(ref.getFullYear(), ref.getMonth() + 1, 0);
  const iso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return { from: iso(from), to: iso(to) };
}

export default function AppointmentsPage() {
  const { t, locale } = useIntl();
  const { push } = useToast();
  const [status, setStatus] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [cancelTarget, setCancelTarget] = React.useState<string | null>(null);

  const appointments = useQuery([status, page], () =>
    appointmentsService.list({
      status: status || undefined,
      page,
      per_page: 20,
    })
  );

  // Trello #88: toggleable work-orders overlay for the visible month.
  const [showWorkOrders, setShowWorkOrders] = React.useState(false);
  const [workOrderRange] = React.useState(() => monthRange(new Date()));
  const workOrders = useQuery(
    ['afspraken-work-orders', showWorkOrders, workOrderRange.from, workOrderRange.to],
    () =>
      showWorkOrders
        ? workOrdersService
            .list({ due_from: workOrderRange.from, due_to: workOrderRange.to, per_page: 100 })
            .catch(() => null)
        : Promise.resolve(null)
  );
  const workOrderRows = (workOrders.data?.data ?? []) as Array<Record<string, unknown>>;

  const confirm = useMutation(appointmentsService.confirm);
  const cancel = useMutation((id: string) =>
    appointmentsService.cancel(id, t('adminNew.appointments.cancelReason'))
  );
  const updateStatus = useMutation(
    ({ id, next }: { id: string; next: string }) =>
      appointmentsService.updateStatus(id, { status: next })
  );

  const rows = appointments.data?.data ?? [];
  const dateLocale = locale === 'en' ? 'en-GB' : locale === 'de' ? 'de-DE' : 'nl-NL';
  const pendingCount = rows.filter((r) => r.status === 'pending_manual_review').length;
  const todayCount = rows.filter((r) => r.appointment_date?.slice(0, 10) === new Date().toISOString().slice(0, 10)).length;

  const onConfirm = async (id: string) => {
    try {
      await confirm.mutate(id);
      await appointments.refetch();
      push({ tone: 'success', title: t('adminNew.appointments.toasts.confirmed') });
    } catch (err) {
      push({
        tone: 'error',
        title: t('adminNew.common.operationFailed'),
        message: getApiErrorMessage(err),
      });
    }
  };

  const onCancel = async (id: string) => {
    try {
      await cancel.mutate(id);
      await appointments.refetch();
      push({ tone: 'success', title: t('adminNew.appointments.toasts.cancelled') });
    } catch (err) {
      push({
        tone: 'error',
        title: t('adminNew.common.operationFailed'),
        message: getApiErrorMessage(err),
      });
    }
  };

  const onAdvance = async (id: string, nextStatus: string) => {
    try {
      await updateStatus.mutate({ id, next: nextStatus });
      await appointments.refetch();
      push({ tone: 'success', title: t('adminNew.appointments.toasts.advanced', { status: nextStatus }) || t('adminNew.appointments.toasts.completed') });
    } catch (err) {
      push({
        tone: 'error',
        title: t('adminNew.common.operationFailed'),
        message: getApiErrorMessage(err),
      });
    }
  };

  return (
    <>
      <AdminPageHeader
        title={t('adminNew.appointments.title')}
        subtitle={t('adminNew.appointments.subtitle')}
        stats={[
          {
            label: t('adminNew.appointments.total', { count: appointments.data?.meta?.total ?? rows.length }),
            value: appointments.data?.meta?.total ?? rows.length,
            icon: CalendarClock,
            tone: 'marine',
            loading: appointments.loading,
          },
          {
            label: t('adminNew.appointments.statusPending'),
            value: pendingCount,
            icon: CheckCircle2,
            tone: pendingCount > 0 ? 'warning' : 'success',
            loading: appointments.loading,
          },
          {
            label: t('adminNew.appointments.today'),
            value: todayCount,
            icon: CircleCheck,
            tone: 'gold',
            loading: appointments.loading,
          },
        ]}
      />
      <AdminContent>
        <AdminSectionCard
          title={t('adminNew.appointments.title')}
          description={t('adminNew.appointments.listOverview')}
          icon={CalendarClock}
        >
        <AdminToolbar className="mb-4 border-0 bg-transparent p-0 shadow-none">
          <select
            className="input-base max-w-[220px]"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">{t('adminNew.appointments.allStatuses')}</option>
            <option value="pending_manual_review">{t('adminNew.appointments.statusPending')}</option>
            <option value="confirmed">{t('adminNew.appointments.statusConfirmed')}</option>
            <option value="started">{t('adminNew.appointments.statusStarted')}</option>
            <option value="completed">{t('adminNew.appointments.statusCompleted')}</option>
            <option value="cancelled">{t('adminNew.appointments.statusCancelled')}</option>
          </select>
          <label className="flex items-center gap-2 text-sm font-medium text-navy-700">
            <input
              type="checkbox"
              checked={showWorkOrders}
              onChange={(e) => setShowWorkOrders(e.target.checked)}
            />
            {t('adminNew.workOrders.overlay.toggle')}
          </label>
        </AdminToolbar>

        {showWorkOrders ? (
          <div className="mb-4 rounded-2xl border border-navy-100 bg-white p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-navy-900">
              <Wrench className="h-4 w-4 text-marine-600" />
              {t('adminNew.workOrders.overlay.title')}
            </div>
            {workOrders.loading ? (
              <LoadingState label={t('adminNew.common.loading')} />
            ) : workOrderRows.filter((wo) => wo.due_date).length === 0 ? (
              <EmptyState
                title={t('adminNew.workOrders.overlay.emptyTitle')}
                message={t('adminNew.workOrders.overlay.emptyMessage')}
              />
            ) : (
              <ul className="space-y-2">
                {workOrderRows
                  .filter((wo) => wo.due_date)
                  .sort((a, b) => String(a.due_date).localeCompare(String(b.due_date)))
                  .map((wo) => (
                    <li key={String(wo.id)}>
                      <Link
                        href={`/${locale}/admin/werkorders/${wo.id}`}
                        className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm transition hover:brightness-95 ${workOrderPriorityStyle(wo.priority)}`}
                      >
                        <span className="min-w-0 truncate font-medium">
                          #{String(wo.number ?? wo.id)} ·{' '}
                          {String(
                            wo.boat_name ??
                              (wo.boat as { name?: string } | undefined)?.name ??
                              wo.type ??
                              '—'
                          )}
                        </span>
                        <span className="shrink-0 text-xs font-semibold">
                          {formatDate(String(wo.due_date), dateLocale)}
                        </span>
                      </Link>
                    </li>
                  ))}
              </ul>
            )}
          </div>
        ) : null}

        <AdminTableCard>
          {appointments.loading ? (
            <LoadingState label={t('adminNew.appointments.loading')} />
          ) : appointments.error ? (
            <ErrorState
              message={appointments.error}
              onRetry={() => void appointments.refetch()}
            />
          ) : rows.length === 0 ? (
            <EmptyState
              title={t('adminNew.appointments.emptyTitle')}
              message={t('adminNew.appointments.emptyMessage')}
            />
          ) : (
            <>
              <AdminTable>
                <AdminTableHead>
                  <AdminTableRow>
                    <AdminTableHeaderCell>{t('adminNew.appointments.columns.date')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{t('adminNew.appointments.columns.time')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{t('adminNew.appointments.columns.boat')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{t('adminNew.appointments.columns.services')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{t('adminNew.appointments.columns.status')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{''}</AdminTableHeaderCell>
                  </AdminTableRow>
                </AdminTableHead>
                <tbody>
                  {rows.map((row) => (
                    <AppointmentRow
                      key={row.id}
                      row={row}
                      dateLocale={dateLocale}
                      t={t}
                      onConfirm={onConfirm}
                      onCancel={setCancelTarget}
                      onAdvance={onAdvance}
                    />
                  ))}
                </tbody>
              </AdminTable>
              <AdminTableFooter
                summary={t('adminNew.appointments.total', {
                  count: appointments.data?.meta?.total ?? rows.length,
                })}
                meta={appointments.data?.meta}
                onPageChange={setPage}
              />
            </>
          )}
        </AdminTableCard>
        </AdminSectionCard>
      </AdminContent>

      <AdminConfirmModal
        open={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={async () => {
          if (!cancelTarget) return;
          await onCancel(cancelTarget);
          setCancelTarget(null);
        }}
        title={t('adminNew.appointments.cancel')}
        message={t('adminNew.appointments.confirmCancel')}
        confirmLabel={t('adminNew.appointments.cancel')}
        cancelLabel={t('adminNew.common.cancel')}
        variant="danger"
        icon={XCircle}
        loading={cancel.loading}
      />
    </>
  );
}

function AppointmentRow({
  row,
  dateLocale,
  t,
  onConfirm,
  onCancel,
  onAdvance,
}: {
  row: Appointment;
  dateLocale: string;
  t: (key: string, opts?: Record<string, string | number>) => string;
  onConfirm: (id: string) => void;
  onCancel: (id: string) => void;
  onAdvance: (id: string, nextStatus: string) => void;
}) {
  const isPending = ['pending_manual_review', 'requested'].includes(row.status);
  const nextStep = row.next_status ?? null;
  const canCancel = !['completed', 'cancelled', 'no_show'].includes(row.status);

  return (
    <AdminTableRow>
      <AdminTableCell>
        <div className="flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-marine-600" />
          {formatDate(row.appointment_date, dateLocale)}
        </div>
      </AdminTableCell>
      <AdminTableCell>
        {row.start_time}
        {row.end_time ? ` – ${row.end_time}` : ''}
      </AdminTableCell>
      <AdminTableCell>{row.boat?.name ?? '—'}</AdminTableCell>
      <AdminTableCell>{row.service_codes?.join(', ') || '—'}</AdminTableCell>
      <AdminTableCell>
        <Badge tone={row.status === 'completed' ? 'success' : row.status === 'cancelled' ? 'danger' : 'neutral'}>
          {row.status_label ?? row.status}
        </Badge>
      </AdminTableCell>
      <AdminTableCell>
        <div className="flex justify-end gap-2">
          {isPending ? (
            <Button
              size="sm"
              variant="secondary"
              leftIcon={<CheckCircle2 className="h-3.5 w-3.5" />}
              onClick={() => onConfirm(row.id)}
            >
              {t('adminNew.appointments.confirm')}
            </Button>
          ) : nextStep ? (
            <Button
              size="sm"
              variant="secondary"
              leftIcon={<CircleCheck className="h-3.5 w-3.5" />}
              onClick={() => onAdvance(row.id, nextStep)}
            >
              {nextStep.replace(/_/g, ' ')}
            </Button>
          ) : null}
          {canCancel ? (
            <Button
              size="sm"
              variant="ghost"
              leftIcon={<XCircle className="h-3.5 w-3.5" />}
              onClick={() => onCancel(row.id)}
            >
              {t('adminNew.appointments.cancel')}
            </Button>
          ) : null}
        </div>
      </AdminTableCell>
    </AdminTableRow>
  );
}
