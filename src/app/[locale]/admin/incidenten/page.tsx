'use client';

import * as React from 'react';
import { AlertTriangle, Plus } from 'lucide-react';
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
  AdminToolbar,
} from '@/components/admin/AdminUi';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { EmptyState, ErrorState, LoadingState } from '@/components/admin/DataState';
import { governanceService, usersService } from '@/lib/services';
import { useMutation, useQuery } from '@/lib/hooks/useAsync';
import { useToast } from '@/components/ui/ToastProvider';
import { getApiErrorMessage } from '@/lib/api-error';
import { useIntl } from '@/i18n/IntlProvider';
import { formatDateTime } from '@/lib/format';

type Incident = Record<string, unknown>;

const SEVERITIES = ['low', 'medium', 'high', 'critical'];
const STATUSES = ['open', 'investigating', 'identified', 'monitoring', 'resolved'];

function severityTone(severity: string): 'navy' | 'warning' | 'danger' {
  if (severity === 'critical' || severity === 'high') return 'danger';
  if (severity === 'medium') return 'warning';
  return 'navy';
}

function statusTone(status: string): 'success' | 'marine' | 'gold' | 'navy' {
  if (status === 'resolved') return 'success';
  if (status === 'monitoring') return 'marine';
  if (status === 'investigating' || status === 'identified') return 'gold';
  return 'navy';
}

