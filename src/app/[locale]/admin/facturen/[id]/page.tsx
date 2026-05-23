'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { CreditCard, Mail, Printer, RefreshCw, Send, XCircle } from 'lucide-react';
import { AdminPageHeader } from '@/components/admin/AdminShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { LoadingState, ErrorState } from '@/components/admin/DataState';
import { InvoiceStatusBadge, PaymentStatusBadge } from '@/components/admin/StatusBadge';
import { invoicesService } from '@/lib/services';
import { useMutation, useQuery } from '@/lib/hooks/useAsync';
import { centsToEuro, formatCurrency, formatDate, formatDateTime } from '@/lib/format';
import { useIntl } from '@/i18n/IntlProvider';
import { useToast } from '@/components/ui/ToastProvider';

export default function InvoiceDetailPage() {
  const params = useParams<{ id: string }>();
  const invoiceId = params?.id;
  const { locale, t } = useIntl();
  const { push } = useToast();

  const [showReminder, setShowReminder] = React.useState(false);
  const [showMarkPaid, setShowMarkPaid] = React.useState(false);
  const [reminderSubject, setReminderSubject] = React.useState(
    t('adminNew.invoiceDetail.defaults.reminderSubject')
  );
  const [reminderBody, setReminderBody] = React.useState(
    t('adminNew.invoiceDetail.defaults.reminderBody')
  );
  const [paidMethod, setPaidMethod] = React.useState('pin');

  const data = useQuery([invoiceId], async () => {
    if (!invoiceId) throw new Error('Missing invoice id');
    const [invoice, reminders] = await Promise.all([
      invoicesService.get(invoiceId),
      invoicesService.reminders(invoiceId).catch(() => []),
    ]);
    return { invoice, reminders };
  });

  const sendInvoice = useMutation(() => invoicesService.send(invoiceId));
  const markPaid = useMutation((method: string) =>
    invoicesService.markPaid(invoiceId, { method })
  );
  const createPayment = useMutation(() =>
    invoicesService.createPayment(invoiceId, {
      method: 'ideal',
      redirect_url: typeof window !== 'undefined' ? window.location.href : undefined,
      locale: locale === 'en' ? 'en-GB' : 'nl-NL',
    })
  );
  const creditInvoice = useMutation(() => invoicesService.credit(invoiceId));
  const cancelInvoice = useMutation(() => invoicesService.cancel(invoiceId));
  const sendReminder = useMutation(() =>
    invoicesService.sendReminder(invoiceId, {
      channel: 'email',
      locale: locale === 'en' ? 'en-GB' : 'nl-NL',
      subject: reminderSubject,
      body: reminderBody,
    })
  );
  const generatePdf = useMutation(() => invoicesService.generatePdf(invoiceId, true));

  const refetch = async () => {
    await data.refetch();
  };

  const action = async (label: string, fn: () => Promise<unknown>) => {
    try {
      await fn();
      push({ tone: 'success', title: label });
      await refetch();
    } catch (err) {
      push({
        tone: 'error',
        title: t('adminNew.common.operationFailed'),
        message: err instanceof Error ? err.message : undefined,
      });
    }
  };

  const invoice = data.data?.invoice;

  return (
    <>
      <AdminPageHeader
        title={invoice?.invoice_number ?? t('adminNew.invoiceDetail.fallbackTitle')}
        subtitle={invoice?.customer?.name ?? t('adminNew.invoiceDetail.subtitle')}
        rightSlot={
          <>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Mail className="h-4 w-4" />}
              onClick={() =>
                void action(
                  t('adminNew.invoiceDetail.toasts.invoiceSent'),
                  () => sendInvoice.mutate()
                )
              }
            >
              {t('adminNew.invoiceDetail.actions.send')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<CreditCard className="h-4 w-4" />}
              onClick={() => setShowMarkPaid(true)}
            >
              {t('adminNew.invoiceDetail.actions.markPaid')}
            </Button>
            <Button
              variant="gold"
              size="sm"
              leftIcon={<Send className="h-4 w-4" />}
              onClick={() =>
                void action(
                  t('adminNew.invoiceDetail.toasts.paymentLinkCreated'),
                  async () => {
                    const response = await createPayment.mutate();
                    const url = response.checkout_url ?? response.url;
                    if (url) window.open(url, '_blank', 'noopener,noreferrer');
                  }
                )
              }
            >
              {t('adminNew.invoiceDetail.actions.mollieLink')}
            </Button>
          </>
        }
      />

      <div className="space-y-5 px-4 py-6 sm:px-6">
        {data.loading ? (
          <LoadingState label={t('adminNew.invoiceDetail.loading')} variant="detail" />
        ) : null}
        {!data.loading && data.error ? (
          <ErrorState message={data.error} onRetry={() => void refetch()} />
        ) : null}

        {!data.loading && invoice ? (
          <>
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <div className="font-semibold">
                {t('adminNew.invoiceDetail.legal.title')}
              </div>
              <div className="mt-1">{t('adminNew.invoiceDetail.legal.message')}</div>
            </div>

            <div className="grid gap-5 lg:grid-cols-3">
              <Card className="p-5 lg:col-span-2">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-navy-900">
                      {t('adminNew.invoiceDetail.overviewTitle')}
                    </div>
                    <div className="text-xs text-navy-500">
                      {t('adminNew.invoiceDetail.source')}: {invoice.source}
                    </div>
                  </div>
                  <InvoiceStatusBadge status={invoice.status} />
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <Meta
                    label={t('adminNew.invoiceDetail.meta.invoiceDate')}
                    value={formatDate(invoice.created_at)}
                  />
                  <Meta
                    label={t('adminNew.invoiceDetail.meta.dueDate')}
                    value={formatDate(invoice.due_date)}
                  />
                  <Meta
                    label={t('adminNew.invoiceDetail.meta.paidOn')}
                    value={formatDate(invoice.paid_at)}
                  />
                </div>

                <div className="mt-5 overflow-x-auto rounded-lg border border-navy-100">
                  <table className="w-full min-w-[640px] text-sm">
                    <thead className="bg-sand-50 text-left text-xs uppercase tracking-wide text-navy-500">
                      <tr>
                        <th className="px-4 py-3">{t('adminNew.invoiceDetail.columns.description')}</th>
                        <th className="px-4 py-3">{t('adminNew.invoiceDetail.columns.qty')}</th>
                        <th className="px-4 py-3">{t('adminNew.invoiceDetail.columns.unitExcl')}</th>
                        <th className="px-4 py-3">{t('adminNew.invoiceDetail.columns.vat')}</th>
                        <th className="px-4 py-3">{t('adminNew.invoiceDetail.columns.total')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-navy-100">
                      {(invoice.lines ?? []).map((line) => (
                        <tr key={line.id}>
                          <td className="px-4 py-3">{line.description}</td>
                          <td className="px-4 py-3">{line.quantity}</td>
                          <td className="px-4 py-3">
                            {formatCurrency(
                              centsToEuro(line.unit_price),
                              locale === 'en' ? 'en-GB' : 'nl-NL'
                            )}
                          </td>
                          <td className="px-4 py-3">{line.vat_rate}%</td>
                          <td className="px-4 py-3 font-semibold text-navy-900">
                            {formatCurrency(
                              centsToEuro(line.line_total),
                              locale === 'en' ? 'en-GB' : 'nl-NL'
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              <Card className="space-y-4 p-5">
                <div>
                  <div className="text-xs uppercase tracking-widest text-navy-500">
                    {t('adminNew.invoiceDetail.customerSnapshot')}
                  </div>
                  <div className="mt-1 text-sm font-semibold text-navy-900">
                    {invoice.customer?.name ?? '-'}
                  </div>
                  <div className="text-xs text-navy-500">{invoice.customer?.email ?? '-'}</div>
                </div>

                <div className="space-y-2 rounded-lg border border-navy-100 p-3 text-sm">
                  <Summary
                    label={t('adminNew.invoiceDetail.summary.subtotal')}
                    value={formatCurrency(
                      invoice.subtotal_euros,
                      locale === 'en' ? 'en-GB' : 'nl-NL'
                    )}
                  />
                  <Summary
                    label={t('adminNew.invoiceDetail.summary.vat')}
                    value={formatCurrency(
                      invoice.vat_amount_euros,
                      locale === 'en' ? 'en-GB' : 'nl-NL'
                    )}
                  />
                  <Summary
                    label={t('adminNew.invoiceDetail.summary.total')}
                    value={formatCurrency(
                      invoice.total_amount_euros,
                      locale === 'en' ? 'en-GB' : 'nl-NL'
                    )}
                    strong
                  />
                  <Summary
                    label={t('adminNew.invoiceDetail.summary.outstanding')}
                    value={formatCurrency(
                      centsToEuro(invoice.outstanding_cents),
                      locale === 'en' ? 'en-GB' : 'nl-NL'
                    )}
                    strong
                  />
                </div>

                <div className="space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    fullWidth
                    leftIcon={<Printer className="h-4 w-4" />}
                    onClick={() =>
                      void action(
                        t('adminNew.invoiceDetail.toasts.pdfRegenerated'),
                        () => generatePdf.mutate()
                      )
                    }
                  >
                    {t('adminNew.invoiceDetail.actions.regeneratePdf')}
                  </Button>
                  {invoice.pdf_url ? (
                    <a
                      href={invoice.pdf_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex w-full items-center justify-center rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm font-medium text-navy-800 hover:bg-sand-50"
                    >
                      {t('adminNew.invoiceDetail.actions.openPdf')}
                    </a>
                  ) : null}
                  <Button
                    variant="outline"
                    size="sm"
                    fullWidth
                    leftIcon={<RefreshCw className="h-4 w-4" />}
                    onClick={() => setShowReminder(true)}
                  >
                    {t('adminNew.invoiceDetail.actions.sendReminder')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    fullWidth
                    onClick={() =>
                      void action(
                        t('adminNew.invoiceDetail.toasts.credited'),
                        () => creditInvoice.mutate()
                      )
                    }
                  >
                    {t('adminNew.invoiceDetail.actions.credit')}
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    fullWidth
                    leftIcon={<XCircle className="h-4 w-4" />}
                    onClick={() =>
                      void action(
                        t('adminNew.invoiceDetail.toasts.cancelled'),
                        () => cancelInvoice.mutate()
                      )
                    }
                  >
                    {t('adminNew.common.cancel')}
                  </Button>
                </div>
              </Card>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <Card className="overflow-hidden">
                <div className="border-b border-navy-100 px-4 py-3 text-sm font-semibold text-navy-900">
                  {t('adminNew.invoiceDetail.paymentTimeline')}
                </div>
                <div className="divide-y divide-navy-100">
                  {(invoice.payments ?? []).length ? (
                    (invoice.payments ?? []).map((payment) => (
                      <div key={payment.id} className="flex items-center justify-between px-4 py-3 text-sm">
                        <div>
                          <div className="font-medium text-navy-900">
                            {payment.method ?? payment.provider}
                          </div>
                          <div className="text-xs text-navy-500">
                            {formatDateTime(payment.created_at)}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="font-semibold text-navy-900">
                            {formatCurrency(
                              payment.amount_euros,
                              locale === 'en' ? 'en-GB' : 'nl-NL'
                            )}
                          </div>
                          <PaymentStatusBadge status={payment.status} />
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="px-4 py-6 text-sm text-navy-500">
                      {t('adminNew.invoiceDetail.noPayments')}
                    </div>
                  )}
                </div>
              </Card>

              <Card className="overflow-hidden">
                <div className="border-b border-navy-100 px-4 py-3 text-sm font-semibold text-navy-900">
                  {t('adminNew.invoiceDetail.reminderHistory')}
                </div>
                <div className="divide-y divide-navy-100">
                  {(data.data?.reminders ?? []).length ? (
                    data.data?.reminders.map((reminder) => (
                      <div key={reminder.id} className="px-4 py-3 text-sm">
                        <div className="flex items-center justify-between">
                          <div className="font-medium text-navy-900">
                            {reminder.subject ?? reminder.type}
                          </div>
                          <span className="text-xs text-navy-500">
                            {formatDateTime(reminder.created_at)}
                          </span>
                        </div>
                        <div className="mt-1 text-xs text-navy-500">
                          {t('adminNew.invoiceDetail.channel')}: {reminder.channel} ·{' '}
                          {t('adminNew.invoiceDetail.status')}: {reminder.status}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="px-4 py-6 text-sm text-navy-500">
                      {t('adminNew.invoiceDetail.noReminders')}
                    </div>
                  )}
                </div>
              </Card>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <Card className="p-5">
                <div className="text-sm font-semibold text-navy-900">
                  {t('adminNew.invoiceDetail.customerSnapshot')}
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <SnapshotRow
                    label={t('adminNew.common.name')}
                    value={resolveSnapshot(invoice.customer_snapshot, ['name'])}
                  />
                  <SnapshotRow
                    label={t('adminNew.common.email')}
                    value={resolveSnapshot(invoice.customer_snapshot, ['email'])}
                  />
                  <SnapshotRow
                    label={t('adminNew.common.phone')}
                    value={resolveSnapshot(invoice.customer_snapshot, ['phone'])}
                  />
                  <SnapshotRow
                    label={t('adminNew.invoiceDetail.vatNumber')}
                    value={resolveSnapshot(invoice.customer_snapshot, ['vat_number'])}
                  />
                </div>
              </Card>

              <Card className="p-5">
                <div className="text-sm font-semibold text-navy-900">
                  {t('adminNew.invoiceDetail.companySnapshot')}
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <SnapshotRow
                    label={t('adminNew.common.name')}
                    value={resolveSnapshot(invoice.company_snapshot, ['name'])}
                  />
                  <SnapshotRow
                    label={t('adminNew.common.email')}
                    value={resolveSnapshot(invoice.company_snapshot, ['email'])}
                  />
                  <SnapshotRow
                    label={t('adminNew.common.phone')}
                    value={resolveSnapshot(invoice.company_snapshot, ['phone'])}
                  />
                  <SnapshotRow
                    label={t('adminNew.invoiceDetail.iban')}
                    value={resolveSnapshot(invoice.company_snapshot, ['iban'])}
                  />
                </div>
              </Card>
            </div>

            <div className="text-sm text-navy-600">
              <Link
                href={`/${locale}/admin/facturen`}
                className="font-semibold text-marine-700 hover:text-marine-800"
              >
                {t('adminNew.invoiceDetail.back')}
              </Link>
            </div>
          </>
        ) : null}
      </div>

      <Modal open={showReminder} onClose={() => setShowReminder(false)} size="lg">
        <form
          className="p-6"
          onSubmit={(e) => {
            e.preventDefault();
            void action(t('adminNew.invoiceDetail.toasts.reminderSent'), async () => {
              await sendReminder.mutate();
              setShowReminder(false);
            });
          }}
        >
          <h2 className="text-lg font-semibold text-navy-900">
            {t('adminNew.invoiceDetail.reminderModal.title')}
          </h2>
          <div className="mt-4 space-y-3">
            <Input
              label={t('adminNew.invoiceDetail.reminderModal.subject')}
              value={reminderSubject}
              onChange={(e) => setReminderSubject(e.target.value)}
              required
            />
            <div>
              <label className="mb-1.5 block text-sm font-medium text-navy-800">
                {t('adminNew.invoiceDetail.reminderModal.message')}
              </label>
              <textarea
                className="input-base min-h-36"
                value={reminderBody}
                onChange={(e) => setReminderBody(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setShowReminder(false)}>
              {t('adminNew.common.cancel')}
            </Button>
            <Button type="submit" variant="gold">
              {t('adminNew.invoiceDetail.actions.send')}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={showMarkPaid} onClose={() => setShowMarkPaid(false)} size="md">
        <form
          className="p-6"
          onSubmit={(e) => {
            e.preventDefault();
            void action(t('adminNew.invoiceDetail.toasts.markedPaid'), async () => {
              await markPaid.mutate(paidMethod);
              setShowMarkPaid(false);
            });
          }}
        >
          <h2 className="text-lg font-semibold text-navy-900">
            {t('adminNew.invoiceDetail.markPaidModal.title')}
          </h2>
          <div className="mt-4">
            <label className="mb-1.5 block text-sm font-medium text-navy-800">
              {t('adminNew.invoiceDetail.markPaidModal.method')}
            </label>
            <select
              className="input-base"
              value={paidMethod}
              onChange={(e) => setPaidMethod(e.target.value)}
            >
              <option value="cash">{t('adminNew.invoiceDetail.paymentMethods.cash')}</option>
              <option value="pin">{t('adminNew.invoiceDetail.paymentMethods.pin')}</option>
              <option value="banktransfer">
                {t('adminNew.invoiceDetail.paymentMethods.banktransfer')}
              </option>
              <option value="manual">{t('adminNew.invoiceDetail.paymentMethods.manual')}</option>
            </select>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setShowMarkPaid(false)}>
              {t('adminNew.common.cancel')}
            </Button>
            <Button type="submit" variant="gold">
              {t('adminNew.common.save')}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-navy-100 px-3 py-2">
      <div className="text-xs text-navy-500">{label}</div>
      <div className="text-sm font-medium text-navy-900">{value}</div>
    </div>
  );
}

function Summary({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-navy-600">{label}</span>
      <span className={strong ? 'font-semibold text-navy-900' : 'text-navy-800'}>{value}</span>
    </div>
  );
}

function SnapshotRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-navy-100 px-3 py-2">
      <div className="text-xs text-navy-500">{label}</div>
      <div className="text-sm font-medium text-navy-900">{value || '-'}</div>
    </div>
  );
}

function resolveSnapshot(
  snapshot: Record<string, unknown> | null | undefined,
  keys: string[]
): string {
  if (!snapshot) return '-';
  for (const key of keys) {
    const val = snapshot[key];
    if (typeof val === 'string' && val.trim()) return val;
  }
  return '-';
}
