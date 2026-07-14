'use client';

import * as React from 'react';
import {
  AlarmClock,
  BellRing,
  CheckCircle2,
  Calendar,
  Pencil,
  Plus,
  PlayCircle,
  Send,
  Sparkles,
  XCircle,
} from 'lucide-react';
import { AdminPageHeader } from '@/components/admin/AdminShell';
import {
  AdminContent,
  AdminModalBody,
  AdminModalFooter,
  AdminModalHeader,
  AdminSectionCard,
  AdminSelect,
  AdminTable,
  AdminTableCard,
  AdminTableCell,
  AdminTableHead,
  AdminTableHeaderCell,
  AdminTableRow,
} from '@/components/admin/AdminUi';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { EmptyState, ErrorState, LoadingState } from '@/components/admin/DataState';
import { Trash2 } from 'lucide-react';
import { adminService, appointmentsService } from '@/lib/services';
import { useMutation, useQuery } from '@/lib/hooks/useAsync';
import { formatDate } from '@/lib/format';
import { useIntl } from '@/i18n/IntlProvider';
import { useToast } from '@/components/ui/ToastProvider';
import { getApiErrorMessage } from '@/lib/api-error';
import { useAuth } from '@/lib/auth-context';

// Trello #90: the summary endpoint now nests counts, e.g.
// { today: { invoice_due, reminders_due }, upcoming: {...}, ... }.
// Accept both the new nested shape and the old flat number.
const bucket = (v: unknown): number => {
  if (typeof v === 'number') return v;
  if (v && typeof v === 'object') {
    return Object.values(v as Record<string, unknown>).reduce<number>(
      (sum, n) => sum + (typeof n === 'number' ? n : 0),
      0
    );
  }
  return 0;
};

// Trello #90: the rule list previously rendered raw `entity_type` / `trigger_type`
// strings (e.g. "stalling_contract"). Map them to localized labels via the
// `adminNew.reminders.entityLabels.{type}` / `triggerLabels.{type}` i18n keys.
// Both stalling_contract and storage_contract collapse to one label.
const ENTITY_LABEL_KEYS: Record<string, string> = {
  stalling_contract: 'storage_contract',
  storage_contract: 'storage_contract',
  contract: 'storage_contract',
  invoice: 'invoice',
  work_order: 'work_order',
  insurance: 'insurance',
  planning: 'planning',
};

const emptyRule = {
  entity_type: 'invoice',
  trigger_type: 'overdue_after',
  reminder_type: '',
  days_before: '7',
  days_after: '14',
  channel: 'manual',
  title_template: '',
  body_template: '',
  enabled: true,
};

