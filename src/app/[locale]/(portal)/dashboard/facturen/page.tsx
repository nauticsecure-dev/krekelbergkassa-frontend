'use client';

import * as React from 'react';
import {
  AlertCircle,
  CreditCard,
  Download,
  ExternalLink,
  FileText,
  Receipt,
} from 'lucide-react';
import { PortalPageHeader } from '@/components/portal/PortalShell';
import {
  PortalContent,
  PortalDetailGrid,
  PortalFilterBar,
  PortalFilterPill,
  PortalInteractiveRow,
  PortalModalBody,
  PortalModalFooter,
  PortalModalHeader,
  PortalSectionCard,
} from '@/components/portal/PortalUi';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { EmptyState, ErrorState, LoadingState } from '@/components/admin/DataState';
import { PaymentStatusBadge } from '@/components/admin/StatusBadge';
import { portalService } from '@/lib/services';
import { useQuery } from '@/lib/hooks/useAsync';
import { centsToEuro, formatCurrency, formatDate } from '@/lib/format';
import type { PortalInvoice } from '@/lib/api-types';
import { useIntl } from '@/i18n/IntlProvider';
import { useToast } from '@/components/ui/ToastProvider';

const STATUS_FILTERS = ['', 'open', 'paid', 'overdue', 'credited', 'cancelled'] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

