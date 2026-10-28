'use client';

import { tEnum } from '@/i18n/admin-enums';
import { useState } from 'react';
import { Activity } from 'lucide-react';
import { AdminSectionCard } from './AdminUi';
import { Button } from '@/components/ui/Button';
import { useQuery } from '@/lib/hooks/useAsync';
import { usePermission } from '@/lib/permissions';
import { api } from '@/lib/api';
import { useIntl } from '@/i18n/IntlProvider';
import { formatDateTime, intlLocale } from '@/lib/format';

type JourneyEvent = {
  id: string; action: string; title: string; created_at: string; request_id?: string;
  url?: string; api_method?: string; api_endpoint?: string; http_status?: number;
  entity_id?: string; intent?: string; session_id?: string; after_data?: Record<string, unknown>;
};
type JourneyResponse = {
  data: Array<{ request_id: string; outcome: string; suspected_silent_failure: boolean; frontend_error_shown: boolean; events: JourneyEvent[] }>;
  meta: { current_page: number; last_page: number; total: number };
  activity: { data: JourneyEvent[]; current_page: number; last_page: number; total: number };
  summary: { funnel: Record<string, number>; conversion: number | null; failed_requests: number; abandoned_sessions: number;
    likely_intent?: { intent: string; confidence: string; basis: string } | null;
    abandoned: Array<{ session_id: string; last_activity: string }> };
};

