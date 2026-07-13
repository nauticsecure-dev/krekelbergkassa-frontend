'use client';

import * as React from 'react';
import {
  Activity,
  CreditCard,
  Database,
  FileText,
  GitMerge,
  HardDriveDownload,
  KeyRound,
  Mail,
  RefreshCw,
  RotateCcw,
  Server,
  Users,
  Webhook,
  type LucideIcon,
} from 'lucide-react';
import { AdminPageHeader } from '@/components/admin/AdminShell';
import { AdminConfirmModal } from '@/components/admin/AdminConfirmModal';
import {
  AdminContent,
  AdminListItem,
  AdminMetric,
  AdminMetricGrid,
  AdminSectionCard,
} from '@/components/admin/AdminUi';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { HealthStatusBadge, healthStatusMeta } from '@/components/admin/HealthStatus';
import { adminHealthService, governanceService, repairService } from '@/lib/services';
import { useMutation, useQuery } from '@/lib/hooks/useAsync';
import { formatDateTime } from '@/lib/format';
import { trackEvent } from '@/lib/track-event';
import { ErrorState, LoadingState } from '@/components/admin/DataState';
import { useToast } from '@/components/ui/ToastProvider';
import { getApiErrorMessage } from '@/lib/api-error';
import { useIntl } from '@/i18n/IntlProvider';
import type { HealthCheckResult, Payment } from '@/lib/api-types';

