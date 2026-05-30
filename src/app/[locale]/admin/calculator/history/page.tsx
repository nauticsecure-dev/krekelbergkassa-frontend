'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowLeft, Calculator } from 'lucide-react';
import { AdminPageHeader } from '@/components/admin/AdminShell';
import {
  AdminContent,
  AdminSectionCard,
  AdminTable,
  AdminTableCard,
  AdminTableCell,
  AdminTableFooter,
  AdminTableHead,
  AdminTableHeaderCell,
  AdminTableRow,
} from '@/components/admin/AdminUi';
import { Button } from '@/components/ui/Button';
import { EmptyState, LoadingState } from '@/components/admin/DataState';
import { useQuery } from '@/lib/hooks/useAsync';
import { pricingService } from '@/lib/services';
import { formatCurrency } from '@/lib/format';
import { useIntl } from '@/i18n/IntlProvider';

export default function CalculatorHistoryPage() {
  const { locale, t } = useIntl();
  const [page, setPage] = React.useState(1);
  const records = useQuery([page], () => pricingService.calculatorRecords({ page, per_page: 50 }));
  const rows = records.data?.data ?? [];
  const dateLocale = locale === 'en' ? 'en-GB' : 'nl-NL';

  return (
    <>
      <AdminPageHeader
        title={t('adminNew.calculator.history.title')}
        subtitle={t('adminNew.calculator.history.subtitle')}
        rightSlot={
          <Link href={`/${locale}/admin/calculator`}>
            <Button variant="outline" size="sm" leftIcon={<ArrowLeft className="h-4 w-4" />}>
              {t('adminNew.common.back')}
            </Button>
          </Link>
        }
      />
      <AdminContent>
        <AdminSectionCard title={t('adminNew.calculator.records.title')} icon={Calculator}>
          {records.loading ? <LoadingState label={t('adminNew.common.loading')} variant="table" /> : null}
          {!records.loading && rows.length === 0 ? (
            <EmptyState title={t('adminNew.calculator.records.empty')} message={t('adminNew.calculator.history.emptyMessage')} />
          ) : null}
          {!records.loading && rows.length > 0 ? (
            <AdminTableCard
              footer={
                <AdminTableFooter
                  summary={t('adminNew.calculator.records.title') + ` (${records.data?.meta?.total ?? rows.length})`}
                  meta={records.data?.meta}
                  onPageChange={setPage}
                />
              }
            >
              <AdminTable minWidth={800}>
                <AdminTableHead>
                  <tr>
                    <AdminTableHeaderCell>{t('adminNew.calculator.records.number')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{t('adminNew.calculator.records.date')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{t('adminNew.calculator.records.service')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{t('adminNew.calculator.records.total')}</AdminTableHeaderCell>
                  </tr>
                </AdminTableHead>
                <tbody>
                  {rows.map((rec) => (
                    <AdminTableRow key={String(rec.id)}>
                      <AdminTableCell className="font-semibold">{String(rec.number ?? rec.id)}</AdminTableCell>
                      <AdminTableCell>
                        {rec.created_at ? new Date(String(rec.created_at)).toLocaleDateString(dateLocale) : '—'}
                      </AdminTableCell>
                      <AdminTableCell>{String(rec.service_type ?? '—')}</AdminTableCell>
                      <AdminTableCell>
                        {formatCurrency(Number(rec.total_amount ?? 0) / 100, dateLocale)}
                      </AdminTableCell>
                    </AdminTableRow>
                  ))}
                </tbody>
              </AdminTable>
            </AdminTableCard>
          ) : null}
        </AdminSectionCard>
      </AdminContent>
    </>
  );
}
