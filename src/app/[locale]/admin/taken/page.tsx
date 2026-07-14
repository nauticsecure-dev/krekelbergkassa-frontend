'use client';

import * as React from 'react';
import Link from 'next/link';
import { CheckCircle2, ClipboardList } from 'lucide-react';
import { AdminPageHeader } from '@/components/admin/AdminShell';
import {
  AdminContent,
  AdminSectionCard,
  AdminSelect,
  AdminTable,
  AdminTableCard,
  AdminTableCell,
  AdminTableFooter,
  AdminTableHead,
  AdminTableHeaderCell,
  AdminTableRow,
} from '@/components/admin/AdminUi';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState, ErrorState, LoadingState } from '@/components/admin/DataState';
import { useMutation, useQuery } from '@/lib/hooks/useAsync';
import { tasksService } from '@/lib/services';
import { formatDate } from '@/lib/format';
import { useIntl } from '@/i18n/IntlProvider';
import { useToast } from '@/components/ui/ToastProvider';
import { getApiErrorMessage } from '@/lib/api-error';

const STATUS_GROUPS = ['open', 'in_progress', 'done'] as const;

type StatusGroup = (typeof STATUS_GROUPS)[number];

const statusTone = (s: string) => {
  switch (s) {
    case 'open': return 'warning' as const;
    case 'in_progress': return 'marine' as const;
    case 'done': return 'success' as const;
    case 'cancelled': return 'neutral' as const;
    default: return 'navy' as const;
  }
};

const priorityTone = (p: string) => {
  switch (p) {
    case 'urgent': return 'danger' as const;
    case 'high': return 'warning' as const;
    case 'normal': return 'navy' as const;
    default: return 'neutral' as const;
  }
};

