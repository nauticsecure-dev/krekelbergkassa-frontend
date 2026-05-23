'use client';

import Link from 'next/link';
import {
  Download,
  ExternalLink,
  FileText,
  FolderOpen,
} from 'lucide-react';
import { PortalPageHeader } from '@/components/portal/PortalShell';
import {
  PortalContent,
  PortalInteractiveRow,
} from '@/components/portal/PortalUi';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState, ErrorState, LoadingState } from '@/components/admin/DataState';
import { PaymentStatusBadge } from '@/components/admin/StatusBadge';
import { portalService } from '@/lib/services';
import { useQuery } from '@/lib/hooks/useAsync';
import { formatDate } from '@/lib/format';
import { useIntl } from '@/i18n/IntlProvider';

export default function PortalDocumentsPage() {
  const { t, locale } = useIntl();
  const dateLocale = locale === 'en' ? 'en-GB' : locale === 'de' ? 'de-DE' : 'nl-NL';

  const invoices = useQuery([], () => portalService.invoices({ per_page: 100 }));
  const documents = (invoices.data?.data ?? []).filter((inv) => inv.pdf_url);

  return (
    <>
      <PortalPageHeader
        title={t('adminNew.portal.documents.title')}
        subtitle={t('adminNew.portal.documents.subtitle')}
        stats={[
          {
            label: t('adminNew.portal.documents.metricTotal'),
            value: documents.length,
            icon: FolderOpen,
            tone: 'marine',
            loading: invoices.loading,
          },
          {
            label: t('adminNew.portal.documents.metricInvoices'),
            value: documents.length,
            icon: FileText,
            tone: 'navy',
            loading: invoices.loading,
          },
          {
            label: t('adminNew.portal.documents.metricLatest'),
            value: documents[0]?.created_at
              ? formatDate(documents[0].created_at, dateLocale)
              : '—',
            icon: Download,
            tone: 'gold',
            loading: invoices.loading,
          },
          {
            label: t('adminNew.portal.documents.metricFormats'),
            value: 'PDF',
            icon: FileText,
            tone: 'success',
          },
        ]}
      />

      <PortalContent>
        {invoices.loading ? (
          <Card className="overflow-hidden">
            <LoadingState label={t('adminNew.portal.documents.loading')} variant="list" />
          </Card>
        ) : null}

        {!invoices.loading && invoices.error ? (
          <Card>
            <ErrorState message={invoices.error} onRetry={() => void invoices.refetch()} />
          </Card>
        ) : null}

        {!invoices.loading && !invoices.error && documents.length === 0 ? (
          <Card>
            <EmptyState
              title={t('adminNew.portal.documents.empty')}
              message={t('adminNew.portal.documents.emptyMessage')}
            />
          </Card>
        ) : null}

        {!invoices.loading && !invoices.error && documents.length > 0 ? (
          <div className="space-y-2.5">
            {documents.map((doc) => (
              <PortalInteractiveRow
                key={doc.id}
                icon={FileText}
                tone="navy"
                title={doc.invoice_number}
                subtitle={t('adminNew.portal.documents.invoicePdf')}
                meta={formatDate(doc.created_at, dateLocale)}
                trailing={
                  <div className="flex flex-wrap items-center gap-2">
                    <PaymentStatusBadge status={String(doc.status)} />
                    <a
                      href={doc.pdf_url}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 rounded-lg border border-navy-200 px-3 py-2 text-xs font-semibold text-navy-700 hover:bg-sand-50"
                    >
                      <Download className="h-3.5 w-3.5" />
                      {t('adminNew.invoiceDetail.actions.openPdf')}
                    </a>
                  </div>
                }
                onClick={() => {
                  if (doc.pdf_url) window.open(doc.pdf_url, '_blank', 'noopener,noreferrer');
                }}
              />
            ))}
          </div>
        ) : null}

        {!invoices.loading && !invoices.error && documents.length > 0 ? (
          <Card className="bg-gradient-to-tr from-sand-50 to-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-navy-900">
                  {t('adminNew.portal.documents.helpTitle')}
                </div>
                <p className="mt-1 text-xs text-navy-500">{t('adminNew.portal.documents.helpText')}</p>
              </div>
              <Link href={`/${locale}/contact`}>
                <Button variant="outline" size="sm" leftIcon={<ExternalLink className="h-4 w-4" />}>
                  {t('adminNew.portal.documents.contactSupport')}
                </Button>
              </Link>
            </div>
          </Card>
        ) : null}
      </PortalContent>
    </>
  );
}