export default function PortalInvoicesPage() {
  const { locale, t } = useIntl();
  const { push } = useToast();
  const dateLocale = locale === 'en' ? 'en-GB' : locale === 'de' ? 'de-DE' : 'nl-NL';
  const [status, setStatus] = React.useState<StatusFilter>('');
  const [selected, setSelected] = React.useState<PortalInvoice | null>(null);
  const [invoiceDetail, setInvoiceDetail] = React.useState<PortalInvoice | null>(null);
  const [detailLoading, setDetailLoading] = React.useState(false);
  const [payOpen, setPayOpen] = React.useState(false);
  const [payMethod, setPayMethod] = React.useState('ideal');
  const [paying, setPaying] = React.useState(false);

  const invoices = useQuery([status], () =>
    portalService.invoices({ status: status || undefined, per_page: 50 })
  );

  const openInvoice = async (invoice: PortalInvoice) => {
    setSelected(invoice);
    setInvoiceDetail(invoice);
    setDetailLoading(true);
    try {
      const full = await portalService.invoice(invoice.id);
      setInvoiceDetail(full);
    } catch {
      /* keep list row data */
    } finally {
      setDetailLoading(false);
    }
  };

  const rows = invoices.data?.data ?? [];
  const openBalance = rows.reduce((sum, inv) => sum + centsToEuro(inv.outstanding_cents), 0);
  const openCount = rows.filter((inv) => !String(inv.is_fully_paid).includes('true') && inv.status !== 'paid').length;
  const overdueCount = rows.filter((inv) => String(inv.is_overdue).includes('true')).length;

  const openPayLink = async (invoice: PortalInvoice) => {
    setPaying(true);
    try {
      const res = await portalService.payInvoice(invoice.id, {
        method: payMethod,
        redirect_url: typeof window !== 'undefined' ? window.location.href : undefined,
      });
      const url = res.checkout_url ?? res.payment_url ?? res.url;
      if (url) {
        window.open(url, '_blank', 'noopener,noreferrer');
        setPayOpen(false);
        push({ tone: 'success', title: t('adminNew.portal.invoices.payOpened') });
      } else {
        push({ tone: 'error', title: t('adminNew.portal.invoices.payFailed') });
      }
    } catch (err) {
      push({
        tone: 'error',
        title: t('adminNew.portal.invoices.payFailed'),
        message: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setPaying(false);
    }
  };

  const invoiceSourceLabel = (source: string) => {
    const key = `adminNew.invoices.source.${source}` as const;
    const label = t(key);
    return label === key ? source : label;
  };

  return (
    <>
      <PortalPageHeader
        title={t('adminNew.portal.invoices.title')}
        subtitle={t('adminNew.portal.invoices.subtitle')}
        stats={[
          {
            label: t('adminNew.portal.invoices.metricOpen'),
            value: openCount,
            icon: FileText,
            tone: 'marine',
            loading: invoices.loading,
          },
          {
            label: t('adminNew.portal.invoices.openBalance'),
            value: formatCurrency(openBalance, dateLocale),
            icon: Receipt,
            tone: openBalance > 0 ? 'gold' : 'success',
            loading: invoices.loading,
          },
          {
            label: t('adminNew.portal.invoices.metricOverdue'),
            value: overdueCount,
            icon: AlertCircle,
            tone: overdueCount > 0 ? 'danger' : 'success',
            loading: invoices.loading,
          },
          {
            label: t('adminNew.portal.invoices.metricTotal'),
            value: rows.length,
            icon: CreditCard,
            tone: 'navy',
            loading: invoices.loading,
          },
        ]}
      />

      <PortalContent>
        <PortalSectionCard
          title={t('adminNew.portal.invoices.title')}
          description={t('adminNew.portal.invoices.listOverview')}
          icon={FileText}
        >
        <PortalFilterBar className="mb-4">
          {STATUS_FILTERS.map((value) => (
            <PortalFilterPill key={value || 'all'} active={status === value} onClick={() => setStatus(value)}>
              {value
                ? t(`adminNew.status.${value === 'open' ? 'open' : value}`)
                : t('adminNew.portal.invoices.allStatuses')}
            </PortalFilterPill>
          ))}
        </PortalFilterBar>

        {invoices.loading ? (
          <LoadingState label={t('adminNew.portal.invoices.loading')} variant="list" />
        ) : null}

        {!invoices.loading && invoices.error ? (
          <ErrorState message={invoices.error} onRetry={() => void invoices.refetch()} />
        ) : null}

        {!invoices.loading && !invoices.error && rows.length === 0 ? (
          <EmptyState title={t('adminNew.portal.invoices.empty')} message={t('adminNew.portal.invoices.emptyMessage')} />
        ) : null}

        {!invoices.loading && !invoices.error && rows.length > 0 ? (
          <div className="space-y-2.5">
            {rows.map((invoice) => (
              <PortalInteractiveRow
                key={invoice.id}
                icon={FileText}
                tone={String(invoice.is_overdue).includes('true') ? 'danger' : 'marine'}
                title={invoice.invoice_number}
                subtitle={t('adminNew.portal.invoices.dueLabel', {
                  date: formatDate(invoice.due_date, dateLocale),
                })}
                meta={formatCurrency(Number(invoice.total_amount_euros), dateLocale)}
                trailing={
                  <div className="flex flex-wrap items-center gap-2">
                    <PaymentStatusBadge status={String(invoice.status)} />
                    {!String(invoice.is_fully_paid).includes('true') && invoice.status !== 'paid' ? (
                      <Button
                        variant="gold"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelected(invoice);
                          setPayOpen(true);
                        }}
                      >
                        {t('adminNew.portal.invoices.pay')}
                      </Button>
                    ) : null}
                  </div>
                }
                onClick={() => void openInvoice(invoice)}
              />
            ))}
          </div>
        ) : null}
        </PortalSectionCard>
      </PortalContent>

      <Modal
        open={!!selected && !payOpen}
        onClose={() => {
          setSelected(null);
          setInvoiceDetail(null);
        }}
        size="lg"
      >
        {invoiceDetail ? (
          <>
            <PortalModalHeader
              eyebrow={t('adminNew.portal.invoices.detailEyebrow')}
              title={invoiceDetail.invoice_number}
              subtitle={formatDate(invoiceDetail.created_at, dateLocale)}
            />
            <PortalModalBody>
              <div className="flex flex-wrap items-center gap-2">
                <PaymentStatusBadge status={String(invoiceDetail.status)} />
                <span className="text-sm font-semibold text-navy-900">
                  {formatCurrency(Number(invoiceDetail.total_amount_euros), dateLocale)}
                </span>
              </div>
              <PortalDetailGrid
                items={[
                  {
                    label: t('adminNew.customerDetail.dueDate'),
                    value: formatDate(invoiceDetail.due_date, dateLocale),
                  },
                  {
                    label: t('adminNew.portal.invoices.openBalance'),
                    value: formatCurrency(centsToEuro(invoiceDetail.outstanding_cents), dateLocale),
                  },
                  {
                    label: t('adminNew.invoices.columns.source'),
                    value: invoiceSourceLabel(invoiceDetail.source),
                  },
                  {
                    label: t('adminNew.portal.invoices.paidAt'),
                    value: invoiceDetail.paid_at
                      ? formatDate(invoiceDetail.paid_at, dateLocale)
                      : '—',
                  },
                ]}
              />
              {detailLoading ? (
                <LoadingState label={t('adminNew.invoiceDetail.loading')} variant="default" />
              ) : null}
              {(invoiceDetail.lines?.length ?? 0) > 0 ? (
                <div className="overflow-hidden rounded-xl border border-navy-100">
                  <div className="border-b border-navy-100 bg-sand-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-navy-500">
                    {t('adminNew.portal.invoices.lines')}
                  </div>
                  <div className="divide-y divide-navy-100">
                    {invoiceDetail.lines?.map((line) => (
                      <div key={line.id} className="flex items-center justify-between px-4 py-3 text-sm">
                        <span className="text-navy-700">{line.description}</span>
                        <span className="font-semibold text-navy-900">
                          {formatCurrency(line.line_total / 100, dateLocale)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </PortalModalBody>
            <PortalModalFooter>
              {invoiceDetail.pdf_url ? (
                <a
                  href={invoiceDetail.pdf_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg border border-navy-200 px-3 py-2 text-xs font-semibold text-navy-700 hover:bg-sand-50"
                >
                  <Download className="h-3.5 w-3.5" />
                  {t('adminNew.invoiceDetail.actions.openPdf')}
                </a>
              ) : null}
              {!String(invoiceDetail.is_fully_paid).includes('true') && invoiceDetail.status !== 'paid' ? (
                <Button variant="gold" leftIcon={<ExternalLink className="h-4 w-4" />} onClick={() => setPayOpen(true)}>
                  {t('adminNew.portal.invoices.pay')}
                </Button>
              ) : null}
              <Button variant="outline" onClick={() => setSelected(null)}>
                {t('adminNew.common.cancel')}
              </Button>
            </PortalModalFooter>
          </>
        ) : null}
      </Modal>

      <Modal open={payOpen} onClose={() => setPayOpen(false)} size="md">
        {selected ? (
          <>
            <PortalModalHeader
              title={t('adminNew.portal.invoices.payTitle')}
              subtitle={selected.invoice_number}
            />
            <PortalModalBody>
              <p className="text-sm text-navy-600">{t('adminNew.portal.invoices.paySubtitle')}</p>
              <div className="rounded-xl border border-navy-100 bg-sand-50/60 p-4">
                <div className="text-xs text-navy-500">{t('adminNew.portal.invoices.amountDue')}</div>
                <div className="text-2xl font-semibold text-navy-900">
                  {formatCurrency(centsToEuro(selected.outstanding_cents), dateLocale)}
                </div>
              </div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-navy-400">
                {t('adminNew.portal.invoices.paymentMethod')}
              </label>
              <select
                className="input-base w-full"
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value)}
              >
                <option value="ideal">iDEAL</option>
                <option value="creditcard">{t('adminNew.kassa.payment.creditcard')}</option>
                <option value="bancontact">Bancontact</option>
                <option value="banktransfer">{t('adminNew.portal.invoices.bankTransfer')}</option>
              </select>
            </PortalModalBody>
            <PortalModalFooter>
              <Button variant="outline" onClick={() => setPayOpen(false)}>
                {t('adminNew.common.cancel')}
              </Button>
              <Button
                variant="gold"
                disabled={paying}
                leftIcon={<ExternalLink className="h-4 w-4" />}
                onClick={() => void openPayLink(selected)}
              >
                {paying ? t('adminNew.kassa.processing') : t('adminNew.portal.invoices.continuePay')}
              </Button>
            </PortalModalFooter>
          </>
        ) : null}
      </Modal>
    </>
  );
}
