'use client';

import * as React from 'react';
import { Download, ExternalLink } from 'lucide-react';
import { PortalPageHeader } from '@/components/portal/PortalShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState, ErrorState, LoadingState } from '@/components/admin/DataState';
import { portalService } from '@/lib/services';
import { useQuery } from '@/lib/hooks/useAsync';
import { centsToEuro, formatCurrency, formatDate } from '@/lib/format';
import { PaymentStatusBadge } from '@/components/admin/StatusBadge';
import { useIntl } from '@/i18n/IntlProvider';

export default function PortalInvoicesPage() {
  const { locale, t } = useIntl();
  const [status, setStatus] = React.useState('');

  const invoices = useQuery([status], () => portalService.invoices({ status: status || undefined, per_page: 50 }));

  const openPayLink = async (id: string) => {
    const res = await portalService.payInvoice(id, {
      method: 'ideal',
      redirect_url: typeof window !== 'undefined' ? window.location.href : undefined,
    });
    const url = res.checkout_url ?? res.payment_url ?? res.url;
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <>
      <PortalPageHeader
        title={t('adminNew.portal.invoices.title')}
        subtitle={t('adminNew.portal.invoices.subtitle')}
      />
      <div className="space-y-4 px-4 py-6 sm:px-6">
        <Card className="p-4">
          <select className="input-base max-w-xs" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">{t('adminNew.portal.invoices.allStatuses')}</option>
            <option value="open">Open</option>
            <option value="paid">Betaald</option>
            <option value="overdue">Achterstallig</option>
            <option value="credited">Gecrediteerd</option>
            <option value="cancelled">Geannuleerd</option>
          </select>
        </Card>

        <Card className="overflow-hidden">
          {invoices.loading ? <LoadingState label={t('adminNew.portal.invoices.loading')} variant="list" /> : null}
          {!invoices.loading && invoices.error ? <ErrorState message={invoices.error} onRetry={() => void invoices.refetch()} /> : null}
          {!invoices.loading && !invoices.error && invoices.data?.data.length === 0 ? <EmptyState title={t('adminNew.portal.invoices.empty')} /> : null}

          {!invoices.loading && !invoices.error && (invoices.data?.data.length ?? 0) > 0 ? (
            <div className="divide-y divide-navy-100">
              {invoices.data?.data.map((invoice) => (
                <div key={invoice.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <div>
                    <div className="text-sm font-semibold text-navy-900">{invoice.invoice_number}</div>
                    <div className="text-xs text-navy-500">{formatDate(invoice.created_at)} · vervalt {formatDate(invoice.due_date)}</div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-sm font-semibold text-navy-900">
                      {formatCurrency(Number(invoice.total_amount_euros), locale === 'en' ? 'en-GB' : 'nl-NL')}
                    </div>
                    <PaymentStatusBadge status={String(invoice.status)} />
                    <Button variant="outline" size="sm" leftIcon={<ExternalLink className="h-4 w-4" />} onClick={() => void openPayLink(invoice.id)}>
                      {t('adminNew.portal.invoices.pay')}
                    </Button>
                    {invoice.pdf_url ? (
                      <a href={invoice.pdf_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-navy-200 px-3 py-2 text-xs font-semibold text-navy-700 hover:bg-sand-50">
                        <Download className="h-3.5 w-3.5" /> PDF
                      </a>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </Card>

        <Card className="p-4 text-sm text-navy-600">
          {t('adminNew.portal.invoices.openBalance')}: <strong>{formatCurrency((invoices.data?.data ?? []).reduce((sum, inv) => sum + centsToEuro(inv.outstanding_cents), 0), locale === 'en' ? 'en-GB' : 'nl-NL')}</strong>
        </Card>
      </div>
    </>
  );
}
