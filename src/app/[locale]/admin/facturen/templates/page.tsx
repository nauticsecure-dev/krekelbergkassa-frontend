'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowLeft, Mail, Plus, ScanText } from 'lucide-react';
import { AdminPageHeader } from '@/components/admin/AdminShell';
import {
  AdminContent,
  AdminSectionCard,
  AdminStatusStrip,
  AdminTable,
  AdminTableCard,
  AdminTableCell,
  AdminTableHead,
  AdminTableHeaderCell,
  AdminTableRow,
} from '@/components/admin/AdminUi';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState, ErrorState, LoadingState } from '@/components/admin/DataState';
import { extractionTemplatesService, type ExtractionTemplate } from '@/lib/services';
import { companyInfo } from '@/lib/company';
import { useQuery } from '@/lib/hooks/useAsync';
import { formatDate } from '@/lib/format';
import { useIntl } from '@/i18n/IntlProvider';

export default function ExtractionTemplatesPage() {
  const { locale, t } = useIntl();
  const dateLocale = locale === 'en' ? 'en-GB' : locale === 'de' ? 'de-DE' : 'nl-NL';

  const templates = useQuery(['extraction-templates'], () =>
    extractionTemplatesService.list().catch(() => [])
  );
  const rows = (templates.data ?? []) as ExtractionTemplate[];

  // Email-import address: configurable convention based on the company domain.
  const importEmail = `facturen@${(companyInfo.email?.split('@')[1] ?? 'krekelbergnautic.nl')}`;

  return (
    <>
      <AdminPageHeader
        title={t('adminNew.templates.title')}
        subtitle={t('adminNew.templates.subtitle')}
        rightSlot={
          <div className="flex gap-2">
            <Link href={`/${locale}/admin/facturen/import`}>
              <Button variant="outline" size="sm" leftIcon={<ArrowLeft className="h-4 w-4" />}>
                {t('adminNew.invoiceImports.title')}
              </Button>
            </Link>
            <Link href={`/${locale}/admin/facturen/templates/editor`}>
              <Button variant="gold" size="sm" leftIcon={<Plus className="h-4 w-4" />}>
                {t('adminNew.templates.new')}
              </Button>
            </Link>
          </div>
        }
      />
      <AdminContent>
        <AdminSectionCard
          title={t('adminNew.templates.emailTitle')}
          description={t('adminNew.templates.emailSubtitle')}
          icon={Mail}
        >
          <div className="flex flex-wrap items-center gap-3">
            <AdminStatusStrip
              label={t('adminNew.templates.emailAddress')}
              value={importEmail}
              tone="marine"
            />
            <p className="flex-1 text-sm text-navy-500">{t('adminNew.templates.emailHint')}</p>
          </div>
        </AdminSectionCard>

        <AdminSectionCard
          title={t('adminNew.templates.listTitle')}
          description={t('adminNew.templates.listSubtitle')}
          icon={ScanText}
          className="mt-5"
        >
          <AdminTableCard>
            {templates.loading ? (
              <LoadingState label={t('adminNew.common.loading')} variant="table" />
            ) : templates.error ? (
              <ErrorState message={templates.error} onRetry={() => void templates.refetch()} />
            ) : rows.length === 0 ? (
              <EmptyState
                title={t('adminNew.templates.emptyTitle')}
                message={t('adminNew.templates.emptyMessage')}
              />
            ) : (
              <AdminTable minWidth={860}>
                <AdminTableHead>
                  <tr>
                    <AdminTableHeaderCell>{t('adminNew.templates.columns.name')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{t('adminNew.templates.columns.supplier')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{t('adminNew.templates.columns.zones')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{t('adminNew.templates.columns.usage')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{t('adminNew.templates.columns.confidence')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{t('adminNew.templates.columns.lastUsed')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell className="text-right">&nbsp;</AdminTableHeaderCell>
                  </tr>
                </AdminTableHead>
                <tbody>
                  {rows.map((tpl) => (
                    <AdminTableRow key={tpl.id}>
                      <AdminTableCell className="font-semibold text-navy-900">
                        {tpl.name}
                        {tpl.document_type ? (
                          <div className="text-xs text-navy-400">{tpl.document_type}</div>
                        ) : null}
                      </AdminTableCell>
                      <AdminTableCell className="text-sm text-navy-600">
                        {tpl.supplier_email ?? '—'}
                      </AdminTableCell>
                      <AdminTableCell>{tpl.field_zones?.length ?? 0}</AdminTableCell>
                      <AdminTableCell>
                        {tpl.usage_count ?? 0}
                        {typeof tpl.success_count === 'number' ? (
                          <span className="ml-1 text-xs text-emerald-600">
                            · {tpl.success_count} ✓
                          </span>
                        ) : null}
                      </AdminTableCell>
                      <AdminTableCell>
                        {tpl.average_confidence != null ? (
                          <Badge tone={tpl.average_confidence >= 80 ? 'success' : 'warning'}>
                            {Math.round(tpl.average_confidence)}%
                          </Badge>
                        ) : (
                          '—'
                        )}
                      </AdminTableCell>
                      <AdminTableCell className="whitespace-nowrap text-sm text-navy-600">
                        {tpl.last_used_at ? formatDate(tpl.last_used_at, dateLocale) : '—'}
                      </AdminTableCell>
                      <AdminTableCell className="text-right">
                        <Link href={`/${locale}/admin/facturen/templates/editor?id=${tpl.id}`}>
                          <Button variant="ghost" size="sm">
                            {t('adminNew.common.edit')}
                          </Button>
                        </Link>
                      </AdminTableCell>
                    </AdminTableRow>
                  ))}
                </tbody>
              </AdminTable>
            )}
          </AdminTableCard>
        </AdminSectionCard>
      </AdminContent>
    </>
  );
}
