'use client';

import * as React from 'react';
import { CalendarClock, CheckCircle2, CircleCheck, XCircle } from 'lucide-react';
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
import { appointmentsService } from '@/lib/services';
import { useMutation, useQuery } from '@/lib/hooks/useAsync';
import { EmptyState, ErrorState, LoadingState } from '@/components/admin/DataState';
import { useToast } from '@/components/ui/ToastProvider';
import { useIntl } from '@/i18n/IntlProvider';
import { formatDate } from '@/lib/format';
import type { Appointment } from '@/lib/api-types';

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
        message: err instanceof Error ? err.message : undefined,
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
        message: err instanceof Error ? err.message : undefined,
      });
    }
  };

  const onComplete = async (id: string) => {
    try {
      await updateStatus.mutate({ id, next: 'completed' });
      await appointments.refetch();
      push({ tone: 'success', title: t('adminNew.appointments.toasts.completed') });
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
        </AdminToolbar>

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
                      onComplete={onComplete}
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
  onComplete,
}: {
  row: Appointment;
  dateLocale: string;
  t: (key: string) => string;
  onConfirm: (id: string) => void;
  onCancel: (id: string) => void;
  onComplete: (id: string) => void;
}) {
  const canConfirm = row.status === 'pending_manual_review';
  const canComplete = ['confirmed', 'started', 'in_water', 'out_of_water', 'wash_started'].includes(
    row.status
  );
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
          {row.status}
        </Badge>
      </AdminTableCell>
      <AdminTableCell>
        <div className="flex justify-end gap-2">
          {canConfirm ? (
            <Button
              size="sm"
              variant="secondary"
              leftIcon={<CheckCircle2 className="h-3.5 w-3.5" />}
              onClick={() => onConfirm(row.id)}
            >
              {t('adminNew.appointments.confirm')}
            </Button>
          ) : null}
          {canComplete ? (
            <Button
              size="sm"
              variant="secondary"
              leftIcon={<CircleCheck className="h-3.5 w-3.5" />}
              onClick={() => onComplete(row.id)}
            >
              {t('adminNew.appointments.complete')}
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
