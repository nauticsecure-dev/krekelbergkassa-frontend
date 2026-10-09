'use client';

import * as React from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  Shield,
  XCircle,
} from 'lucide-react';
import { AdminPageHeader } from '@/components/admin/AdminShell';
import {
  AdminContent,
  AdminSearchInput,
  AdminSectionCard,
  AdminSelect,
  AdminTableFooter,
  AdminToolbar,
} from '@/components/admin/AdminUi';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { EmptyState, ErrorState, LoadingState } from '@/components/admin/DataState';
import { auditService } from '@/lib/services';
import { useQuery } from '@/lib/hooks/useAsync';
import { useIntl } from '@/i18n/IntlProvider';
import { formatDateTime } from '@/lib/format';
import type { AuditLog } from '@/lib/api-types';

type Severity = 'info' | 'success' | 'warning' | 'error' | 'critical';
type AuditTranslate = (key: string, options?: Record<string, string | number>) => string;
type AuditCategory =
  | 'finance'
  | 'cash'
  | 'customers'
  | 'boats'
  | 'storage'
  | 'planning'
  | 'brokerage'
  | 'settings'
  | 'integrations'
  | 'security'
  | 'system'
  | 'technical';

const CATEGORY_KEYS: AuditCategory[] = [
  'finance', 'cash', 'customers', 'boats', 'storage', 'planning',
  'brokerage', 'settings', 'integrations', 'security', 'system', 'technical',
];

const SECRET_KEY = /password|secret|token|credential|private.?key|api.?key|authorization/i;

function categoryFor(log: AuditLog): AuditCategory {
  const value = `${log.entity_type} ${log.action}`.toLowerCase();
  if (/track.?event|frontend\.|request_started|request_finished|success_toast/.test(value)) return 'technical';
  if (/security|permission|role|login|auth|credential/.test(value)) return 'security';
  if (/mollie|signhost|webhook|integration/.test(value)) return 'integrations';
  if (/cash.?closure|cashclosure|kassa|pos/.test(value)) return 'cash';
  if (/invoice|payment|credit|refund|ledger|financial/.test(value)) return 'finance';
  if (/customer|client/.test(value)) return 'customers';
  if (/boat|vessel/.test(value)) return 'boats';
  if (/stalling|storage|contract/.test(value)) return 'storage';
  if (/appointment|planning|calendar/.test(value)) return 'planning';
  if (/brokerage|sale|lead/.test(value)) return 'brokerage';
  if (/setting|configuration/.test(value)) return 'settings';
  return 'system';
}

function severityFor(log: AuditLog): Severity {
  const storedSeverity = log.severity?.toLowerCase();
  if (storedSeverity === 'info' || storedSeverity === 'success' || storedSeverity === 'warning' ||
      storedSeverity === 'error' || storedSeverity === 'critical') {
    return storedSeverity;
  }
  const value = `${log.action} ${log.reason ?? ''}`.toLowerCase();
  if (/critical|payment.?webhook|security.?breach/.test(value)) return 'critical';
  if (/fail|error|denied|rejected|exception/.test(value)) return 'error';
  if (/warn|cancel|delete|revok|expire/.test(value)) return 'warning';
  if (/created|updated|paid|completed|success|confirmed|tested/.test(value)) return 'success';
  return 'info';
}

function entityLabel(entityType: string, t: AuditTranslate): string {
  const type = entityType.toLowerCase();
  if (/invoice/.test(type)) return t('adminNew.audit.entity.invoice');
  if (/customer|client/.test(type)) return t('adminNew.audit.entity.customer');
  if (/stalling|storage|contract/.test(type)) return t('adminNew.audit.entity.stalling');
  if (/payment/.test(type)) return t('adminNew.audit.entity.payment');
  if (/boat|vessel/.test(type)) return t('adminNew.audit.entity.boat');
  if (/appointment/.test(type)) return t('adminNew.audit.entity.appointment');
  if (/cash.?closure/.test(type)) return t('adminNew.audit.entity.cashClosure');
  if (/product|service/.test(type)) return t('adminNew.audit.entity.product');
  return t('adminNew.audit.entity.system');
}

