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
  PortalSectionCard,
} from '@/components/portal/PortalUi';
import { Button } from '@/components/ui/Button';
import { EmptyState, ErrorState, LoadingState } from '@/components/admin/DataState';
import { PaymentStatusBadge } from '@/components/admin/StatusBadge';
import { portalService } from '@/lib/services';
import { useQuery } from '@/lib/hooks/useAsync';
import { formatDate } from '@/lib/format';
import { useIntl } from '@/i18n/IntlProvider';
import type { PortalInvoice } from '@/lib/api-types';

type DocRow = {
  id: string;
  title: string;
  subtitle: string;
  date?: string;
  status?: string;
  pdfUrl: string;
  invoiceId?: string;
};

function collectDocuments(invoices: PortalInvoice[]): DocRow[] {
  const rows: DocRow[] = [];
  const seen = new Set<string>();

  const push = (row: DocRow) => {
    const key = `${row.id}-${row.pdfUrl}`;
    if (seen.has(key)) return;
    seen.add(key);
    rows.push(row);
  };

  for (const inv of invoices) {
    const docs = inv.documents ?? [];
    if (docs.length) {
      for (const doc of docs) {
        const pdfUrl = doc.pdf_url ?? doc.open_url ?? doc.download_url ?? '';
        if (!pdfUrl) continue;
        push({
          id: doc.invoice_id ?? `${inv.id}-${doc.type ?? 'doc'}`,
          title: doc.invoice_number ?? doc.label ?? inv.invoice_number,
          subtitle: doc.label ?? doc.type ?? 'PDF',
          date: inv.created_at,
          status: inv.status,
          pdfUrl,
          invoiceId: doc.invoice_id ?? inv.id,
        });
      }
      continue;
    }

    if (inv.pdf_url) {
      push({
        id: inv.id,
        title: inv.invoice_number,
        subtitle: 'invoice',
        date: inv.created_at,
        status: inv.status,
        pdfUrl: inv.pdf?.open_url ?? inv.pdf_url,
        invoiceId: inv.id,
      });
    }

    for (const cn of inv.credit_notes ?? []) {
      if (!cn.pdf_url) continue;
      push({
        id: cn.id ?? `${inv.id}-cn`,
        title: cn.invoice_number ?? 'Credit note',
        subtitle: 'credit_note',
        date: inv.created_at,
        status: cn.status,
        pdfUrl: cn.pdf_url,
        invoiceId: cn.id,
      });
    }
  }

  return rows.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));
}

export default function PortalDocumentsPage() {
  const { t, locale } = useIntl();
  const dateLocale = locale === 'en' ? 'en-GB' : locale === 'de' ? 'de-DE' : 'nl-NL';

  const invoices = useQuery([], () => portalService.invoices({ per_page: 100 }));
  const documents = collectDocuments(invoices.data?.data ?? []);

  const docLabel = (type: string) => {
    if (type === 'credit_note') return t('adminNew.portal.documents.creditNotePdf');
    if (type === 'invoice') return t('adminNew.portal.documents.invoicePdf');
    return type;
  };

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
            value: documents.filter((d) => d.subtitle === 'invoice').length,
            icon: FileText,
            tone: 'navy',
            loading: invoices.loading,
          },
          {
            label: t('adminNew.portal.documents.metricCreditNotes'),
            value: documents.filter((d) => d.subtitle === 'credit_note').length,
            icon: FileText,
            tone: 'gold',
            loading: invoices.loading,
          },
          {
            label: t('adminNew.portal.documents.metricLatest'),
            value: documents[0]?.date
              ? formatDate(documents[0].date, dateLocale)
              : '—',
            icon: Download,
            tone: 'success',
            loading: invoices.loading,
          },
        ]}
      />

      <PortalContent>
        <PortalSectionCard
          title={t('adminNew.portal.documents.title')}
          description={t('adminNew.portal.documents.listOverview')}
          icon={FolderOpen}
        >
        {invoices.loading ? (
          <LoadingState label={t('adminNew.portal.documents.loading')} variant="list" />
        ) : null}

        {!invoices.loading && invoices.error ? (
          <ErrorState message={invoices.error} onRetry={() => void invoices.refetch()} />
        ) : null}

        {!invoices.loading && !invoices.error && documents.length === 0 ? (
          <EmptyState
            title={t('adminNew.portal.documents.empty')}
            message={t('adminNew.portal.documents.emptyMessage')}
          />
        ) : null}

        {!invoices.loading && !invoices.error && documents.length > 0 ? (
          <div className="space-y-2.5">
            {documents.map((doc) => (
              <PortalInteractiveRow
                key={`${doc.id}-${doc.pdfUrl}`}
                icon={FileText}
                tone={doc.subtitle === 'credit_note' ? 'gold' : 'navy'}
                title={doc.title}
                subtitle={docLabel(doc.subtitle)}
                meta={doc.date ? formatDate(doc.date, dateLocale) : undefined}
                trailing={
                  <div className="flex flex-wrap items-center gap-2">
                    {doc.status ? <PaymentStatusBadge status={String(doc.status)} /> : null}
                    {doc.invoiceId ? (
                      <Link
                        href={`/${locale}/dashboard/facturen`}
                        className="text-xs font-semibold text-marine-700 hover:text-marine-900"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {t('adminNew.portal.documents.viewInvoice')}
                      </Link>
                    ) : null}
                    <a
                      href={doc.pdfUrl}
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
                  if (doc.pdfUrl) window.open(doc.pdfUrl, '_blank', 'noopener,noreferrer');
                }}
              />
            ))}
          </div>
        ) : null}
        </PortalSectionCard>

        {!invoices.loading && !invoices.error && documents.length > 0 ? (
          <div className="surface-float rounded-2xl border border-navy-100/60 bg-gradient-to-tr from-sand-50 to-white p-5">
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
          </div>
        ) : null}
      </PortalContent>
    </>
  );
}