export default function IncidentsPage() {
  const { t, locale } = useIntl();
  const dateLocale = locale === 'en' ? 'en-GB' : locale === 'de' ? 'de-DE' : 'nl-NL';
  const { push } = useToast();

  const [statusFilter, setStatusFilter] = React.useState('');
  const [severityFilter, setSeverityFilter] = React.useState('');
  const [page, setPage] = React.useState(1);

  const [showCreate, setShowCreate] = React.useState(false);
  const [createForm, setCreateForm] = React.useState({
    title: '',
    severity: 'medium',
    category: '',
    affected_services: '',
    description: '',
    detected_at: '',
  });

  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [updateForm, setUpdateForm] = React.useState({
    status: 'open',
    assigned_to_user_id: '',
    note: '',
  });

  const incidents = useQuery([statusFilter, severityFilter, page], () =>
    governanceService.incidents({
      status: statusFilter || undefined,
      severity: severityFilter || undefined,
      page,
      per_page: 25,
    })
  );

  const detail = useQuery([activeId], () =>
    activeId ? governanceService.incident(activeId) : Promise.resolve(null)
  );

  const users = useQuery([], () => usersService.list({ per_page: 100 }).catch(() => ({ data: [] })));

  const createIncident = useMutation(() =>
    governanceService.createIncident({
      title: createForm.title,
      severity: createForm.severity,
      category: createForm.category,
      affected_services: createForm.affected_services
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      description: createForm.description,
      detected_at: createForm.detected_at || undefined,
    })
  );

  const updateIncident = useMutation(() =>
    governanceService.updateIncident(activeId!, {
      status: updateForm.status,
      assigned_to_user_id: updateForm.assigned_to_user_id || undefined,
      note: updateForm.note || undefined,
    })
  );

  const rows = incidents.data?.data ?? [];
  const activeIncident = (detail.data ?? null) as Incident | null;
  const timeline = Array.isArray(activeIncident?.timeline)
    ? (activeIncident!.timeline as Array<Record<string, unknown>>)
    : [];

  const openDetail = (incident: Incident) => {
    setActiveId(String(incident.id));
    setUpdateForm({
      status: String(incident.status ?? 'open'),
      assigned_to_user_id: '',
      note: '',
    });
  };

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createIncident.mutate();
      push({ tone: 'success', title: t('adminNew.incidents.toasts.created') });
      setShowCreate(false);
      setCreateForm({
        title: '',
        severity: 'medium',
        category: '',
        affected_services: '',
        description: '',
        detected_at: '',
      });
      setPage(1);
      await incidents.refetch();
    } catch (err) {
      push({
        tone: 'error',
        title: t('adminNew.common.operationFailed'),
        message: getApiErrorMessage(err),
      });
    }
  };

  const onUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeId) return;
    try {
      await updateIncident.mutate();
      push({
        tone: 'success',
        title:
          updateForm.status === 'resolved'
            ? t('adminNew.incidents.toasts.resolved')
            : t('adminNew.incidents.toasts.updated'),
      });
      setUpdateForm((p) => ({ ...p, note: '' }));
      await Promise.all([detail.refetch(), incidents.refetch()]);
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
        title={t('adminNew.incidents.title')}
        subtitle={t('adminNew.incidents.subtitle')}
        rightSlot={
          <Button
            variant="gold"
            size="sm"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => setShowCreate(true)}
          >
            {t('adminNew.incidents.actions.new')}
          </Button>
        }
      />
      <AdminContent>
        <AdminSectionCard
          title={t('adminNew.incidents.title')}
          description={t('adminNew.incidents.subtitle')}
          icon={AlertTriangle}
        >
          <AdminToolbar className="mb-4 border-0 bg-transparent p-0 shadow-none">
            <AdminSelect
              value={statusFilter}
              onChange={(v) => {
                setStatusFilter(v);
                setPage(1);
              }}
            >
              <option value="">{t('adminNew.incidents.allStatuses')}</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {t(`adminNew.incidents.statuses.${s}`)}
                </option>
              ))}
            </AdminSelect>
            <AdminSelect
              value={severityFilter}
              onChange={(v) => {
                setSeverityFilter(v);
                setPage(1);
              }}
            >
              <option value="">{t('adminNew.incidents.allSeverities')}</option>
              {SEVERITIES.map((s) => (
                <option key={s} value={s}>
                  {t(`adminNew.incidents.severities.${s}`)}
                </option>
              ))}
            </AdminSelect>
          </AdminToolbar>

          <AdminTableCard
            footer={
              rows.length > 0 ? (
                <AdminTableFooter
                  summary={t('adminNew.incidents.count', {
                    count: incidents.data?.meta?.total ?? rows.length,
                  })}
                  meta={incidents.data?.meta}
                  onPageChange={setPage}
                />
              ) : undefined
            }
          >
            {incidents.loading ? (
              <LoadingState label={t('adminNew.incidents.loading')} variant="table" />
            ) : null}
            {!incidents.loading && incidents.error ? (
              <ErrorState message={incidents.error} onRetry={() => void incidents.refetch()} />
            ) : null}
            {!incidents.loading && !incidents.error && rows.length === 0 ? (
              <EmptyState title={t('adminNew.incidents.empty')} />
            ) : null}

            {!incidents.loading && !incidents.error && rows.length > 0 ? (
              <AdminTable minWidth={900}>
                <AdminTableHead>
                  <tr>
                    <AdminTableHeaderCell>{t('adminNew.incidents.columns.title')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{t('adminNew.incidents.columns.severity')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{t('adminNew.incidents.columns.status')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{t('adminNew.incidents.columns.category')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{t('adminNew.incidents.columns.created')}</AdminTableHeaderCell>
                  </tr>
                </AdminTableHead>
                <tbody>
                  {rows.map((raw) => {
                    const incident = raw as Incident;
                    const severity = String(incident.severity ?? 'low');
                    const status = String(incident.status ?? 'open');
                    return (
                      <AdminTableRow
                        key={String(incident.id)}
                        className="cursor-pointer"
                        onClick={() => openDetail(incident)}
                      >
                        <AdminTableCell className="font-semibold text-navy-900">
                          {String(incident.title ?? '—')}
                        </AdminTableCell>
                        <AdminTableCell>
                          <Badge tone={severityTone(severity)}>
                            {t(`adminNew.incidents.severities.${severity}`)}
                          </Badge>
                        </AdminTableCell>
                        <AdminTableCell>
                          <Badge tone={statusTone(status)}>
                            {t(`adminNew.incidents.statuses.${status}`)}
                          </Badge>
                        </AdminTableCell>
                        <AdminTableCell>{String(incident.category ?? '—')}</AdminTableCell>
                        <AdminTableCell className="whitespace-nowrap text-xs">
                          {incident.created_at
                            ? formatDateTime(String(incident.created_at), dateLocale)
                            : '—'}
                        </AdminTableCell>
                      </AdminTableRow>
                    );
                  })}
                </tbody>
              </AdminTable>
            ) : null}
          </AdminTableCard>
        </AdminSectionCard>
      </AdminContent>

      {/* New incident modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} size="md">
        <form onSubmit={onCreate} className="p-6">
          <h2 className="text-lg font-semibold text-navy-900">
            {t('adminNew.incidents.modal.title')}
          </h2>
          <div className="mt-4 space-y-3">
            <Input
              label={t('adminNew.incidents.fields.title')}
              value={createForm.title}
              onChange={(e) => setCreateForm((p) => ({ ...p, title: e.target.value }))}
              required
            />
            <div>
              <label className="mb-1.5 block text-sm font-medium text-navy-800">
                {t('adminNew.incidents.fields.severity')}
              </label>
              <select
                className="input-base w-full"
                value={createForm.severity}
                onChange={(e) => setCreateForm((p) => ({ ...p, severity: e.target.value }))}
              >
                {SEVERITIES.map((s) => (
                  <option key={s} value={s}>
                    {t(`adminNew.incidents.severities.${s}`)}
                  </option>
                ))}
              </select>
            </div>
            <Input
              label={t('adminNew.incidents.fields.category')}
              value={createForm.category}
              onChange={(e) => setCreateForm((p) => ({ ...p, category: e.target.value }))}
            />
            <Input
              label={t('adminNew.incidents.fields.affectedServices')}
              hint={t('adminNew.incidents.fields.affectedServicesHint')}
              value={createForm.affected_services}
              onChange={(e) => setCreateForm((p) => ({ ...p, affected_services: e.target.value }))}
            />
            <div>
              <label className="mb-1.5 block text-sm font-medium text-navy-800">
                {t('adminNew.incidents.fields.description')}
              </label>
              <textarea
                className="input-base min-h-24 w-full"
                value={createForm.description}
                onChange={(e) => setCreateForm((p) => ({ ...p, description: e.target.value }))}
              />
            </div>
            <Input
              label={t('adminNew.incidents.fields.detectedAt')}
              type="datetime-local"
              value={createForm.detected_at}
              onChange={(e) => setCreateForm((p) => ({ ...p, detected_at: e.target.value }))}
            />
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setShowCreate(false)}>
              {t('adminNew.common.cancel')}
            </Button>
            <Button type="submit" variant="gold" disabled={createIncident.loading}>
              {createIncident.loading ? t('adminNew.common.saving') : t('adminNew.incidents.actions.new')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Detail / update modal */}
      <Modal open={!!activeId} onClose={() => setActiveId(null)} size="lg">
        <div className="flex max-h-[80vh] flex-col">
          <div className="border-b border-navy-100 px-6 py-5 pr-14">
            <h2 className="text-lg font-semibold text-navy-900">
              {String(activeIncident?.title ?? t('adminNew.incidents.detail.title'))}
            </h2>
            {activeIncident ? (
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge tone={severityTone(String(activeIncident.severity ?? 'low'))}>
                  {t(`adminNew.incidents.severities.${String(activeIncident.severity ?? 'low')}`)}
                </Badge>
                <Badge tone={statusTone(String(activeIncident.status ?? 'open'))}>
                  {t(`adminNew.incidents.statuses.${String(activeIncident.status ?? 'open')}`)}
                </Badge>
                {activeIncident.category ? (
                  <Badge tone="navy">{String(activeIncident.category)}</Badge>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="grid flex-1 gap-5 overflow-y-auto p-6 lg:grid-cols-2">
            {/* Timeline */}
            <div>
              <h3 className="mb-2 text-sm font-semibold text-navy-900">
                {t('adminNew.incidents.detail.timeline')}
              </h3>
              {detail.loading ? (
                <div className="text-sm text-navy-500">{t('adminNew.common.loading')}</div>
              ) : timeline.length ? (
                <ol className="space-y-3 border-l border-navy-100 pl-4">
                  {timeline.map((entry, idx) => (
                    <li key={idx} className="relative">
                      <span className="absolute -left-[1.45rem] top-1 h-2.5 w-2.5 rounded-full bg-marine-400" />
                      <div className="text-sm text-navy-800">{String(entry.message ?? '—')}</div>
                      <div className="text-xs text-navy-400">
                        {entry.at ? formatDateTime(String(entry.at), dateLocale) : '—'}
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <div className="text-sm text-navy-500">{t('adminNew.incidents.detail.noTimeline')}</div>
              )}
            </div>

            {/* Update form */}
            <form onSubmit={onUpdate} className="space-y-3">
              <h3 className="text-sm font-semibold text-navy-900">
                {t('adminNew.incidents.detail.updateTitle')}
              </h3>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-navy-800">
                  {t('adminNew.incidents.fields.status')}
                </label>
                <select
                  className="input-base w-full"
                  value={updateForm.status}
                  onChange={(e) => setUpdateForm((p) => ({ ...p, status: e.target.value }))}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {t(`adminNew.incidents.statuses.${s}`)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-navy-800">
                  {t('adminNew.incidents.fields.assignedTo')}
                </label>
                <select
                  className="input-base w-full"
                  value={updateForm.assigned_to_user_id}
                  onChange={(e) =>
                    setUpdateForm((p) => ({ ...p, assigned_to_user_id: e.target.value }))
                  }
                >
                  <option value="">{t('adminNew.incidents.unassigned')}</option>
                  {(users.data?.data ?? []).map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-navy-800">
                  {t('adminNew.incidents.fields.note')}
                </label>
                <textarea
                  className="input-base min-h-24 w-full"
                  value={updateForm.note}
                  onChange={(e) => setUpdateForm((p) => ({ ...p, note: e.target.value }))}
                />
              </div>
              <Button type="submit" variant="gold" disabled={updateIncident.loading}>
                {updateIncident.loading
                  ? t('adminNew.common.saving')
                  : updateForm.status === 'resolved'
                    ? t('adminNew.incidents.detail.resolve')
                    : t('adminNew.incidents.detail.update')}
              </Button>
            </form>
          </div>
        </div>
      </Modal>
    </>
  );
}