export default function SystemPage() {
  const { t, locale } = useIntl();
  const dateLocale = locale === 'en' ? 'en-GB' : locale === 'de' ? 'de-DE' : 'nl-NL';
  const { push } = useToast();
  const [running, setRunning] = React.useState<string | null>(null);
  const [showBackup, setShowBackup] = React.useState(false);
  const [backupType, setBackupType] = React.useState('database');
  const [backupNotes, setBackupNotes] = React.useState('');
  const [invoiceId, setInvoiceId] = React.useState('');
  const [paymentId, setPaymentId] = React.useState('');
  const [mainCustomerId, setMainCustomerId] = React.useState('');
  const [duplicateCustomerId, setDuplicateCustomerId] = React.useState('');
  const [mergeReason, setMergeReason] = React.useState('');
  const [idempotencyKey, setIdempotencyKey] = React.useState('');
  const [idempotencyResult, setIdempotencyResult] = React.useState<string | null>(null);
  const [conflictResolve, setConflictResolve] = React.useState<{
    id: string;
    resolution: 'keep_server' | 'use_client';
  } | null>(null);
  const [conflictReason, setConflictReason] = React.useState('');
  const [confirmMerge, setConfirmMerge] = React.useState(false);
  const [confirmResendEmail, setConfirmResendEmail] = React.useState(false);

  const health = useQuery([], async () => {
    const [overview, database, queue, mollie, mail, storage, webhooks] = await Promise.all([
      adminHealthService.overview().catch(() => ({ status: 'error' } as HealthCheckResult)),
      adminHealthService.database().catch(() => ({ status: 'error' } as HealthCheckResult)),
      adminHealthService.queue().catch(() => ({ status: 'error' } as HealthCheckResult)),
      adminHealthService.mollie().catch(() => ({ status: 'error' } as HealthCheckResult)),
      adminHealthService.mail().catch(() => ({ status: 'error' } as HealthCheckResult)),
      adminHealthService.storage().catch(() => ({ status: 'error' } as HealthCheckResult)),
      adminHealthService.webhooks().catch(() => ({ status: 'error' } as HealthCheckResult)),
    ]);
    return { overview, database, queue, mollie, mail, storage, webhooks };
  });

  const repair = useQuery(['repair-data'], async () => {
    const [mismatched, failedWebhooks, syncConflicts] = await Promise.all([
      repairService.mismatchedPayments().catch(() => [] as Payment[]),
      repairService.failedWebhooks().catch(() => []),
      repairService.syncConflicts().catch(() => []),
    ]);
    return { mismatched, failedWebhooks, syncConflicts };
  });

  // Trello #104 (Pillar 21): recent backup runs.
  const backups = useQuery(['backup-runs'], () =>
    governanceService.backupRuns({ per_page: 10 }).catch(() => ({ data: [] }))
  );
  const createBackup = useMutation(() =>
    governanceService.createBackupRun({ type: backupType, notes: backupNotes || undefined })
  );

  const onRunBackup = async (e: React.FormEvent) => {
    e.preventDefault();
    trackEvent('button_clicked', { metadata: { action: 'run_backup', type: backupType } });
    try {
      await createBackup.mutate();
      push({ tone: 'success', title: t('adminNew.backups.toasts.started') });
      setShowBackup(false);
      setBackupNotes('');
      await backups.refetch();
    } catch (err) {
      push({
        tone: 'error',
        title: t('adminNew.common.operationFailed'),
        message: getApiErrorMessage(err),
      });
    }
  };

  const runRepair = async (key: string, fn: () => Promise<unknown>, successKey?: string) => {
    setRunning(key);
    try {
      await fn();
      await repair.refetch();
      push({
        tone: 'success',
        title: successKey ? t(successKey) : t('adminNew.system.toasts.actionDone'),
      });
    } catch (err) {
      push({
        tone: 'error',
        title: t('adminNew.common.operationFailed'),
        message: getApiErrorMessage(err),
      });
    } finally {
      setRunning(null);
    }
  };

  const resolveConflict = async (id: string, resolution: 'keep_server' | 'use_client', reason: string) => {
    await runRepair(
      `conflict-${id}-${resolution}`,
      () => repairService.resolveSyncConflict(id, { resolution, reason }),
      'adminNew.system.toasts.conflictResolved'
    );
  };

  const openConflictResolve = (id: string, resolution: 'keep_server' | 'use_client') => {
    setConflictReason('');
    setConflictResolve({ id, resolution });
  };

  const onMergeCustomers = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mergeReason.length < 10) {
      push({ tone: 'error', title: t('adminNew.system.fields.reason') });
      return;
    }
    setConfirmMerge(true);
  };

  const executeMergeCustomers = async () => {
    await runRepair(
      'merge-customers',
      () =>
        repairService.mergeCustomers({
          main_customer_id: mainCustomerId,
          duplicate_customer_id: duplicateCustomerId,
          reason: mergeReason,
        }),
      'adminNew.system.toasts.customersMerged'
    );
  };

  const onLookupIdempotency = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idempotencyKey.trim()) return;
    setRunning('idempotency');
    try {
      const res = await repairService.idempotencyKey(idempotencyKey.trim());
      setIdempotencyResult(JSON.stringify(res, null, 2));
    } catch (err) {
      push({
        tone: 'error',
        title: t('adminNew.common.operationFailed'),
        message: getApiErrorMessage(err),
      });
    } finally {
      setRunning(null);
    }
  };

  const checks = health.data;

  return (
    <>
      <AdminPageHeader
        title={t('adminNew.system.title')}
        subtitle={t('adminNew.system.subtitle')}
        rightSlot={
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<RefreshCw className="h-4 w-4" />}
            onClick={() => {
              void health.refetch();
              void repair.refetch();
            }}
          >
            {t('adminNew.system.refresh')}
          </Button>
        }
      />
      <AdminContent>
        {health.loading ? (
          <LoadingState label={t('adminNew.system.loadingHealth')} />
        ) : health.error ? (
          <ErrorState message={health.error} onRetry={() => void health.refetch()} />
        ) : checks ? (
          <>
            <AdminMetricGrid>
              <HealthMetric label={t('adminNew.system.checks.overview')} check={checks.overview} icon={Activity} t={t} />
              <HealthMetric label={t('adminNew.system.checks.database')} check={checks.database} icon={Database} t={t} />
              <HealthMetric label={t('adminNew.system.checks.queue')} check={checks.queue} icon={Server} t={t} />
              <HealthMetric label={t('adminNew.system.checks.mollie')} check={checks.mollie} icon={CreditCard} t={t} />
              <HealthMetric label={t('adminNew.system.checks.mail')} check={checks.mail} icon={Mail} t={t} />
              <HealthMetric label={t('adminNew.system.checks.storage')} check={checks.storage} icon={Server} t={t} />
              <HealthMetric label={t('adminNew.system.checks.webhooks')} check={checks.webhooks} icon={Webhook} t={t} />
            </AdminMetricGrid>

            <div className="grid gap-5 lg:grid-cols-2">
              <AdminSectionCard
                title={t('adminNew.system.repair.payments')}
                description={t('adminNew.system.repair.mismatchedCount', {
                  count: String(repair.data?.mismatched.length ?? 0),
                })}
                icon={CreditCard}
              >
                <Button
                  size="sm"
                  variant="secondary"
                  leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
                  disabled={running === 'mollie'}
                  onClick={() => void runRepair('mollie', () => repairService.syncMollieStatus())}
                >
                  {t('adminNew.system.repair.syncMollie')}
                </Button>
                <div className="space-y-2">
                  {(repair.data?.mismatched ?? []).slice(0, 5).map((payment) => (
                    <AdminListItem
                      key={payment.id}
                      title={payment.id}
                      actions={
                        <Button
                          size="sm"
                          variant="ghost"
                          leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
                          disabled={running === `payment-${payment.id}`}
                          onClick={() =>
                            void runRepair(`payment-${payment.id}`, () =>
                              repairService.retryPaymentWebhook(payment.id)
                            )
                          }
                        >
                          {t('adminNew.system.repair.retryWebhook')}
                        </Button>
                      }
                    />
                  ))}
                </div>
              </AdminSectionCard>

              <AdminSectionCard
                title={t('adminNew.system.repair.webhooks')}
                description={t('adminNew.system.repair.failedWebhooksCount', {
                  count: String(repair.data?.failedWebhooks.length ?? 0),
                })}
                icon={Webhook}
              >
                <div className="space-y-2">
                  {(repair.data?.failedWebhooks ?? []).slice(0, 5).map((item) => (
                    <AdminListItem
                      key={String(item.id)}
                      title={String(item.event ?? item.id ?? 'webhook')}
                      actions={
                        <Button
                          size="sm"
                          variant="ghost"
                          leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
                          disabled={running === `webhook-${item.id}`}
                          onClick={() =>
                            void runRepair(`webhook-${item.id}`, () =>
                              repairService.replayWebhook(String(item.id))
                            )
                          }
                        >
                          {t('adminNew.system.repair.replay')}
                        </Button>
                      }
                    />
                  ))}
                </div>
              </AdminSectionCard>

              <AdminSectionCard
                title={t('adminNew.system.repair.sync')}
                description={t('adminNew.system.repair.conflictsCount', {
                  count: String(repair.data?.syncConflicts.length ?? 0),
                })}
                icon={GitMerge}
              >
                <div className="space-y-2">
                  {(repair.data?.syncConflicts ?? []).slice(0, 5).map((item) => (
                    <div
                      key={String(item.id)}
                      className="rounded-lg border border-navy-100 px-3 py-2 text-sm"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate">{String(item.entity_type ?? item.id)}</span>
                        <HealthStatusBadge
                          size="sm"
                          status={String(item.status ?? 'conflict')}
                          label={t('adminNew.system.status.conflict')}
                        />
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          leftIcon={<Server className="h-3.5 w-3.5" />}
                          disabled={running === `conflict-${item.id}-keep`}
                          onClick={() => openConflictResolve(String(item.id), 'keep_server')}
                        >
                          {t('adminNew.system.repair.resolveKeepServer')}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          leftIcon={<GitMerge className="h-3.5 w-3.5" />}
                          disabled={running === `conflict-${item.id}-client`}
                          onClick={() => openConflictResolve(String(item.id), 'use_client')}
                        >
                          {t('adminNew.system.repair.resolveUseClient')}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </AdminSectionCard>

              <AdminSectionCard
                title={t('adminNew.system.repair.invoices')}
                icon={FileText}
              >
                <div className="space-y-3">
                  <Input
                    label={t('adminNew.system.fields.invoiceId')}
                    value={invoiceId}
                    onChange={(e) => setInvoiceId(e.target.value)}
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={!invoiceId || running === 'resend-email'}
                      onClick={() => setConfirmResendEmail(true)}
                    >
                      {t('adminNew.system.repair.resendEmail')}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!invoiceId || running === 'regenerate-pdf'}
                      onClick={() =>
                        void runRepair('regenerate-pdf', () =>
                          repairService.regenerateInvoicePdf(invoiceId)
                        )
                      }
                    >
                      {t('adminNew.system.repair.regeneratePdf')}
                    </Button>
                  </div>
                  <Input
                    label={t('adminNew.system.fields.paymentId')}
                    value={paymentId}
                    onChange={(e) => setPaymentId(e.target.value)}
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={!paymentId || running === 'retry-payment'}
                    onClick={() =>
                      void runRepair('retry-payment', () =>
                        repairService.retryPaymentWebhook(paymentId)
                      )
                    }
                  >
                    {t('adminNew.system.repair.retryWebhook')}
                  </Button>
                </div>
              </AdminSectionCard>

              <AdminSectionCard
                title={t('adminNew.system.repair.customers')}
                icon={Users}
              >
                <form className="space-y-3" onSubmit={onMergeCustomers}>
                  <Input
                    label={t('adminNew.system.fields.mainCustomerId')}
                    value={mainCustomerId}
                    onChange={(e) => setMainCustomerId(e.target.value)}
                    required
                  />
                  <Input
                    label={t('adminNew.system.fields.duplicateCustomerId')}
                    value={duplicateCustomerId}
                    onChange={(e) => setDuplicateCustomerId(e.target.value)}
                    required
                  />
                  <Input
                    label={t('adminNew.system.fields.reason')}
                    value={mergeReason}
                    onChange={(e) => setMergeReason(e.target.value)}
                    required
                  />
                  <Button
                    type="submit"
                    size="sm"
                    variant="secondary"
                    leftIcon={<GitMerge className="h-3.5 w-3.5" />}
                    disabled={running === 'merge-customers'}
                  >
                    {t('adminNew.system.repair.mergeCustomers')}
                  </Button>
                </form>
              </AdminSectionCard>

              <AdminSectionCard
                title={t('adminNew.system.repair.idempotency')}
                icon={KeyRound}
              >
                <form className="space-y-3" onSubmit={onLookupIdempotency}>
                  <Input
                    label={t('adminNew.system.fields.idempotencyKey')}
                    value={idempotencyKey}
                    onChange={(e) => setIdempotencyKey(e.target.value)}
                  />
                  <Button
                    type="submit"
                    size="sm"
                    variant="outline"
                    disabled={running === 'idempotency'}
                  >
                    {t('adminNew.system.repair.lookupIdempotency')}
                  </Button>
                </form>
                {idempotencyResult ? (
                  <pre className="mt-4 max-h-48 overflow-auto rounded-lg border border-navy-100 bg-sand-50/80 p-3 text-xs text-navy-700">
                    {idempotencyResult}
                  </pre>
                ) : null}
              </AdminSectionCard>
            </div>

            {/* Trello #104 (Pillar 21): backup runs */}
            <AdminSectionCard
              title={t('adminNew.backups.title')}
              description={t('adminNew.backups.subtitle')}
              icon={HardDriveDownload}
              action={
                <Button
                  size="sm"
                  variant="gold"
                  leftIcon={<HardDriveDownload className="h-3.5 w-3.5" />}
                  onClick={() => setShowBackup(true)}
                >
                  {t('adminNew.backups.runNow')}
                </Button>
              }
            >
              {backups.loading ? (
                <div className="text-sm text-navy-500">{t('adminNew.common.loading')}</div>
              ) : (backups.data?.data ?? []).length ? (
                <div className="space-y-2">
                  {(backups.data?.data ?? []).map((raw) => {
                    const run = raw as Record<string, unknown>;
                    const status = String(run.status ?? 'unknown');
                    const tone =
                      status === 'completed' || status === 'success'
                        ? 'success'
                        : status === 'failed'
                          ? 'danger'
                          : status === 'running'
                            ? 'marine'
                            : 'navy';
                    const sizeMb = run.size_mb ?? (run.size_bytes != null ? Number(run.size_bytes) / (1024 * 1024) : null);
                    const duration = run.duration_seconds;
                    return (
                      <AdminListItem
                        key={String(run.id)}
                        title={
                          <span className="flex items-center gap-2">
                            <span className="capitalize">{String(run.type ?? 'backup')}</span>
                            <Badge tone={tone}>{t(`adminNew.backups.status.${status}`)}</Badge>
                          </span>
                        }
                        subtitle={
                          <span className="flex flex-wrap gap-3">
                            {sizeMb != null ? (
                              <span>{t('adminNew.backups.size', { mb: Number(sizeMb).toFixed(1) })}</span>
                            ) : null}
                            {duration != null ? (
                              <span>{t('adminNew.backups.duration', { seconds: String(duration) })}</span>
                            ) : null}
                            {run.triggered_by ? (
                              <span>{t('adminNew.backups.triggeredBy', { by: String(run.triggered_by) })}</span>
                            ) : null}
                          </span>
                        }
                        meta={
                          <span className="text-xs">
                            <div>{run.started_at ? formatDateTime(String(run.started_at), dateLocale) : '—'}</div>
                            {run.completed_at ? (
                              <div className="text-navy-400">
                                {formatDateTime(String(run.completed_at), dateLocale)}
                              </div>
                            ) : null}
                          </span>
                        }
                      />
                    );
                  })}
                </div>
              ) : (
                <div className="text-sm text-navy-500">{t('adminNew.backups.empty')}</div>
              )}
            </AdminSectionCard>
          </>
        ) : null}
      </AdminContent>

      <AdminConfirmModal
        open={!!conflictResolve}
        onClose={() => setConflictResolve(null)}
        onConfirm={async (reason) => {
          if (!conflictResolve || !reason) return;
          await resolveConflict(conflictResolve.id, conflictResolve.resolution, reason);
          setConflictResolve(null);
        }}
        title={t('adminNew.system.repair.resolveConflictTitle')}
        message={t('adminNew.system.repair.resolveConflictMessage')}
        confirmLabel={
          conflictResolve?.resolution === 'keep_server'
            ? t('adminNew.system.repair.resolveKeepServer')
            : t('adminNew.system.repair.resolveUseClient')
        }
        cancelLabel={t('adminNew.common.cancel')}
        variant="primary"
        icon={GitMerge}
        loading={!!running?.startsWith('conflict-')}
        inputLabel={t('adminNew.system.fields.reason')}
        inputValue={conflictReason}
        onInputChange={setConflictReason}
        inputMinLength={5}
        inputRequiredMessage={t('adminNew.common.reasonTooShort', { min: '5' })}
      />

      <AdminConfirmModal
        open={confirmMerge}
        onClose={() => setConfirmMerge(false)}
        onConfirm={async () => {
          await executeMergeCustomers();
          setConfirmMerge(false);
        }}
        title={t('adminNew.system.repair.mergeCustomers')}
        message={t('adminNew.system.repair.confirmMergeCustomers')}
        confirmLabel={t('adminNew.system.repair.mergeCustomers')}
        cancelLabel={t('adminNew.common.cancel')}
        variant="danger"
        icon={Users}
        loading={running === 'merge-customers'}
      />

      <AdminConfirmModal
        open={confirmResendEmail}
        onClose={() => setConfirmResendEmail(false)}
        onConfirm={async () => {
          await runRepair('resend-email', () => repairService.resendInvoiceEmail(invoiceId));
          setConfirmResendEmail(false);
        }}
        title={t('adminNew.system.repair.resendEmail')}
        message={t('adminNew.system.repair.confirmResendEmail')}
        confirmLabel={t('adminNew.system.repair.resendEmail')}
        cancelLabel={t('adminNew.common.cancel')}
        variant="primary"
        icon={Mail}
        loading={running === 'resend-email'}
      />

      <Modal open={showBackup} onClose={() => setShowBackup(false)} size="md">
        <form onSubmit={onRunBackup} className="p-6">
          <h2 className="text-lg font-semibold text-navy-900">{t('adminNew.backups.runNow')}</h2>
          <div className="mt-4 space-y-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-navy-800">
                {t('adminNew.backups.fields.type')}
              </label>
              <select
                className="input-base w-full"
                value={backupType}
                onChange={(e) => setBackupType(e.target.value)}
              >
                <option value="database">{t('adminNew.backups.types.database')}</option>
                <option value="full">{t('adminNew.backups.types.full')}</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-navy-800">
                {t('adminNew.backups.fields.notes')}
              </label>
              <textarea
                className="input-base min-h-20 w-full"
                value={backupNotes}
                onChange={(e) => setBackupNotes(e.target.value)}
              />
            </div>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setShowBackup(false)}>
              {t('adminNew.common.cancel')}
            </Button>
            <Button type="submit" variant="gold" disabled={createBackup.loading}>
              {createBackup.loading ? t('adminNew.common.saving') : t('adminNew.backups.runNow')}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

function HealthMetric({
  label,
  check,
  icon,
  t,
}: {
  label: string;
  check: HealthCheckResult;
  icon: LucideIcon;
  t: (key: string, vars?: Record<string, string | number>) => string;
}) {
  const meta = healthStatusMeta(check.status);
  const statusLabel = t(`adminNew.system.status.${meta.kind}`);
  const hint =
    check.latency_ms != null
      ? t('adminNew.system.status.latency', { ms: String(check.latency_ms) })
      : check.message || undefined;

  return (
    <AdminMetric
      label={label}
      value={<HealthStatusBadge status={check.status} label={statusLabel} />}
      hint={hint}
      icon={icon}
      tone={meta.metricTone}
    />
  );
}