function eventTitle(log: AuditLog, t: AuditTranslate): string {
  const action = log.action.toLowerCase().replace(/[_-]/g, '.');
  const category = categoryFor(log);
  const entity = entityLabel(log.entity_type, t);

  if (/cash.?closure.*created|cashclosure\.created/.test(action)) return t('adminNew.audit.eventTitles.cashClosureCreated');
  if (/mollie.*test|test.*mollie/.test(action)) return t('adminNew.audit.eventTitles.mollieTested');
  if (/signhost.*(fail|error)|contract.*sign.*fail/.test(action)) return t('adminNew.audit.eventTitles.signingFailed');
  if (/payment.*(paid|received|created)|invoice.*paid/.test(action)) return t('adminNew.audit.eventTitles.paymentReceived');
  if (/frontend\.page.changed/.test(action)) return t('adminNew.audit.eventTitles.pageVisited');
  if (/http.?error|exception/.test(action)) return t('adminNew.audit.eventTitles.systemError');
  if (/created|store/.test(action)) return t('adminNew.audit.eventTitles.created', { entity });
  if (/updated|changed/.test(action)) return t('adminNew.audit.eventTitles.updated', { entity });
  if (/deleted|destroy/.test(action)) return t('adminNew.audit.eventTitles.deleted', { entity });
  if (/cancel/.test(action)) return t('adminNew.audit.eventTitles.cancelled', { entity });
  if (/login|logout|auth/.test(action)) return t('adminNew.audit.eventTitles.authentication');
  if (category === 'technical') return t('adminNew.audit.eventTitles.technicalActivity');
  return t('adminNew.audit.eventTitles.unknown');
}

function redactStructuredValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactStructuredValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        SECRET_KEY.test(key) ? '[redacted]' : redactStructuredValue(item),
      ])
    );
  }
  return value;
}

function safeValue(value: unknown): string {
  if (value == null) return '—';
  if (typeof value === 'boolean') return value ? 'Aan' : 'Uit';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  try {
    return JSON.stringify(redactStructuredValue(value));
  } catch {
    return '[waarde]';
  }
}

function getChanges(log: AuditLog): Array<{ key: string; before: string; after: string }> {
  const before = log.before_data ?? {};
  const after = log.after_data ?? {};
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  const changes: Array<{ key: string; before: string; after: string }> = [];

  keys.forEach((key) => {
    if (SECRET_KEY.test(key)) return;
    const oldValue = before[key];
    const newValue = after[key];
    if (JSON.stringify(oldValue) === JSON.stringify(newValue)) return;
    changes.push({
      key: key.replace(/[_-]/g, ' '),
      before: safeValue(oldValue),
      after: safeValue(newValue),
    });
  });
  return changes;
}

function severityPresentation(severity: Severity): {
  tone: React.ComponentProps<typeof Badge>['tone'];
  icon: typeof CheckCircle2;
} {
  if (severity === 'success') return { tone: 'success', icon: CheckCircle2 };
  if (severity === 'warning') return { tone: 'warning', icon: AlertTriangle };
  if (severity === 'error' || severity === 'critical') return { tone: 'danger', icon: XCircle };
  return { tone: 'neutral', icon: CircleHelp };
}