export default function TakenPage() {
  const { locale, t } = useIntl();
  const { push } = useToast();
  const dateLocale = locale === 'en' ? 'en-GB' : locale === 'de' ? 'de-DE' : 'nl-NL';
  const [statusFilter, setStatusFilter] = React.useState('');
  const [page, setPage] = React.useState(1);

  const tasks = useQuery(['tasks', statusFilter, page], () =>
    tasksService.list({ status: statusFilter || undefined, page, per_page: 25 })
  );
  const completeTask = useMutation((id: string) => tasksService.complete(id));

  const rows = React.useMemo(() => tasks.data?.data ?? [], [tasks.data]);

  const onComplete = async (id: string) => {
    try {
      await completeTask.mutate(id);
      push({ tone: 'success', title: t('adminNew.tasks.toasts.completed', { defaultValue: 'Taak afgerond' }) });
      await tasks.refetch();
    } catch (err) {
      push({ tone: 'error', title: t('adminNew.common.operationFailed'), message: getApiErrorMessage(err) });
    }
  };

  // Group by status for grouped display when no filter is active.
  const grouped = React.useMemo(() => {
    if (statusFilter) return null;
    return STATUS_GROUPS.reduce<Record<StatusGroup, Array<Record<string, unknown>>>>((acc, s) => {
      acc[s] = rows.filter((r) => String(r.status ?? '') === s);
      return acc;
    }, { open: [], in_progress: [], done: [] });
  }, [rows, statusFilter]);

  const entityLink = (r: Record<string, unknown>) => {
    const type = String(r.entity_type ?? '');
    const id = String(r.entity_id ?? '');
    if (!type || !id) return null;
    const href =
      type === 'invoice' ? `/${locale}/admin/facturen/${id}`
      : type === 'work_order' ? `/${locale}/admin/werkorders/${id}`
      : type === 'storage_contract' || type === 'stalling_contract' ? `/${locale}/admin/stalling/${id}`
      : null;
    return href ? (
      <Link href={href} className="text-xs font-semibold text-marine-700 hover:text-marine-900">
        {type.replace(/_/g, ' ')} →
      </Link>
    ) : (
      <span className="text-xs text-navy-400">{type}</span>
    );
  };

  const TaskTable = ({ taskRows }: { taskRows: Array<Record<string, unknown>> }) => (
    <AdminTable minWidth={780}>
      <AdminTableHead>
        <tr>
          <AdminTableHeaderCell>{t('adminNew.tasks.columns.title', { defaultValue: 'Taak' })}</AdminTableHeaderCell>
          <AdminTableHeaderCell>{t('adminNew.tasks.columns.customer', { defaultValue: 'Klant' })}</AdminTableHeaderCell>
          <AdminTableHeaderCell>{t('adminNew.tasks.columns.entity', { defaultValue: 'Entiteit' })}</AdminTableHeaderCell>
          <AdminTableHeaderCell>{t('adminNew.tasks.columns.priority', { defaultValue: 'Prioriteit' })}</AdminTableHeaderCell>
          <AdminTableHeaderCell>{t('adminNew.tasks.columns.dueAt', { defaultValue: 'Deadline' })}</AdminTableHeaderCell>
          <AdminTableHeaderCell>{t('adminNew.tasks.columns.status', { defaultValue: 'Status' })}</AdminTableHeaderCell>
          <AdminTableHeaderCell className="text-right">&nbsp;</AdminTableHeaderCell>
        </tr>
      </AdminTableHead>
      <tbody>
        {taskRows.map((r) => {
          const isDone = String(r.status ?? '') === 'done' || String(r.status ?? '') === 'cancelled';
          const customer = r.customer as { id?: string; name?: string } | undefined;
          return (
            <AdminTableRow key={String(r.id)}>
              <AdminTableCell>
                <div className="font-medium text-navy-900">{String(r.title ?? '—')}</div>
                {r.description ? (
                  <div className="mt-0.5 line-clamp-1 text-xs text-navy-500">{String(r.description)}</div>
                ) : null}
              </AdminTableCell>
              <AdminTableCell>
                {customer?.id ? (
                  <Link href={`/${locale}/admin/klanten/${customer.id}`} className="font-semibold text-marine-700 hover:text-marine-900">
                    {customer.name ?? '—'}
                  </Link>
                ) : '—'}
              </AdminTableCell>
              <AdminTableCell>{entityLink(r)}</AdminTableCell>
              <AdminTableCell>
                <Badge tone={priorityTone(String(r.priority ?? ''))}>
                  {String(r.priority ?? '—')}
                </Badge>
              </AdminTableCell>
              <AdminTableCell className="whitespace-nowrap text-sm text-navy-600">
                {r.due_at ? formatDate(String(r.due_at), dateLocale) : '—'}
              </AdminTableCell>
              <AdminTableCell>
                <Badge tone={statusTone(String(r.status ?? ''))}>
                  {String(r.status ?? '—')}
                </Badge>
              </AdminTableCell>
              <AdminTableCell className="text-right">
                {!isDone ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    leftIcon={<CheckCircle2 className="h-3.5 w-3.5" />}
                    disabled={completeTask.loading}
                    onClick={() => void onComplete(String(r.id))}
                  >
                    {t('adminNew.tasks.complete', { defaultValue: 'Afronden' })}
                  </Button>
                ) : (
                  <span className="text-xs text-navy-400">
                    {t('adminNew.tasks.done', { defaultValue: 'Afgerond' })}
                  </span>
                )}
              </AdminTableCell>
            </AdminTableRow>
          );
        })}
      </tbody>
    </AdminTable>
  );

  return (
    <>
      <AdminPageHeader
        title={t('adminNew.tasks.title', { defaultValue: 'Taken' })}
        subtitle={t('adminNew.tasks.subtitle', { defaultValue: 'Automatisch aangemaakte opvolgtaken vanuit herinneringen' })}
        stats={[
          { label: t('adminNew.tasks.stats.open', { defaultValue: 'Open' }), value: rows.filter((r) => String(r.status ?? '') === 'open').length, icon: ClipboardList, tone: 'warning' },
          { label: t('adminNew.tasks.stats.inProgress', { defaultValue: 'In uitvoering' }), value: rows.filter((r) => String(r.status ?? '') === 'in_progress').length, icon: ClipboardList, tone: 'marine' },
          { label: t('adminNew.tasks.stats.done', { defaultValue: 'Afgerond' }), value: rows.filter((r) => String(r.status ?? '') === 'done').length, icon: CheckCircle2, tone: 'success' },
        ]}
      />

      <AdminContent>
        <div className="mb-4 flex justify-end">
          <AdminSelect value={statusFilter} onChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <option value="">{t('adminNew.tasks.statusAll', { defaultValue: 'Alle statussen' })}</option>
            <option value="open">{t('adminNew.tasks.statusOpen', { defaultValue: 'Open' })}</option>
            <option value="in_progress">{t('adminNew.tasks.statusInProgress', { defaultValue: 'In uitvoering' })}</option>
            <option value="done">{t('adminNew.tasks.statusDone', { defaultValue: 'Afgerond' })}</option>
            <option value="cancelled">{t('adminNew.tasks.statusCancelled', { defaultValue: 'Geannuleerd' })}</option>
          </AdminSelect>
        </div>

        {tasks.loading ? <LoadingState label={t('adminNew.common.loading')} variant="table" /> : null}
        {!tasks.loading && tasks.error ? <ErrorState message={tasks.error} onRetry={() => void tasks.refetch()} /> : null}

        {!tasks.loading && !tasks.error ? (
          statusFilter || !grouped ? (
            <AdminSectionCard title={t('adminNew.tasks.title', { defaultValue: 'Taken' })} icon={ClipboardList}>
              {rows.length === 0 ? (
                <EmptyState title={t('adminNew.tasks.emptyTitle', { defaultValue: 'Geen taken' })} message={t('adminNew.tasks.emptyMessage', { defaultValue: 'Er zijn nog geen taken aangemaakt.' })} />
              ) : (
                <AdminTableCard footer={<AdminTableFooter summary={`${tasks.data?.meta?.total ?? rows.length} taken`} meta={tasks.data?.meta} onPageChange={setPage} />}>
                  <TaskTable taskRows={rows} />
                </AdminTableCard>
              )}
            </AdminSectionCard>
          ) : (
            <div className="space-y-5">
              {STATUS_GROUPS.filter((s) => grouped[s].length > 0).map((s) => (
                <AdminSectionCard
                  key={s}
                  title={`${t(`adminNew.tasks.status${s.charAt(0).toUpperCase() + s.slice(1).replace('_', '')}`, { defaultValue: s })} (${grouped[s].length})`}
                  icon={s === 'done' ? CheckCircle2 : ClipboardList}
                >
                  <AdminTableCard>
                    <TaskTable taskRows={grouped[s]} />
                  </AdminTableCard>
                </AdminSectionCard>
              ))}
              {STATUS_GROUPS.every((s) => grouped[s].length === 0) ? (
                <EmptyState title={t('adminNew.tasks.emptyTitle', { defaultValue: 'Geen taken' })} message={t('adminNew.tasks.emptyMessage', { defaultValue: 'Er zijn nog geen taken aangemaakt.' })} />
              ) : null}
            </div>
          )
        ) : null}
      </AdminContent>
    </>
  );
}
