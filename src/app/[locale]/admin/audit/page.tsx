'use client';

import * as React from 'react';
import { Shield } from 'lucide-react';
import { AdminPageHeader } from '@/components/admin/AdminShell';
import {
  AdminContent,
  AdminSearchInput,
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
import { Badge } from '@/components/ui/Badge';
import { LoadingState, EmptyState, ErrorState } from '@/components/admin/DataState';
import { auditService } from '@/lib/services';
import { useQuery } from '@/lib/hooks/useAsync';
import { useIntl } from '@/i18n/IntlProvider';
import { formatDateTime } from '@/lib/format';

export default function AuditPage() {
  const { t, locale } = useIntl();
  const dateLocale = locale === 'en' ? 'en-GB' : locale === 'de' ? 'de-DE' : 'nl-NL';
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

  const rows = logs.data?.data ?? [];

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
            label: t('adminNew.audit.allEntities'),
            value: entityType || t('adminNew.audit.allEntities'),
            tone: 'navy',
          },
          {
            label: t('adminNew.audit.columns.action'),
            value: new Set(rows.map((l) => l.action)).size,
            tone: 'gold',
            loading: logs.loading,
          },
          {
            label: t('adminNew.audit.columns.actor'),
            value: new Set(rows.map((l) => l.user?.name ?? l.actor_type)).size,
            tone: 'success',
            loading: logs.loading,
          },
        ]}
      />

      <AdminContent>
        <AdminToolbar>
          <AdminSearchInput
            value={query}
            onChange={(value) => {
              setQuery(value);
              setPage(1);
            }}
            placeholder={t('adminNew.audit.searchPlaceholder')}
          />
          <AdminSelect
            value={entityType}
            onChange={(value) => {
              setEntityType(value);
              setPage(1);
            }}
          >
            <option value="">{t('adminNew.audit.allEntities')}</option>
            <option value="invoice">{t('adminNew.audit.entity.invoice')}</option>
            <option value="customer">{t('adminNew.audit.entity.customer')}</option>
            <option value="stalling_contract">{t('adminNew.audit.entity.stalling')}</option>
            <option value="payment">{t('adminNew.audit.entity.payment')}</option>
            <option value="sync">{t('adminNew.sidebar.sync')}</option>
          </AdminSelect>
        </AdminToolbar>

        <AdminTableCard
          footer={
            rows.length > 0 ? (
              <AdminTableFooter
                summary={t('adminNew.audit.events', {
                  count: logs.data?.meta?.total ?? rows.length,
                })}
                meta={logs.data?.meta}
                onPageChange={setPage}
              />
            ) : undefined
          }
        >
          {logs.loading ? <LoadingState label={t('adminNew.audit.loading')} variant="table" /> : null}
          {!logs.loading && logs.error ? (
            <ErrorState message={logs.error} onRetry={() => void logs.refetch()} />
          ) : null}
          {!logs.loading && !logs.error && rows.length === 0 ? (
            <EmptyState title={t('adminNew.audit.empty')} />
          ) : null}

          {!logs.loading && !logs.error && rows.length > 0 ? (
            <AdminTable minWidth={980}>
              <AdminTableHead>
                <tr>
                  <AdminTableHeaderCell>{t('adminNew.audit.columns.time')}</AdminTableHeaderCell>
                  <AdminTableHeaderCell>{t('adminNew.audit.columns.action')}</AdminTableHeaderCell>
                  <AdminTableHeaderCell>{t('adminNew.audit.columns.entity')}</AdminTableHeaderCell>
                  <AdminTableHeaderCell>{t('adminNew.audit.columns.actor')}</AdminTableHeaderCell>
                  <AdminTableHeaderCell>IP</AdminTableHeaderCell>
                  <AdminTableHeaderCell>Reason</AdminTableHeaderCell>
                </tr>
              </AdminTableHead>
              <tbody>
                {rows.map((log) => (
                  <AdminTableRow key={log.id}>
                    <AdminTableCell className="whitespace-nowrap">
                      {formatDateTime(log.created_at, dateLocale)}
                    </AdminTableCell>
                    <AdminTableCell className="font-medium text-navy-900">{log.action}</AdminTableCell>
                    <AdminTableCell>
                      <Badge tone="navy">{log.entity_type}</Badge>
                      <div className="mt-1 text-xs text-navy-500">{log.entity_id ?? '—'}</div>
                    </AdminTableCell>
                    <AdminTableCell>
                      <div>{log.user?.name ?? log.actor_type}</div>
                      <div className="text-xs text-navy-500">{log.user?.email ?? '—'}</div>
                    </AdminTableCell>
                    <AdminTableCell className="text-xs">{log.ip_address ?? '—'}</AdminTableCell>
                    <AdminTableCell className="text-xs text-navy-500">{log.reason ?? '—'}</AdminTableCell>
                  </AdminTableRow>
                ))}
              </tbody>
            </AdminTable>
          ) : null}
        </AdminTableCard>
      </AdminContent>
    </>
  );
}