function AuditPageContent() {
  const { locale, t } = useIntl();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const dateLocale = locale === 'en' ? 'en-GB' : locale === 'de' ? 'de-DE' : 'nl-NL';

  const search = searchParams.get('search') ?? '';
  const entityType = searchParams.get('entity_type') ?? '';
  const category = searchParams.get('category') ?? '';
  const severity = searchParams.get('severity') ?? '';
  const dateFrom = searchParams.get('date_from') ?? '';
  const dateTo = searchParams.get('date_to') ?? '';
  const technical = searchParams.get('technical') === '1';
  const page = Math.max(1, Number(searchParams.get('page') ?? 1) || 1);
  const [selectedLog, setSelectedLog] = React.useState<AuditLog | null>(null);

  const updateFilters = React.useCallback((updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value) params.set(key, value);
      else params.delete(key);
    });
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  const logs = useQuery(
    [search, entityType, category, severity, dateFrom, dateTo, technical, page],
    () => auditService.logs({
      search: search || undefined,
      entity_type: entityType || undefined,
      category: category || undefined,
      severity: severity || undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      include_technical: technical,
      page,
      per_page: 30,
    })
  );

  const rows = (logs.data?.data ?? []).filter((log) => {
    if (!technical && categoryFor(log) === 'technical') return false;
    if (category && categoryFor(log) !== category) return false;
    if (severity && severityFor(log) !== severity) return false;
    return true;
  });
  const eventTypeCount = new Set(rows.map((row) => row.action)).size;
  const entityTypeCount = new Set(rows.map((row) => row.entity_type)).size;

  return (
    <>
      <AdminPageHeader
        title={t('adminNew.audit.title')}
        subtitle={t('adminNew.audit.subtitle')}
        stats={[
          {
            label: t('adminNew.audit.events', { count: logs.data?.meta?.total ?? rows.length }),
            value: logs.data?.meta?.total ?? rows.length,
            icon: Shield,
            tone: 'marine',
            loading: logs.loading,
          },
          {
            label: t('adminNew.audit.eventTypes'),
            value: eventTypeCount,
            tone: 'gold',
            loading: logs.loading,
          },
          {
            label: t('adminNew.audit.entityTypes'),
            value: entityTypeCount,
            tone: 'navy',
            loading: logs.loading,
          },
          {
            label: t('adminNew.audit.recentActivity'),
            value: rows.length,
            tone: 'success',
            loading: logs.loading,
          },
        ]}
      />

      <AdminContent>
        <AdminSectionCard
          title={t('adminNew.audit.title')}
          description={t('adminNew.audit.subtitle')}
          icon={Shield}
        >
          <AdminToolbar className="mb-4 border-0 bg-transparent p-0 shadow-none">
            <AdminSearchInput
              value={search}
              onChange={(value) => updateFilters({ search: value || null, page: null })}
              placeholder={t('adminNew.audit.searchPlaceholder')}
            />
            <AdminSelect
              value={category}
              onChange={(value) => updateFilters({ category: value || null, page: null })}
            >
              <option value="">{t('adminNew.audit.allCategories')}</option>
              {CATEGORY_KEYS.filter((item) => item !== 'technical' || technical).map((item) => (
                <option key={item} value={item}>{t(`adminNew.audit.categories.${item}`)}</option>
              ))}
            </AdminSelect>
            <AdminSelect
              value={entityType}
              onChange={(value) => updateFilters({ entity_type: value || null, page: null })}
            >
              <option value="">{t('adminNew.audit.allEntities')}</option>
              <option value="invoice">{t('adminNew.audit.entity.invoice')}</option>
              <option value="customer">{t('adminNew.audit.entity.customer')}</option>
              <option value="boat">{t('adminNew.audit.entity.boat')}</option>
              <option value="stalling_contract">{t('adminNew.audit.entity.stalling')}</option>
              <option value="payment">{t('adminNew.audit.entity.payment')}</option>
              <option value="appointment">{t('adminNew.audit.entity.appointment')}</option>
              <option value="cash_closure">{t('adminNew.audit.entity.cashClosure')}</option>
              <option value="product">{t('adminNew.audit.entity.product')}</option>
            </AdminSelect>
            <AdminSelect
              value={severity}
              onChange={(value) => updateFilters({ severity: value || null, page: null })}
            >
              <option value="">{t('adminNew.audit.allSeverities')}</option>
              {(['success', 'warning', 'error', 'critical', 'info'] as Severity[]).map((item) => (
                <option key={item} value={item}>{t(`adminNew.audit.severity.${item}`)}</option>
              ))}
            </AdminSelect>
            <label className="flex items-center gap-2 text-sm text-navy-700">
              <span>{t('adminNew.audit.dateFrom')}</span>
              <input
                className="input-base w-auto"
                type="date"
                value={dateFrom}
                onChange={(event) => updateFilters({ date_from: event.target.value || null, page: null })}
              />
            </label>
            <label className="flex items-center gap-2 text-sm text-navy-700">
              <span>{t('adminNew.audit.dateTo')}</span>
              <input
                className="input-base w-auto"
                type="date"
                value={dateTo}
                onChange={(event) => updateFilters({ date_to: event.target.value || null, page: null })}
              />
            </label>
            <label className="flex items-center gap-2 text-sm font-medium text-navy-700">
              <input
                type="checkbox"
                checked={technical}
                onChange={(event) => updateFilters({
                  technical: event.target.checked ? '1' : null,
                  category: event.target.checked ? category || null : category === 'technical' ? null : category || null,
                  page: null,
                })}
              />
              {t('adminNew.audit.showTechnical')}
            </label>
          </AdminToolbar>

          {category === 'technical' && !technical ? (
            <p className="mb-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
              {t('adminNew.audit.technicalHidden')}
            </p>
          ) : null}

          <div className="overflow-x-auto rounded-xl border border-navy-100">
            {logs.loading ? <div className="p-6"><LoadingState label={t('adminNew.audit.loading')} /></div> : null}
            {!logs.loading && logs.error ? (
              <div className="p-6"><ErrorState message={logs.error} onRetry={() => void logs.refetch()} /></div>
            ) : null}
            {!logs.loading && !logs.error && rows.length === 0 ? (
              <div className="p-6"><EmptyState title={t('adminNew.audit.empty')} /></div>
            ) : null}
            {!logs.loading && !logs.error && rows.length > 0 ? (
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-navy-50 text-xs uppercase tracking-wide text-navy-500">
                  <tr>
                    <th className="px-4 py-3">{t('adminNew.audit.columns.time')}</th>
                    <th className="px-4 py-3">{t('adminNew.audit.columns.action')}</th>
                    <th className="px-4 py-3">{t('adminNew.audit.columns.entity')}</th>
                    <th className="px-4 py-3">{t('adminNew.audit.columns.actor')}</th>
                    <th className="px-4 py-3">{t('adminNew.audit.columns.status')}</th>
                    <th className="px-4 py-3">{t('adminNew.audit.columns.details')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-100">
                  {rows.map((log) => {
                    const categoryKey = categoryFor(log);
                    const state = severityFor(log);
                    const { tone, icon: StateIcon } = severityPresentation(state);
                    const changes = getChanges(log);
                    return (
                      <tr key={log.id} className="align-top hover:bg-sand-50">
                        <td className="whitespace-nowrap px-4 py-3 text-navy-600">
                          {formatDateTime(log.created_at, dateLocale)}
                        </td>
                                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => setSelectedLog(log)}
                            className="text-left font-semibold text-navy-900 hover:text-marine-700"
                          >
                            {eventTitle(log, t)}
                          </button>
                          <p className="mt-1 max-w-lg text-xs text-navy-500">
                            {changes.length
                              ? t('adminNew.audit.changeSummary', { count: changes.length })
                              : t(`adminNew.audit.categories.${categoryKey}`)}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <Badge tone="navy">{entityLabel(log.entity_type, t)}</Badge>
                          {log.entity_id ? (
                            <div className="mt-1 max-w-[150px] truncate text-xs text-navy-400">
                              {log.entity_name || log.entity_number || t('adminNew.audit.entity.record')}
                            </div>
                          ) : null}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-navy-800">
                            {log.user?.name || t('adminNew.audit.actorFallback')}
                          </div>
                          <div className="text-xs text-navy-500">{log.actor_type}</div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge tone={tone}>
                            <span className="inline-flex items-center gap-1">
                              <StateIcon className="h-3 w-3" />
                              {t(`adminNew.audit.severity.${state}`)}
                            </span>
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Button variant="ghost" size="sm" onClick={() => setSelectedLog(log)}>
                            {t('adminNew.audit.openDetails')}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : null}
          </div>
          {rows.length > 0 ? (
            <div className="mt-3">
              <AdminTableFooter
                summary={t('adminNew.audit.events', { count: logs.data?.meta?.total ?? rows.length })}
                meta={logs.data?.meta}
                onPageChange={(nextPage) => updateFilters({ page: String(nextPage) })}
              />
            </div>
          ) : null}
        </AdminSectionCard>
      </AdminContent>

      <AuditDetailsModal
        log={selectedLog}
        locale={dateLocale}
        onClose={() => setSelectedLog(null)}
        t={t}
      />
    </>
  );
}

function AuditDetailsModal({
  log,
  locale,
  onClose,
  t,
}: {
  log: AuditLog | null;
  locale: string;
  onClose: () => void;
  t: (key: string, options?: Record<string, string | number>) => string;
}) {
  const [technicalOpen, setTechnicalOpen] = React.useState(false);
  React.useEffect(() => setTechnicalOpen(false), [log?.id]);
  if (!log) return null;

  const changes = getChanges(log);
  const severity = severityFor(log);
  const { tone, icon: StateIcon } = severityPresentation(severity);

  return (
    <Modal open={!!log} onClose={onClose} size="lg" className="max-h-[90vh] overflow-y-auto p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl text-navy-900">{eventTitle(log, t)}</h2>
          <p className="mt-1 text-sm text-navy-500">{formatDateTime(log.created_at, locale)}</p>
        </div>
        <Badge tone={tone}>
          <span className="inline-flex items-center gap-1">
            <StateIcon className="h-3 w-3" />
            {t(`adminNew.audit.severity.${severity}`)}
          </span>
        </Badge>
      </div>

      <dl className="mt-5 grid gap-4 rounded-xl bg-sand-50 p-4 sm:grid-cols-2">
        <div>
          <dt className="text-xs font-semibold uppercase text-navy-400">{t('adminNew.audit.columns.actor')}</dt>
          <dd className="mt-1 text-sm font-medium text-navy-800">
            {log.user?.name || t('adminNew.audit.actorFallback')}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase text-navy-400">{t('adminNew.audit.columns.entity')}</dt>
          <dd className="mt-1 text-sm font-medium text-navy-800">
            {entityLabel(log.entity_type, t)} · {log.entity_name || log.entity_number || t('adminNew.audit.entity.record')}
          </dd>
        </div>
        {log.reason ? (
          <div className="sm:col-span-2">
            <dt className="text-xs font-semibold uppercase text-navy-400">{t('adminNew.audit.summary')}</dt>
            <dd className="mt-1 text-sm text-navy-700">{log.reason}</dd>
          </div>
        ) : null}
      </dl>

      <section className="mt-5">
        <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-navy-500">
          {t('adminNew.audit.changes')}
        </h3>
        {changes.length ? (
          <div className="overflow-hidden rounded-lg border border-navy-100">
            {changes.map((change) => (
              <div key={change.key} className="grid gap-2 border-b border-navy-100 p-3 last:border-0 sm:grid-cols-[1fr_1fr_auto_1fr]">
                <strong className="capitalize text-navy-800">{change.key}</strong>
                <span className="break-all text-rose-700">{change.before}</span>
                <span className="text-navy-400">→</span>
                <span className="break-all text-emerald-700">{change.after}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-navy-500">{t('adminNew.audit.noChanges')}</p>
        )}
      </section>

      <section className="mt-5">
        <button
          type="button"
          onClick={() => setTechnicalOpen((open) => !open)}
          aria-expanded={technicalOpen}
          className="inline-flex items-center gap-2 text-sm font-semibold text-marine-700 hover:text-marine-900"
        >
          <ChevronDown className={`h-4 w-4 transition-transform ${technicalOpen ? 'rotate-180' : ''}`} />
          {t('adminNew.audit.technicalDetails')}
        </button>
        {technicalOpen ? (
          <dl className="mt-3 grid gap-3 rounded-xl border border-navy-100 bg-white p-4 text-sm sm:grid-cols-2">
            <TechnicalDetail label="Event" value={log.event_code || log.action} />
            <TechnicalDetail label="ID" value={log.id} />
            <TechnicalDetail label="Entity ID" value={log.entity_id} />
            <TechnicalDetail label="Request ID" value={log.request_id} />
            <TechnicalDetail label="Correlation ID" value={log.correlation_id} />
            <TechnicalDetail label="IP" value={log.ip_address} />
            <TechnicalDetail label="Endpoint" value={log.endpoint} />
            <TechnicalDetail label="HTTP method" value={log.method} />
            <TechnicalDetail label="Browser" value={log.user_agent} />
          </dl>
        ) : null}
      </section>
    </Modal>
  );
}

function TechnicalDetail({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-semibold uppercase tracking-wide text-navy-400">{label}</dt>
      <dd className="mt-1 break-all text-navy-700">{value || '—'}</dd>
    </div>
  );
}

export default function AuditPage() {
  return (
    <React.Suspense fallback={<LoadingState label="…" />}>
      <AuditPageContent />
    </React.Suspense>
  );
}
