'use client';

import * as React from 'react';
import {
  AlertTriangle,
  Clock,
  Fingerprint,
  KeyRound,
  Lock,
  RefreshCw,
  ShieldCheck,
  ShieldAlert,
  UserX,
  type LucideIcon,
} from 'lucide-react';
import { AdminPageHeader } from '@/components/admin/AdminShell';
import {
  AdminContent,
  AdminMetric,
  AdminMetricGrid,
  AdminSectionCard,
} from '@/components/admin/AdminUi';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ErrorState, LoadingState } from '@/components/admin/DataState';
import { adminHealthService } from '@/lib/services';
import { useQuery } from '@/lib/hooks/useAsync';
import { useIntl } from '@/i18n/IntlProvider';
import { formatDateTime } from '@/lib/format';

type SecurityResponse = {
  status?: string;
  panels?: Record<string, unknown>;
  checked_at?: string;
};

type PanelDef = {
  key: string;
  labelKey: string;
  icon: LucideIcon;
  warning: boolean;
};

// `warning: true` fields turn amber/red when non-zero.
const PANELS: PanelDef[] = [
  { key: 'failed_logins_24h', labelKey: 'failedLogins24h', icon: Lock, warning: true },
  { key: 'failed_logins_1h', labelKey: 'failedLogins1h', icon: Lock, warning: true },
  { key: 'locked_users', labelKey: 'lockedUsers', icon: UserX, warning: true },
  { key: 'suspicious_ips', labelKey: 'suspiciousIps', icon: Fingerprint, warning: true },
  { key: 'api_action_failures_1h', labelKey: 'apiActionFailures1h', icon: AlertTriangle, warning: true },
  { key: 'critical_queue_failures_24h', labelKey: 'criticalQueueFailures24h', icon: ShieldAlert, warning: true },
  { key: 'admins_without_mfa', labelKey: 'adminsWithoutMfa', icon: ShieldAlert, warning: true },
  { key: 'credentials_expiring_7d', labelKey: 'credentialsExpiring7d', icon: KeyRound, warning: true },
];

function statusTone(status?: string): { tone: 'success' | 'warning' | 'danger'; kind: string } {
  if (status === 'critical') return { tone: 'danger', kind: 'critical' };
  if (status === 'warning') return { tone: 'warning', kind: 'warning' };
  return { tone: 'success', kind: 'ok' };
}

export default function SecurityDashboardPage() {
  const { t, locale } = useIntl();
  const dateLocale = locale === 'en' ? 'en-GB' : locale === 'de' ? 'de-DE' : 'nl-NL';

  const security = useQuery([], () =>
    adminHealthService.security() as Promise<SecurityResponse>
  );

  const data = security.data;
  const panels = (data?.panels ?? {}) as Record<string, unknown>;
  const status = statusTone(data?.status);
  const suspiciousDetails = Array.isArray(panels.suspicious_ip_details)
    ? (panels.suspicious_ip_details as unknown[])
    : [];

  const toNumber = (v: unknown): number => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  return (
    <>
      <AdminPageHeader
        title={t('adminNew.security.title')}
        subtitle={t('adminNew.security.subtitle')}
        rightSlot={
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<RefreshCw className="h-4 w-4" />}
            onClick={() => void security.refetch()}
          >
            {t('adminNew.security.refresh')}
          </Button>
        }
      />
      <AdminContent>
        {security.loading ? (
          <LoadingState label={t('adminNew.security.loading')} />
        ) : security.error ? (
          <ErrorState message={security.error} onRetry={() => void security.refetch()} />
        ) : data ? (
          <>
            <AdminSectionCard
              title={t('adminNew.security.statusTitle')}
              description={t('adminNew.security.statusSubtitle')}
              icon={ShieldCheck}
              action={
                <Badge tone={status.tone}>
                  {t(`adminNew.security.status.${status.kind}`)}
                </Badge>
              }
            >
              <div className="flex items-center gap-2 text-sm text-navy-500">
                <Clock className="h-4 w-4" />
                {t('adminNew.security.checkedAt', {
                  time: data.checked_at ? formatDateTime(data.checked_at, dateLocale) : '—',
                })}
              </div>
            </AdminSectionCard>

            <AdminMetricGrid>
              {PANELS.map((panel) => {
                const value = toNumber(panels[panel.key]);
                const isAlert = panel.warning && value > 0;
                const tone =
                  isAlert && data.status === 'critical'
                    ? 'danger'
                    : isAlert
                      ? 'warning'
                      : 'navy';
                return (
                  <AdminMetric
                    key={panel.key}
                    label={t(`adminNew.security.panels.${panel.labelKey}`)}
                    value={value}
                    icon={panel.icon}
                    tone={tone}
                  />
                );
              })}
            </AdminMetricGrid>

            <AdminSectionCard
              title={t('adminNew.security.suspiciousTitle')}
              description={t('adminNew.security.suspiciousSubtitle')}
              icon={Fingerprint}
            >
              {suspiciousDetails.length ? (
                <ul className="space-y-2">
                  {suspiciousDetails.map((detail, idx) => {
                    const row = (detail ?? {}) as Record<string, unknown>;
                    const ip = String(row.ip ?? row.ip_address ?? row.address ?? '—');
                    const count = row.count ?? row.attempts ?? row.failed_logins;
                    const lastSeen = row.last_seen ?? row.last_attempt_at ?? row.last_attempt;
                    return (
                      <li
                        key={`${ip}-${idx}`}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-navy-100 bg-sand-50/50 px-4 py-2.5 text-sm"
                      >
                        <span className="font-mono font-medium text-navy-900">{ip}</span>
                        <span className="flex items-center gap-3 text-xs text-navy-500">
                          {count != null ? (
                            <Badge tone="warning">
                              {t('adminNew.security.attempts', { count: toNumber(count) })}
                            </Badge>
                          ) : null}
                          {lastSeen ? (
                            <span>{formatDateTime(String(lastSeen), dateLocale)}</span>
                          ) : null}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="text-sm text-navy-500">{t('adminNew.security.noSuspicious')}</div>
              )}
            </AdminSectionCard>
          </>
        ) : null}
      </AdminContent>
    </>
  );
}