export default function RemindersPage() {
  const { locale, t } = useIntl();
  const { push } = useToast();
  const { user } = useAuth();
  const dateLocale = locale === 'en' ? 'en-GB' : locale === 'de' ? 'de-DE' : 'nl-NL';

  const [showRule, setShowRule] = React.useState(false);
  const [rule, setRule] = React.useState(emptyRule);
  const [editingRuleId, setEditingRuleId] = React.useState<string | null>(null);
  const [statusFilter, setStatusFilter] = React.useState('');

  // Test-send modal state (Trello #90).
  const [testRuleId, setTestRuleId] = React.useState<string | null>(null);
  const [testEmail, setTestEmail] = React.useState('');
  const [testEntityId, setTestEntityId] = React.useState('');

  // Localize raw entity_type / trigger_type strings for the rule list. Falls back
  // to a humanized version of the raw value when no i18n key matches.
  const humanize = (raw: string) =>
    raw ? raw.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : '';
  const entityLabel = (raw: string) => {
    const key = ENTITY_LABEL_KEYS[raw];
    const label = key ? t(`adminNew.reminders.entityLabels.${key}`) : '';
    return label && !label.startsWith('adminNew.') ? label : humanize(raw);
  };
  const triggerLabel = (raw: string) => {
    const label = raw ? t(`adminNew.reminders.triggerLabels.${raw}`) : '';
    return label && !label.startsWith('adminNew.') ? label : humanize(raw);
  };

  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
  const summary = useQuery(['reminders-summary'], () => adminService.remindersSummary());
  const todayAppointments = useQuery(['reminders-appointments-today'], () =>
    appointmentsService.list({ date_from: today, date_to: tomorrow, per_page: 1 }).catch(() => ({ meta: { total: 0 } }))
  );
  const reminders = useQuery(['reminders-list', statusFilter], () =>
    adminService.reminders({ per_page: 50, status: statusFilter || undefined })
  );
  // Pull the full index response so we can read `options.reminder_types` for the rule form.
  const ruleData = useQuery(['reminder-rules'], () =>
    adminService.reminderRuleOptions().catch(() => ({ data: [], options: {} }))
  );

  const runRules = useMutation(() => adminService.runReminderRules());
  const completeR = useMutation((id: string) => adminService.completeReminder(id));
  const dismissR = useMutation((id: string) => adminService.dismissReminder(id));
  const createRule = useMutation((payload: Record<string, unknown>) =>
    adminService.createReminderRule(payload)
  );
  const updateRule = useMutation((args: { id: string; payload: Record<string, unknown> }) =>
    adminService.updateReminderRule(args.id, args.payload)
  );
  const deleteRule = useMutation((id: string) => adminService.deleteReminderRule(id));
  const previewRule = useMutation((id: string) => adminService.previewReminderRule(id));
  const testSendRule = useMutation(
    (args: { id: string; payload: { recipient_email: string; entity_id?: string } }) =>
      adminService.testSendReminderRule(args.id, args.payload)
  );

  const refetchAll = async () => {
    await Promise.all([summary.refetch(), reminders.refetch()]);
  };

  const action = async (label: string, fn: () => Promise<unknown>, refetchRules = false) => {
    try {
      await fn();
      push({ tone: 'success', title: label });
      await refetchAll();
      if (refetchRules) await ruleData.refetch();
    } catch (err) {
      push({ tone: 'error', title: t('adminNew.common.operationFailed'), message: getApiErrorMessage(err) });
    }
  };

  // days_before fires for due/expiry triggers, days_after for overdue/inactive triggers.
  const usesDaysBefore = rule.trigger_type === 'due_before' || rule.trigger_type === 'expiring_before';

  const openEditRule = (rl: Record<string, unknown>) => {
    setRule({
      entity_type: String(rl.entity_type ?? 'invoice'),
      trigger_type: String(rl.trigger_type ?? 'overdue_after'),
      reminder_type: String(rl.reminder_type ?? ''),
      days_before: rl.days_before != null ? String(rl.days_before) : '7',
      days_after: rl.days_after != null ? String(rl.days_after) : '14',
      channel: String(rl.channel ?? 'manual'),
      title_template: String(rl.title_template ?? ''),
      body_template: String(rl.body_template ?? ''),
      enabled: rl.enabled !== false,
    });
    setEditingRuleId(String(rl.id));
    setShowRule(true);
  };

  const payload = {
    entity_type: rule.entity_type,
    trigger_type: rule.trigger_type,
    reminder_type: rule.reminder_type || undefined,
    days_before: usesDaysBefore && rule.days_before ? Number(rule.days_before) : undefined,
    days_after: !usesDaysBefore && rule.days_after ? Number(rule.days_after) : undefined,
    channel: rule.channel,
    title_template: rule.title_template || undefined,
    body_template: rule.body_template || undefined,
    enabled: rule.enabled,
  };

  const onCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingRuleId) {
      await action(
        t('adminNew.reminders.toasts.ruleUpdated', { defaultValue: 'Regel bijgewerkt' }),
        async () => {
          await updateRule.mutate({ id: editingRuleId, payload });
          setShowRule(false);
          setEditingRuleId(null);
          setRule(emptyRule);
        },
        true
      );
    } else {
      await action(
        t('adminNew.reminders.toasts.ruleCreated'),
        async () => {
          await createRule.mutate(payload);
          setShowRule(false);
          setRule(emptyRule);
        },
        true
      );
    }
  };

  const onPreviewRule = async (id: string) => {
    try {
      const res = await previewRule.mutate(id);
      const subject = (res as { subject?: string; title?: string }).subject ?? (res as { title?: string }).title;
      const body = (res as { body?: string; message?: string }).body ?? (res as { message?: string }).message;
      push({ tone: 'info', title: subject || t('adminNew.reminders.previewTitle'), message: body });
    } catch (err) {
      push({ tone: 'error', title: t('adminNew.common.operationFailed'), message: getApiErrorMessage(err) });
    }
  };

  const openTestSend = (id: string) => {
    setTestRuleId(id);
    setTestEmail(user?.email ?? '');
    setTestEntityId('');
  };

  const onTestSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testRuleId) return;
    try {
      const res = await testSendRule.mutate({
        id: testRuleId,
        payload: {
          recipient_email: testEmail.trim(),
          entity_id: testEntityId.trim() || undefined,
        },
      });
      const data = res as {
        subject?: string;
        channel_used?: string;
        recipient?: string;
        status?: string;
        note?: string;
      };
      push({
        tone: 'success',
        title: t('adminNew.reminders.testSend.sent'),
        message: data.subject || data.note,
      });
      setTestRuleId(null);
    } catch (err) {
      push({ tone: 'error', title: t('adminNew.common.operationFailed'), message: getApiErrorMessage(err) });
    }
  };

  const rows = reminders.data?.data ?? [];
  const ruleRows = (ruleData.data?.data ?? []) as Array<Record<string, unknown>>;
  const ruleOptions = (ruleData.data?.options ?? {}) as Record<string, unknown>;
  const reminderTypes = (ruleOptions.reminder_types as string[] | undefined) ?? [];

  const isOpen = (status: string) => {
    const s = (status || '').toLowerCase();
    return !s.includes('complete') && !s.includes('dismiss');
  };

  return (
    <>
      <AdminPageHeader
        title={t('adminNew.reminders.title')}
        subtitle={t('adminNew.reminders.subtitle')}
        rightSlot={
          <Button
            variant="gold"
            size="sm"
            leftIcon={<PlayCircle className="h-4 w-4" />}
            disabled={runRules.loading}
            onClick={() => void action(t('adminNew.reminders.toasts.rulesRan'), () => runRules.mutate(), true)}
          >
            {t('adminNew.reminders.runRules')}
          </Button>
        }
        stats={[
          {
            label: t('adminNew.reminders.stats.today'),
            value: bucket(summary.data?.today),
            icon: AlarmClock,
            tone: 'marine',
            loading: summary.loading,
          },
          {
            label: t('adminNew.reminders.stats.upcoming'),
            value: bucket(summary.data?.upcoming),
            icon: BellRing,
            tone: 'navy',
            loading: summary.loading,
          },
          {
            label: t('adminNew.reminders.stats.overdue'),
            value: bucket(summary.data?.overdue),
            icon: XCircle,
            tone: bucket(summary.data?.overdue) > 0 ? 'danger' : 'success',
            loading: summary.loading,
          },
          {
            label: t('adminNew.reminders.stats.completed'),
            value: bucket(summary.data?.completed),
            icon: CheckCircle2,
            tone: 'success',
            loading: summary.loading,
          },
        ]}
      />

      <AdminContent>
        <AdminSectionCard
          title={t('adminNew.reminders.briefingTitle', { defaultValue: 'Vandaag — overzicht' })}
          icon={Calendar}
          className="mb-5"
        >
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {([
              { label: t('adminNew.reminders.briefing.invoiceDue', { defaultValue: 'Facturen vervallen' }), value: (summary.data?.today as Record<string,unknown>)?.invoice_due ?? 0, tone: 'marine' },
              { label: t('adminNew.reminders.briefing.invoicesOverdue', { defaultValue: 'Facturen achterstallig' }), value: (summary.data?.overdue as Record<string,unknown>)?.invoices ?? 0, tone: 'danger' },
              { label: t('adminNew.reminders.briefing.contractsExpiring', { defaultValue: 'Contracten verlopen binnenkort' }), value: (summary.data?.upcoming as Record<string,unknown>)?.contracts_expiring ?? 0, tone: 'warning' },
              { label: t('adminNew.reminders.briefing.insuranceExpiring', { defaultValue: 'Verzekering verloopt' }), value: (summary.data?.upcoming as Record<string,unknown>)?.insurance_expiring ?? 0, tone: 'warning' },
              { label: t('adminNew.reminders.briefing.workOrdersOverdue', { defaultValue: 'Werkorders achterstallig' }), value: (summary.data?.overdue as Record<string,unknown>)?.work_orders ?? 0, tone: 'danger' },
              { label: t('adminNew.reminders.briefing.appointmentsToday', { defaultValue: 'Afspraken vandaag' }), value: (todayAppointments.data?.meta as Record<string,unknown>)?.total ?? 0, tone: 'navy' },
            ] as Array<{ label: string; value: unknown; tone: string }>).map((item) => (
              <div key={item.label} className="rounded-xl border border-navy-100 bg-gradient-to-r from-white to-sand-50/40 px-3 py-2.5 text-sm">
                <div className="text-xs font-semibold uppercase tracking-wider text-navy-400">{item.label}</div>
                <div className={`mt-1 text-2xl font-bold ${Number(item.value) > 0 && (item.tone === 'danger' || item.tone === 'warning') ? 'text-rose-600' : 'text-navy-900'}`}>
                  {String(item.value ?? 0)}
                </div>
              </div>
            ))}
          </div>
        </AdminSectionCard>

        <AdminSectionCard
          title={t('adminNew.reminders.listTitle')}
          description={t('adminNew.reminders.listSubtitle')}
          icon={BellRing}
          action={
            <AdminSelect value={statusFilter} onChange={setStatusFilter}>
              <option value="">{t('adminNew.reminders.statusAll')}</option>
              <option value="pending">{t('adminNew.reminders.statusPending')}</option>
              <option value="sent">{t('adminNew.reminders.statusSent')}</option>
              <option value="completed">{t('adminNew.reminders.statusCompleted')}</option>
              <option value="dismissed">{t('adminNew.reminders.statusDismissed')}</option>
            </AdminSelect>
          }
        >
          <AdminTableCard>
            {reminders.loading ? (
              <LoadingState label={t('adminNew.common.loading')} variant="table" />
            ) : reminders.error ? (
              <ErrorState message={reminders.error} onRetry={() => void reminders.refetch()} />
            ) : rows.length === 0 ? (
              <EmptyState
                title={t('adminNew.reminders.emptyTitle')}
                message={t('adminNew.reminders.emptyMessage')}
              />
            ) : (
              <AdminTable minWidth={840}>
                <AdminTableHead>
                  <tr>
                    <AdminTableHeaderCell>{t('adminNew.reminders.columns.subject')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{t('adminNew.reminders.columns.type')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{t('adminNew.reminders.columns.channel')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{t('adminNew.reminders.columns.status')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{t('adminNew.reminders.columns.date')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell className="text-right">&nbsp;</AdminTableHeaderCell>
                  </tr>
                </AdminTableHead>
                <tbody>
                  {rows.map((r) => {
                    const title = (r as { title?: string }).title ?? r.subject ?? r.type;
                    return (
                      <AdminTableRow key={r.id}>
                        <AdminTableCell className="font-medium text-navy-900">{title || '—'}</AdminTableCell>
                        <AdminTableCell className="capitalize">{r.type}</AdminTableCell>
                        <AdminTableCell className="capitalize">{r.channel}</AdminTableCell>
                        <AdminTableCell>
                          <Badge tone={isOpen(r.status) ? 'marine' : 'success'}>{r.status}</Badge>
                        </AdminTableCell>
                        <AdminTableCell className="whitespace-nowrap text-sm text-navy-600">
                          {formatDate(
                            (r as { trigger_at?: string }).trigger_at ?? r.sent_at ?? r.created_at,
                            dateLocale
                          )}
                        </AdminTableCell>
                        <AdminTableCell>
                          {isOpen(r.status) ? (
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                leftIcon={<CheckCircle2 className="h-3.5 w-3.5" />}
                                disabled={completeR.loading}
                                onClick={() =>
                                  void action(t('adminNew.reminders.toasts.completed'), () =>
                                    completeR.mutate(r.id)
                                  )
                                }
                              >
                                {t('adminNew.reminders.complete')}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                leftIcon={<XCircle className="h-3.5 w-3.5" />}
                                disabled={dismissR.loading}
                                onClick={() =>
                                  void action(t('adminNew.reminders.toasts.dismissed'), () =>
                                    dismissR.mutate(r.id)
                                  )
                                }
                              >
                                {t('adminNew.reminders.dismiss')}
                              </Button>
                            </div>
                          ) : (
                            <div className="text-right text-xs text-navy-400">
                              {t('adminNew.reminders.done')}
                            </div>
                          )}
                        </AdminTableCell>
                      </AdminTableRow>
                    );
                  })}
                </tbody>
              </AdminTable>
            )}
          </AdminTableCard>
        </AdminSectionCard>

        <AdminSectionCard
          title={t('adminNew.reminders.rulesTitle')}
          description={t('adminNew.reminders.rulesSubtitle')}
          icon={Sparkles}
          className="mt-5"
          action={
            <Button variant="outline" size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setShowRule(true)}>
              {t('adminNew.reminders.newRule')}
            </Button>
          }
        >
          {ruleData.loading ? (
            <LoadingState label={t('adminNew.common.loading')} variant="table" />
          ) : ruleRows.length === 0 ? (
            <EmptyState
              title={t('adminNew.reminders.rulesEmptyTitle')}
              message={t('adminNew.reminders.rulesEmptyMessage')}
            />
          ) : (
            <div className="space-y-2">
              {ruleRows.map((rl) => (
                <div
                  key={String(rl.id)}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-navy-100 px-4 py-3 text-sm"
                >
                  <div>
                    <div className="font-semibold text-navy-900">
                      {String(rl.title_template ?? rl.reminder_type ?? rl.entity_type ?? '—')}
                    </div>
                    <div className="text-xs text-navy-500">
                      {entityLabel(String(rl.entity_type ?? ''))} · {triggerLabel(String(rl.trigger_type ?? ''))}
                      {rl.days_before != null ? ` · ${rl.days_before}d before` : ''}
                      {rl.days_after != null ? ` · ${rl.days_after}d after` : ''} · {String(rl.channel ?? '')}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={rl.enabled === false ? 'neutral' : 'success'}>
                      {rl.enabled === false
                        ? t('adminNew.reminders.ruleDisabled')
                        : t('adminNew.reminders.ruleEnabled')}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      leftIcon={<Pencil className="h-3.5 w-3.5" />}
                      onClick={() => openEditRule(rl)}
                    >
                      {t('adminNew.common.edit')}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={previewRule.loading}
                      onClick={() => void onPreviewRule(String(rl.id))}
                    >
                      {t('adminNew.reminders.preview')}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      leftIcon={<Send className="h-3.5 w-3.5" />}
                      onClick={() => openTestSend(String(rl.id))}
                    >
                      {t('adminNew.reminders.testSend.button')}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      leftIcon={<Trash2 className="h-3.5 w-3.5" />}
                      disabled={deleteRule.loading}
                      onClick={() =>
                        void action(t('adminNew.reminders.toasts.ruleDeleted'), () => deleteRule.mutate(String(rl.id)), true)
                      }
                    >
                      {t('adminNew.common.delete')}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </AdminSectionCard>
      </AdminContent>

      <Modal open={showRule} onClose={() => { setShowRule(false); setEditingRuleId(null); setRule(emptyRule); }} size="md">
        <form onSubmit={onCreateRule}>
          <AdminModalHeader
            title={editingRuleId ? t('adminNew.reminders.editRule', { defaultValue: 'Regel bewerken' }) : t('adminNew.reminders.newRule')}
            subtitle={t('adminNew.reminders.ruleSubtitle')}
          />
          <AdminModalBody>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-navy-800">
                  {t('adminNew.reminders.ruleFields.entity')}
                </label>
                <select
                  className="input-base w-full"
                  value={rule.entity_type}
                  onChange={(e) => setRule({ ...rule, entity_type: e.target.value })}
                >
                  <option value="invoice">{t('adminNew.reminders.entities.invoice')}</option>
                  <option value="stalling_contract">{t('adminNew.reminders.entities.contract')}</option>
                  <option value="work_order">{t('adminNew.reminders.entities.workOrder')}</option>
                  <option value="insurance">{t('adminNew.reminders.entities.insurance')}</option>
                  <option value="planning">{t('adminNew.reminders.entities.planning')}</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-navy-800">
                  {t('adminNew.reminders.ruleFields.trigger')}
                </label>
                <select
                  className="input-base w-full"
                  value={rule.trigger_type}
                  onChange={(e) => setRule({ ...rule, trigger_type: e.target.value })}
                >
                  <option value="overdue_after">{t('adminNew.reminders.triggers.overdueAfter')}</option>
                  <option value="due_before">{t('adminNew.reminders.triggers.dueBefore')}</option>
                  <option value="expiring_before">{t('adminNew.reminders.triggers.expiresBefore')}</option>
                  <option value="inactive_after">{t('adminNew.reminders.triggers.inactiveAfter')}</option>
                </select>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                label={usesDaysBefore ? t('adminNew.reminders.ruleFields.daysBefore') : t('adminNew.reminders.ruleFields.daysAfter')}
                type="number"
                value={usesDaysBefore ? rule.days_before : rule.days_after}
                onChange={(e) =>
                  setRule(usesDaysBefore ? { ...rule, days_before: e.target.value } : { ...rule, days_after: e.target.value })
                }
              />
              <div>
                <label className="mb-1.5 block text-sm font-medium text-navy-800">
                  {t('adminNew.reminders.ruleFields.channel')}
                </label>
                <select
                  className="input-base w-full"
                  value={rule.channel}
                  onChange={(e) => setRule({ ...rule, channel: e.target.value })}
                >
                  <option value="manual">{t('adminNew.reminders.channels.manual')}</option>
                  <option value="email">{t('adminNew.reminders.channels.email')}</option>
                  <option value="portal">{t('adminNew.reminders.channels.portal')}</option>
                  <option value="whatsapp">{t('adminNew.reminders.channels.whatsapp')}</option>
                </select>
              </div>
            </div>
            {reminderTypes.length > 0 ? (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-navy-800">
                  {t('adminNew.reminders.ruleFields.reminderType')}
                </label>
                <select
                  className="input-base w-full"
                  value={rule.reminder_type}
                  onChange={(e) => setRule({ ...rule, reminder_type: e.target.value })}
                >
                  <option value="">{t('adminNew.reminders.ruleFields.reminderTypeAuto')}</option>
                  {reminderTypes.map((rt) => (
                    <option key={rt} value={rt}>
                      {rt}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            <Input
              label={t('adminNew.reminders.ruleFields.title')}
              value={rule.title_template}
              onChange={(e) => setRule({ ...rule, title_template: e.target.value })}
            />
            <div>
              <label className="mb-1.5 block text-sm font-medium text-navy-800">
                {t('adminNew.reminders.ruleFields.body')}
              </label>
              <textarea
                className="input-base min-h-20 w-full"
                value={rule.body_template}
                onChange={(e) => setRule({ ...rule, body_template: e.target.value })}
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-navy-800">
              <input
                type="checkbox"
                checked={rule.enabled}
                onChange={(e) => setRule({ ...rule, enabled: e.target.checked })}
                className="h-4 w-4 rounded border-navy-300"
              />
              {t('adminNew.reminders.ruleFields.enabled')}
            </label>
          </AdminModalBody>
          <AdminModalFooter>
            <Button type="button" variant="ghost" onClick={() => setShowRule(false)}>
              {t('adminNew.common.cancel')}
            </Button>
            <Button type="submit" variant="gold" disabled={createRule.loading || updateRule.loading}>
              {t('adminNew.common.save')}
            </Button>
          </AdminModalFooter>
        </form>
      </Modal>

      <Modal open={testRuleId !== null} onClose={() => setTestRuleId(null)} size="sm">
        <form onSubmit={onTestSend}>
          <AdminModalHeader
            title={t('adminNew.reminders.testSend.title')}
            subtitle={t('adminNew.reminders.testSend.subtitle')}
          />
          <AdminModalBody>
            <Input
              label={t('adminNew.reminders.testSend.email')}
              type="email"
              required
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
            />
            <Input
              label={t('adminNew.reminders.testSend.entityId')}
              value={testEntityId}
              onChange={(e) => setTestEntityId(e.target.value)}
              placeholder={t('adminNew.reminders.testSend.entityIdHint')}
            />
          </AdminModalBody>
          <AdminModalFooter>
            <Button type="button" variant="ghost" onClick={() => setTestRuleId(null)}>
              {t('adminNew.common.cancel')}
            </Button>
            <Button
              type="submit"
              variant="gold"
              leftIcon={<Send className="h-4 w-4" />}
              disabled={testSendRule.loading || !testEmail.trim()}
            >
              {t('adminNew.reminders.testSend.submit')}
            </Button>
          </AdminModalFooter>
        </form>
      </Modal>
    </>
  );
}
