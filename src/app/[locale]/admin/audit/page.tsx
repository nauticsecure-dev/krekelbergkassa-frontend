'use client';

import * as React from 'react';
import { Search } from 'lucide-react';
import { AdminPageHeader } from '@/components/admin/AdminShell';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { LoadingState, EmptyState, ErrorState } from '@/components/admin/DataState';
import { Pagination } from '@/components/admin/Pagination';
import { auditService } from '@/lib/services';
import { useQuery } from '@/lib/hooks/useAsync';
import { useIntl } from '@/i18n/IntlProvider';

export default function AuditPage() {
  const { t } = useIntl();
  const [query, setQuery] = React.useState('');
  const [entityType, setEntityType] = React.useState('');
  const [page, setPage] = React.useState(1);

  const logs = useQuery([query, entityType, page], () =>
    auditService.logs({
      search: query || undefined,
      entity_type: entityType || undefined,
      page,
      per_page: 50,
    })
  );

  return (
    <>
      <AdminPageHeader
        title={t('adminNew.audit.title')}
        subtitle={t('adminNew.audit.subtitle')}
      />
      <div className="space-y-4 px-4 py-6 sm:px-6">
        <Card className="p-4">
          <div className="grid gap-3 lg:grid-cols-[1fr_220px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-400" />
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                placeholder={t('adminNew.audit.searchPlaceholder')}
                className="input-base pl-9"
              />
            </div>
            <select className="input-base" value={entityType} onChange={(e) => { setEntityType(e.target.value); setPage(1); }}>
              <option value="">{t('adminNew.audit.allEntities')}</option>
              <option value="invoice">{t('adminNew.audit.entity.invoice')}</option>
              <option value="customer">{t('adminNew.audit.entity.customer')}</option>
              <option value="stalling_contract">{t('adminNew.audit.entity.stalling')}</option>
              <option value="payment">{t('adminNew.audit.entity.payment')}</option>
              <option value="sync">Sync</option>
            </select>
          </div>
        </Card>

        <Card className="overflow-hidden">
          {logs.loading ? <LoadingState label={t('adminNew.audit.loading')} variant="table" /> : null}
          {!logs.loading && logs.error ? <ErrorState message={logs.error} onRetry={() => void logs.refetch()} /> : null}
          {!logs.loading && !logs.error && logs.data?.data.length === 0 ? <EmptyState title={t('adminNew.audit.empty')} /> : null}

          {!logs.loading && !logs.error && (logs.data?.data.length ?? 0) > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px] text-sm">
                  <thead className="bg-sand-50 text-left text-xs uppercase tracking-wide text-navy-500">
                    <tr>
                      <th className="px-4 py-3">{t('adminNew.audit.columns.time')}</th>
                      <th className="px-4 py-3">{t('adminNew.audit.columns.action')}</th>
                      <th className="px-4 py-3">{t('adminNew.audit.columns.entity')}</th>
                      <th className="px-4 py-3">{t('adminNew.audit.columns.actor')}</th>
                      <th className="px-4 py-3">IP</th>
                      <th className="px-4 py-3">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-navy-100">
                    {logs.data?.data.map((log) => (
                      <tr key={log.id} className="hover:bg-sand-50">
                        <td className="px-4 py-3 whitespace-nowrap">{new Date(log.created_at).toLocaleString()}</td>
                        <td className="px-4 py-3 font-medium text-navy-900">{log.action}</td>
                        <td className="px-4 py-3">
                          <Badge tone="navy">{log.entity_type}</Badge>
                          <div className="mt-1 text-xs text-navy-500">{log.entity_id ?? '-'}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div>{log.user?.name ?? log.actor_type}</div>
                          <div className="text-xs text-navy-500">{log.user?.email ?? '-'}</div>
                        </td>
                        <td className="px-4 py-3 text-xs">{log.ip_address ?? '-'}</td>
                        <td className="px-4 py-3 text-xs text-navy-500">{log.reason ?? '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between border-t border-navy-100 bg-sand-50/50 px-4 py-3 text-xs text-navy-500">
                <span>{t('adminNew.audit.events', { count: logs.data?.meta?.total ?? logs.data?.data.length ?? 0 })}</span>
                <Pagination meta={logs.data?.meta} onChange={setPage} />
              </div>
            </>
          ) : null}
        </Card>
      </div>
    </>
  );
}
