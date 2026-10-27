'use client';

import Link from 'next/link';
import { Activity } from 'lucide-react';
import { AdminSectionCard } from './AdminUi';
import { useAuth } from '@/lib/auth-context';
import { usePermission } from '@/lib/permissions';
import { useQuery } from '@/lib/hooks/useAsync';
import { api } from '@/lib/api';
import { useIntl } from '@/i18n/IntlProvider';

export function JourneyOpportunityCard() {
  const { user } = useAuth();
  const { can } = usePermission();
  const { t, locale } = useIntl();
  const allowed = user?.role === 'super_admin' && can('audit.view');
  const data = useQuery([allowed], () => api<{ summary: { failed_requests: number; abandoned_sessions: number } }>('/v1/admin/audit-logs/journeys', {
    query: { summary_only: 1, intent: 'crane_booking' },
  }), { immediate: allowed });
  if (!allowed) return null;
  return <AdminSectionCard title={t('journey.lost')} description={t('journey.intents.crane_booking')} icon={Activity}>
    {data.loading ? <p role="status" className="text-sm">{t('journey.loading')}</p> : data.error ? <p role="alert" className="text-sm text-rose-700">{data.error}</p> : <p className="text-sm">{data.data?.summary.failed_requests ?? 0} {t('journey.failedRequests')} · {data.data?.summary.abandoned_sessions ?? 0} {t('journey.abandonedSessions')}</p>}
    <Link href={`/${locale}/admin/audit`} className="mt-3 inline-block text-sm font-semibold text-marine-700 underline">{t('journey.title')} →</Link>
  </AdminSectionCard>;
}