export function JourneyPanel({ customerId }: { customerId?: string }) {
  const { t, locale } = useIntl();
  const { can } = usePermission();
  const allowed = can('audit.view');
  const [filters, setFilters] = useState({ search: '', intent: customerId ? '' : 'crane_booking', api_endpoint: '', url: '', event_type: '', http_status_min: '', from: '', to: '', errors_only: false, abandoned_only: false });
  const [page, setPage] = useState(1);
  const [activityPage, setActivityPage] = useState(1);
  const [requestId, setRequestId] = useState<string>();
  const journey = useQuery([customerId, filters, page, activityPage, requestId, allowed], () => api<JourneyResponse>('/v1/admin/audit-logs/journeys', {
    query: { ...filters, customer_id: customerId, request_id: requestId, page, activity_page: activityPage, per_page: 20,
      errors_only: filters.errors_only ? 1 : undefined, abandoned_only: filters.abandoned_only ? 1 : undefined },
  }), { immediate: allowed });
  if (!allowed) return null;
  const result = journey.data;
  const update = (key: keyof typeof filters, value: string | boolean) => {
    setFilters((current) => ({ ...current, [key]: value })); setPage(1); setActivityPage(1); setRequestId(undefined);
  };
  const eventLabel = (event: JourneyEvent) => tEnum(t, 'journey.events', event.action.replace(/^frontend\./, '').replaceAll('.', '_'), { defaultValue: event.title });

  return <AdminSectionCard title={t('journey.title')} description={t('journey.description')} icon={Activity}>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <label className="text-xs">{t('journey.search')}<input className="mt-1 w-full rounded border p-2" value={filters.search} onChange={(e) => update('search', e.target.value)} /></label>
      <label className="text-xs">{t('journey.intent')}<select className="mt-1 w-full rounded border p-2" value={filters.intent} onChange={(e) => update('intent', e.target.value)}>
        {['', 'crane_booking', 'sell_boat', 'winter_storage', 'buy_boat'].map((intent) => <option key={intent} value={intent}>{tEnum(t, 'journey.intents', intent || 'all')}</option>)}
      </select></label>
      <label className="text-xs">{t('journey.endpoint')}<input className="mt-1 w-full rounded border p-2" value={filters.api_endpoint} onChange={(e) => update('api_endpoint', e.target.value)} /></label>
      <label className="text-xs">{t('journey.status')}<input type="number" min={100} max={599} className="mt-1 w-full rounded border p-2" value={filters.http_status_min} onChange={(e) => update('http_status_min', e.target.value)} /></label>
      <label className="text-xs">{t('journey.page')}<input className="mt-1 w-full rounded border p-2" value={filters.url} onChange={(e) => update('url', e.target.value)} /></label>
      <label className="text-xs">{t('journey.eventType')}<select className="mt-1 w-full rounded border p-2" value={filters.event_type} onChange={(e) => update('event_type', e.target.value)}>
        <option value="">{t('adminNew.common.all')}</option>
        {['page_view', 'booking_form_started', 'booking_submit_clicked', 'booking_failed', 'booking_submit_blocked', 'frontend_error_shown', 'photo_upload_failed', 'api_failed'].map((event) => <option key={event} value={`frontend.${event}`}>{tEnum(t, 'journey.events', event)}</option>)}
        <option value="appointment.created">{t('journey.events.appointment_created')}</option>
      </select></label>
      <label className="text-xs">{t('journey.from')}<input type="date" className="mt-1 w-full rounded border p-2" value={filters.from} onChange={(e) => update('from', e.target.value)} /></label>
      <label className="text-xs">{t('journey.to')}<input type="date" className="mt-1 w-full rounded border p-2" value={filters.to} onChange={(e) => update('to', e.target.value)} /></label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={filters.errors_only} onChange={(e) => update('errors_only', e.target.checked)} />{t('journey.errorsOnly')}</label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={filters.abandoned_only} onChange={(e) => update('abandoned_only', e.target.checked)} />{t('journey.abandonedOnly')}</label>
    </div>
    {journey.loading ? <p className="mt-4 text-sm" role="status">{t('journey.loading')}</p> : null}
    {journey.error ? <div className="mt-4 text-sm text-rose-700" role="alert">{journey.error} <Button size="sm" onClick={() => void journey.refetch().catch(() => undefined)}>{t('journey.retry')}</Button></div> : null}
    {result?.summary ? <>
      {result.summary.likely_intent ? <p className="mt-4 text-sm"><strong>{t('journey.likelyIntent')}</strong>: {tEnum(t, 'journey.intents', result.summary.likely_intent.intent, { defaultValue: result.summary.likely_intent.intent })} · {tEnum(t, 'journey.confidence', result.summary.likely_intent.confidence)} · {tEnum(t, 'journey.stages', result.summary.likely_intent.basis)}</p> : null}
      <div className="my-4 rounded-lg bg-sand-50 p-3 text-sm">
        <strong>{t('journey.lost')}</strong>: {result.summary.failed_requests} {t('journey.failedRequests')} · {result.summary.abandoned_sessions} {t('journey.abandonedSessions')}
        <p className="mt-1 text-xs text-navy-500">{t('journey.abandonmentRule')}</p>
      </div>
      {filters.intent === 'crane_booking' ? <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {Object.entries(result.summary.funnel).map(([stage, count]) => <div key={stage} className="rounded border border-navy-100 p-2 text-sm"><span className="text-navy-500">{tEnum(t, 'journey.stages', stage)}</span><strong className="block text-lg">{count}</strong></div>)}
        <p className="col-span-full text-xs text-navy-500">{t('journey.sessionCounts')} {result.summary.conversion == null ? '—' : `${(result.summary.conversion * 100).toFixed(1)}%`}</p>
      </div> : null}
      {requestId ? <Button size="sm" variant="outline" onClick={() => { setRequestId(undefined); setPage(1); setActivityPage(1); }}>{t('journey.clearRequest')}</Button> : null}
      <div className="mt-4 space-y-2">
        {result.data.map((request) => <details key={request.request_id} className="rounded-lg border border-navy-100 p-3 text-sm">
          <summary className="cursor-pointer break-words">{tEnum(t, 'journey.outcomes', request.outcome)} · {request.request_id}{request.suspected_silent_failure ? ` · ${t('journey.silent')}` : ''}</summary>
          <ol className="mt-3 space-y-2">{request.events.map((event) => <li key={event.id} className="break-words">
            <time className="text-xs text-navy-500">{formatDateTime(event.created_at, intlLocale(locale))}</time> · {eventLabel(event)}
            {event.api_endpoint ? <div className="text-xs">{event.api_method} {event.api_endpoint} {event.http_status ?? ''}</div> : null}
            {event.entity_id ? <div className="text-xs">{event.entity_id}</div> : null}
          </li>)}</ol>
        </details>)}
      </div>
      {result.meta.last_page > 1 ? <div className="mt-3 flex items-center gap-3"><Button size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>←</Button><span className="text-xs">{page} / {result.meta.last_page}</span><Button size="sm" disabled={page >= result.meta.last_page} onClick={() => setPage(page + 1)}>→</Button></div> : null}
      <h3 className="mb-2 mt-5 text-sm font-semibold">{t('journey.activity')}</h3>
      <ol className="space-y-3">{result.activity.data.map((event) => <li key={event.id} className="border-l-2 border-navy-100 pl-3 text-sm">
        <time className="text-xs text-navy-500">{formatDateTime(event.created_at, intlLocale(locale))}</time><div>{eventLabel(event)}</div>
        <div className="break-words text-xs text-navy-500">{event.url} {event.api_method} {event.api_endpoint} {event.http_status ?? ''}</div>
        {event.request_id ? <button className="break-all text-xs text-marine-700 underline" onClick={() => { setRequestId(event.request_id); setPage(1); setActivityPage(1); }}>{event.request_id}</button> : null}
      </li>)}</ol>
      {!result.activity.data.length ? <p className="mt-3 text-sm text-navy-500">{t('journey.empty')}</p> : null}
      {result.activity.last_page > 1 ? <div className="mt-3 flex items-center gap-3"><Button size="sm" disabled={activityPage <= 1} onClick={() => setActivityPage(activityPage - 1)}>←</Button><span className="text-xs">{activityPage} / {result.activity.last_page}</span><Button size="sm" disabled={activityPage >= result.activity.last_page} onClick={() => setActivityPage(activityPage + 1)}>→</Button></div> : null}
    </> : null}
  </AdminSectionCard>;
}
