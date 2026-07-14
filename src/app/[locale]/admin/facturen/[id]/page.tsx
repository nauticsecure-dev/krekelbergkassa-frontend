'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, CreditCard, Download, FileText, Mail, Printer, Receipt, RefreshCw, Send, User, Users, XCircle } from 'lucide-react';
import { AdminPageHeader } from '@/components/admin/AdminShell';
import {
  AdminContent,
  AdminDetailGrid,
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
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { LoadingState, ErrorState } from '@/components/admin/DataState';
import { AdminConfirmModal } from '@/components/admin/AdminConfirmModal';
import { InvoiceStatusBadge, PaymentStatusBadge } from '@/components/admin/StatusBadge';
import { invoicesService, productGroupsService } from '@/lib/services';
import { useMutation, useQuery } from '@/lib/hooks/useAsync';
import { centsToEuro, formatCurrency, formatDate, formatDateTime } from '@/lib/format';
import { useIntl } from '@/i18n/IntlProvider';
import { useToast } from '@/components/ui/ToastProvider';

export default function InvoiceDetailPage() {
  const params = useParams<{ id: string }>();
  const invoiceId = params?.id;
  const { locale, t } = useIntl();
  const { push, pushError } = useToast();

  const [showReminder, setShowReminder] = React.useState(false);
  const [showMarkPaid, setShowMarkPaid] = React.useState(false);
  const [confirmCancel, setConfirmCancel] = React.useState(false);
  const [showCredit, setShowCredit] = React.useState(false);
  const [creditMode, setCreditMode] = React.useState<'full' | 'partial'>('full');
  const [creditAmount, setCreditAmount] = React.useState('');
  const [creditReason, setCreditReason] = React.useState('');
  const [sendEmailCredit, setSendEmailCredit] = React.useState(true);
  const [creditResult, setCreditResult] = React.useState<{ id: string; invoice_number?: string; pdf_url?: string | null } | null>(null);
  const [pdfGenerating, setPdfGenerating] = React.useState(false);
  const [confirmSend, setConfirmSend] = React.useState(false);
  const [confirmMarkPaid, setConfirmMarkPaid] = React.useState(false);
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
  const groups = useQuery(['invoice-groups'], () => productGroupsService.list({ per_page: 100 }));
  const groupColorMap = React.useMemo(() => {
    const g = (groups.data as { data?: Array<Record<string, unknown>> })?.data
      ?? (Array.isArray(groups.data) ? (groups.data as Array<Record<string, unknown>>) : []);
    return Object.fromEntries(g.map((gr) => [String(gr.id), String(gr.color ?? '')]));
  }, [groups.data]);

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
  const creditInvoice = useMutation(
    (payload: { mode: 'full' | 'partial'; amount_cents?: number; reason: string; send_email?: boolean }) =>
      invoicesService.credit(invoiceId, payload)
  );
  const emailInvoice = useMutation(() =>
    invoicesService.email(invoiceId, { locale: locale === 'en' ? 'en-GB' : 'nl-NL' })
  );
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

  const pdfUrl = data.data?.invoice?.pdf_url ?? null;
  React.useEffect(() => {
    if (!pdfGenerating || pdfUrl) {
      if (pdfUrl) setPdfGenerating(false);
      return;
    }
    const timer = setInterval(() => void data.refetch(), 2000);
    return () => clearInterval(timer);
  }, [pdfGenerating, pdfUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  const refetch = async () => {
    await data.refetch();
  };

  const action = async (label: string, fn: () => Promise<unknown>) => {
    try {
      await fn();
      push({ tone: 'success', title: label });
      await refetch();
    } catch (err) {
      pushError(err, t('adminNew.common.operationFailed'));
    }
  };

  const invoice = data.data?.invoice;

  const onOpenCredit = () => {
    setCreditMode('full');
    setCreditAmount(
      invoice ? centsToEuro(invoice.outstanding_cents || 0).toFixed(2) : ''
    );
    setCreditReason('');
    setShowCredit(true);
  };

  const onSubmitCredit = (e: React.FormEvent) => {
    e.preventDefault();
    void action(t('adminNew.invoiceDetail.toasts.credited'), async () => {
      const amount_cents =
        creditMode === 'partial'
          ? Math.round(parseFloat(creditAmount.replace(',', '.') || '0') * 100)
          : undefined;
      const creditNote = await creditInvoice.mutate({
        mode: creditMode,
        amount_cents,
        reason: creditReason.trim(),
        send_email: sendEmailCredit,
      });
      setShowCredit(false);
      if (creditNote?.id) {
        setCreditResult({
          id: creditNote.id,
          invoice_number: (creditNote as unknown as Record<string, unknown>).invoice_number as string | undefined,
          pdf_url: creditNote.pdf_url,
        });
      }
    });
  };

  const printPdf = () => {
    if (!invoice?.pdf_url) return;
    const win = window.open(invoice.pdf_url, '_blank', 'noopener,noreferrer');
    if (win) win.addEventListener('load', () => win.print());
  };

  const downloadPdf = () =>
    action(t('adminNew.invoiceDetail.toasts.pdfDownloaded'), async () => {
      const blob = await invoicesService.getPdfDownload(invoiceId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${invoice?.invoice_number ?? 'invoice'}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    });

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
              onClick={() => setConfirmSend(true)}
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
        stats={[
          {
            label: t('adminNew.invoiceDetail.summary.total'),
            value: formatCurrency(
              invoice?.total_amount_euros ?? 0,
              locale === 'en' ? 'en-GB' : 'nl-NL'
            ),
            icon: Receipt,
            tone: 'navy',
            loading: data.loading,
          },
          {
            label: t('adminNew.invoiceDetail.summary.outstanding'),
            value: formatCurrency(
              centsToEuro(invoice?.outstanding_cents ?? 0),
              locale === 'en' ? 'en-GB' : 'nl-NL'
            ),
            icon: CreditCard,
            tone: (invoice?.outstanding_cents ?? 0) > 0 ? 'warning' : 'success',
            loading: data.loading,
          },
          {
            label: t('adminNew.invoiceDetail.paymentTimeline'),
            value: (invoice?.payments ?? []).length,
            icon: CreditCard,
            tone: 'marine',
            loading: data.loading,
          },
          {
            label: t('adminNew.invoiceDetail.reminderHistory'),
            value: (data.data?.reminders ?? []).length,
            icon: Mail,
            tone: 'gold',
            loading: data.loading,
          },
        ]}
      />

      <AdminContent>
        {data.loading ? (
          <LoadingState label={t('adminNew.invoiceDetail.loading')} variant="detail" />
        ) : null}
        {!data.loading && data.error ? (
          <ErrorState message={data.error} onRetry={() => void refetch()} />
        ) : null}

        {!data.loading && invoice ? (
          <>
            <AdminStatusStrip
              label={t('adminNew.invoiceDetail.legal.title')}
              value={t('adminNew.invoiceDetail.legal.message')}
              tone="warning"
            />

            {(() => {
              // Trello #79: link the original invoice ⇄ its credit notes.
              const inv = invoice as unknown as {
                credited_invoice?: { id?: string; invoice_number?: string } | null;
                credit_notes?: Array<{ id?: string; invoice_number?: string }>;
              };
              const creditedInvoice = inv.credited_invoice;
              const creditNotes = inv.credit_notes ?? [];
              if (!creditedInvoice && creditNotes.length === 0) return null;
              return (
                <AdminStatusStrip
                  label={creditedInvoice ? t('adminNew.invoiceDetail.creditedFor') : t('adminNew.invoiceDetail.creditNotes')}
                  value={
                    <span className="flex flex-wrap gap-2">
                      {creditedInvoice?.id ? (
                        <Link
                          href={`/${locale}/admin/facturen/${creditedInvoice.id}`}
                          className="font-semibold text-marine-700 hover:text-marine-800"
                        >
                          {creditedInvoice.invoice_number ?? creditedInvoice.id}
                        </Link>
                      ) : null}
                      {creditNotes.map((cn) =>
                        cn.id ? (
                          <Link
                            key={cn.id}
                            href={`/${locale}/admin/facturen/${cn.id}`}
                            className="font-semibold text-marine-700 hover:text-marine-800"
                          >
                            {cn.invoice_number ?? cn.id}
                          </Link>
                        ) : null
                      )}
                    </span>
                  }
                  tone="marine"
                />
              );
            })()}

            {creditResult ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="mb-3 text-sm font-semibold text-emerald-800">
                  {t('adminNew.invoiceDetail.creditSuccess')}
                  {creditResult.invoice_number ? ` — ${creditResult.invoice_number}` : ''}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/${locale}/admin/facturen/${creditResult.id}`}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-navy-200 bg-white px-3 text-sm font-medium text-navy-800 transition hover:bg-navy-50"
                  >
                    <FileText className="h-4 w-4" />
                    {t('adminNew.invoiceDetail.actions.openCreditNote')}
                  </Link>
                  {creditResult.pdf_url ? (
                    <>
                      <a
                        href={creditResult.pdf_url}
                        download
                        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-navy-200 bg-white px-3 text-sm font-medium text-navy-800 transition hover:bg-navy-50"
                      >
                        <Download className="h-4 w-4" />
                        {t('adminNew.invoiceDetail.actions.downloadPdf')}
                      </a>
                      <button
                        type="button"
                        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-navy-200 bg-white px-3 text-sm font-medium text-navy-800 transition hover:bg-navy-50"
                        onClick={() => {
                          const win = window.open(creditResult.pdf_url!, '_blank', 'noopener,noreferrer');
                          if (win) win.addEventListener('load', () => win.print());
                        }}
                      >
                        <Printer className="h-4 w-4" />
                        {t('adminNew.invoiceDetail.actions.printPdf')}
                      </button>
                    </>
                  ) : null}
                  <button
                    type="button"
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-navy-200 bg-white px-3 text-sm font-medium text-navy-800 transition hover:bg-navy-50"
                    onClick={() =>
                      void action(
                        t('adminNew.invoiceDetail.toasts.emailed'),
                        () => invoicesService.email(creditResult.id, { locale: locale === 'en' ? 'en-GB' : 'nl-NL' })
                      )
                    }
                  >
                    <Mail className="h-4 w-4" />
                    {t('adminNew.invoiceDetail.actions.emailPdf')}
                  </button>
                  <button
                    type="button"
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-navy-600 transition hover:bg-navy-50"
                    onClick={() => setCreditResult(null)}
                  >
                    {t('adminNew.common.dismiss')}
                  </button>
                </div>
              </div>
            ) : null}

            <div className="bento-grid lg:grid-cols-3">
              <AdminSectionCard
                className="lg:col-span-2"
                title={t('adminNew.invoiceDetail.overviewTitle')}
                description={`${t('adminNew.invoiceDetail.source')}: ${invoice.source}`}
                icon={Receipt}
                action={<InvoiceStatusBadge status={invoice.status} isOverdue={invoice.is_overdue} />}
              >
                <div className="space-y-5">
                  <AdminDetailGrid
                    items={[
                      {
                        label: t('adminNew.invoiceDetail.meta.invoiceDate'),
                        value: formatDate(invoice.created_at),
                      },
                      {
                        label: t('adminNew.invoiceDetail.meta.dueDate'),
                        value: formatDate(invoice.due_date),
                      },
                      {
                        label: t('adminNew.invoiceDetail.meta.paidOn'),
                        value: formatDate(invoice.paid_at),
                      },
                    ]}
                  />

                  <AdminTableCard>
                    <AdminTable minWidth={640}>
                      <AdminTableHead>
                        <tr>
                          <AdminTableHeaderCell>
                            {t('adminNew.invoiceDetail.columns.description')}
                          </AdminTableHeaderCell>
                          <AdminTableHeaderCell>
                            {t('adminNew.invoiceDetail.columns.qty')}
                          </AdminTableHeaderCell>
                          <AdminTableHeaderCell>
                            {t('adminNew.invoiceDetail.columns.unitExcl')}
                          </AdminTableHeaderCell>
                          <AdminTableHeaderCell>
                            {t('adminNew.invoiceDetail.columns.vat')}
                          </AdminTableHeaderCell>
                          <AdminTableHeaderCell>
                            {t('adminNew.invoiceDetail.columns.total')}
                          </AdminTableHeaderCell>
                        </tr>
                      </AdminTableHead>
                      <tbody>
                        {(invoice.lines ?? []).map((line) => {
                          const rawLine = line as unknown as Record<string, unknown>;
                          const groupId = String(rawLine.product_group_id ?? '');
                          const lineColor = groupColorMap[groupId] || String(rawLine.color ?? '');
                          return (
                          <AdminTableRow key={line.id} style={lineColor ? { borderLeft: `3px solid ${lineColor}` } : undefined}>
                            <AdminTableCell>{line.description}</AdminTableCell>
                            <AdminTableCell>{line.quantity}</AdminTableCell>
                            <AdminTableCell>
                              {formatCurrency(
                                centsToEuro(line.unit_price),
                                locale === 'en' ? 'en-GB' : 'nl-NL'
                              )}
                            </AdminTableCell>
                            <AdminTableCell>{line.vat_rate}%</AdminTableCell>
                            <AdminTableCell className="font-semibold text-navy-900">
                              {formatCurrency(
                                centsToEuro(line.line_total),
                                locale === 'en' ? 'en-GB' : 'nl-NL'
                              )}
                            </AdminTableCell>
                          </AdminTableRow>
                          );
                        })}
                      </tbody>
                    </AdminTable>
                  </AdminTableCard>
                </div>
              </AdminSectionCard>

              <AdminSectionCard
                title={t('adminNew.invoiceDetail.customerSnapshot')}
                description={invoice.customer?.email ?? undefined}
                icon={User}
              >
                <div className="space-y-4">
                  <div>
                    <div className="text-sm font-semibold text-navy-900">
                      {invoice.customer?.name ?? '-'}
                    </div>
                    <div className="text-xs text-navy-500">{invoice.customer?.email ?? '-'}</div>
                  </div>

                  <div className="space-y-2 rounded-xl border border-navy-100/70 bg-sand-50/40 p-3 text-sm">
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
                    <div className="rounded-xl border border-navy-100/70 bg-white p-2">
                      <div className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-widest text-navy-400">
                        {t('adminNew.invoiceDetail.pdfActions')}
                      </div>
                      {pdfGenerating && !invoice.pdf_url ? (
                        <div className="flex items-center justify-center gap-2 py-3 text-sm text-navy-500">
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          {t('adminNew.invoiceDetail.pdfGenerating')}
                        </div>
                      ) : !invoice.pdf_url ? (
                        <Button
                          variant="primary"
                          size="sm"
                          fullWidth
                          leftIcon={<FileText className="h-4 w-4" />}
                          onClick={() =>
                            void action(t('adminNew.invoiceDetail.toasts.pdfRegenerated'), async () => {
                              await generatePdf.mutate();
                              setPdfGenerating(true);
                            })
                          }
                        >
                          {t('adminNew.invoiceDetail.actions.generatePdf')}
                        </Button>
                      ) : (
                        <div className="grid grid-cols-2 gap-2">
                          <a
                            href={invoice.pdf_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm font-medium text-navy-800 transition hover:bg-sand-50"
                          >
                            <FileText className="h-4 w-4" />
                            {t('adminNew.invoiceDetail.actions.openPdf')}
                          </a>
                          <Button
                            variant="outline"
                            size="sm"
                            leftIcon={<Download className="h-4 w-4" />}
                            onClick={() => void downloadPdf()}
                          >
                            {t('adminNew.invoiceDetail.actions.downloadPdf')}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            leftIcon={<Printer className="h-4 w-4" />}
                            onClick={printPdf}
                          >
                            {t('adminNew.invoiceDetail.actions.printPdf')}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            leftIcon={<Mail className="h-4 w-4" />}
                            disabled={emailInvoice.loading}
                            onClick={() =>
                              void action(
                                t('adminNew.invoiceDetail.toasts.emailed'),
                                () => emailInvoice.mutate()
                              )
                            }
                          >
                            {t('adminNew.invoiceDetail.actions.emailPdf')}
                          </Button>
                        </div>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      fullWidth
                      leftIcon={<RefreshCw className="h-4 w-4" />}
                      onClick={() =>
                        void action(
                          t('adminNew.invoiceDetail.toasts.pdfRegenerated'),
                          async () => {
                            await generatePdf.mutate();
                            setPdfGenerating(true);
                          }
                        )
                      }
                    >
                      {t('adminNew.invoiceDetail.actions.regeneratePdf')}
                    </Button>
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
                      onClick={onOpenCredit}
                    >
                      {t('adminNew.invoiceDetail.actions.credit')}
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      fullWidth
                      leftIcon={<XCircle className="h-4 w-4" />}
                      onClick={() => setConfirmCancel(true)}
                    >
                      {t('adminNew.common.cancel')}
                    </Button>
                  </div>
                </div>
              </AdminSectionCard>
            </div>

            <div className="bento-grid lg:grid-cols-2">
              <AdminSectionCard
                title={t('adminNew.invoiceDetail.paymentTimeline')}
                description={t('adminNew.invoiceDetail.noPayments')}
                icon={CreditCard}
              >
                <div className="divide-y divide-navy-100 rounded-xl border border-navy-100/70">
                  {(invoice.payments ?? []).length ? (
                    (invoice.payments ?? []).map((payment) => (
                      <div
                        key={payment.id}
                        className="flex items-center justify-between px-4 py-3 text-sm"
                      >
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
              </AdminSectionCard>

              <AdminSectionCard
                title={t('adminNew.invoiceDetail.reminderHistory')}
                description={t('adminNew.invoiceDetail.noReminders')}
                icon={Mail}
              >
                <div className="divide-y divide-navy-100 rounded-xl border border-navy-100/70">
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
              </AdminSectionCard>
            </div>

            <div className="bento-grid lg:grid-cols-2">
              <AdminSectionCard
                title={t('adminNew.invoiceDetail.customerSnapshot')}
                description={t('adminNew.invoiceDetail.subtitle')}
                icon={Users}
              >
                <AdminDetailGrid
                  items={[
                    {
                      label: t('adminNew.common.name'),
                      value: resolveSnapshot(invoice.customer_snapshot, ['name']),
                    },
                    {
                      label: t('adminNew.common.email'),
                      value: resolveSnapshot(invoice.customer_snapshot, ['email']),
                    },
                    {
                      label: t('adminNew.common.phone'),
                      value: resolveSnapshot(invoice.customer_snapshot, ['phone']),
                    },
                    {
                      label: t('adminNew.invoiceDetail.vatNumber'),
                      value: resolveSnapshot(invoice.customer_snapshot, ['vat_number']),
                    },
                  ]}
                />
              </AdminSectionCard>

              <AdminSectionCard
                title={t('adminNew.invoiceDetail.companySnapshot')}
                description={t('adminNew.invoiceDetail.legal.title')}
                icon={Receipt}
              >
                <AdminDetailGrid
                  items={[
                    {
                      label: t('adminNew.common.name'),
                      value: resolveSnapshot(invoice.company_snapshot, ['name']),
                    },
                    {
                      label: t('adminNew.common.email'),
                      value: resolveSnapshot(invoice.company_snapshot, ['email']),
                    },
                    {
                      label: t('adminNew.common.phone'),
                      value: resolveSnapshot(invoice.company_snapshot, ['phone']),
                    },
                    {
                      label: t('adminNew.invoiceDetail.iban'),
                      value: resolveSnapshot(invoice.company_snapshot, ['iban']),
                    },
                  ]}
                />
              </AdminSectionCard>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <Link
                href={`/${locale}/admin/facturen`}
                className="inline-flex text-sm font-semibold text-marine-700 hover:text-marine-800"
              >
                {t('adminNew.invoiceDetail.back')}
              </Link>
              {/* Trello #107: back-link to the originating stalling contract. */}
              {(invoice.stalling_contract_id ?? invoice.stalling_contract?.id) ? (
                <Link
                  href={`/${locale}/admin/stalling/${invoice.stalling_contract_id ?? invoice.stalling_contract?.id}`}
                  className="inline-flex items-center gap-1 text-sm font-semibold text-marine-700 hover:text-marine-800"
                >
                  <ArrowLeft className="h-4 w-4" />
                  {t('adminNew.invoiceDetail.backToContract')}
                </Link>
              ) : null}
            </div>
          </>
        ) : null}
      </AdminContent>

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
            setConfirmMarkPaid(true);
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

      <AdminConfirmModal
        open={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        onConfirm={async () => {
          await action(t('adminNew.invoiceDetail.toasts.cancelled'), () => cancelInvoice.mutate());
          setConfirmCancel(false);
        }}
        title={t('adminNew.common.cancel')}
        message={t('adminNew.invoiceDetail.confirmCancel')}
        confirmLabel={t('adminNew.common.cancel')}
        cancelLabel={t('adminNew.common.back')}
        variant="danger"
        icon={XCircle}
        loading={cancelInvoice.loading}
      />

      <Modal open={showCredit} onClose={() => setShowCredit(false)} size="md">
        <form className="p-6" onSubmit={onSubmitCredit}>
          <h2 className="text-lg font-semibold text-navy-900">
            {t('adminNew.invoiceDetail.creditModal.title')}
          </h2>
          <p className="mt-1 text-sm text-navy-500">
            {t('adminNew.invoiceDetail.creditModal.subtitle')}
          </p>
          <div className="mt-4 space-y-4">
            <div>
              <span className="mb-1.5 block text-sm font-medium text-navy-800">
                {t('adminNew.invoiceDetail.creditModal.scope')}
              </span>
              <div className="grid grid-cols-2 gap-2">
                {(['full', 'partial'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setCreditMode(mode)}
                    className={
                      'rounded-lg border px-3 py-2 text-sm font-medium transition ' +
                      (creditMode === mode
                        ? 'border-marine-500 bg-marine-50 text-marine-800'
                        : 'border-navy-200 bg-white text-navy-700 hover:bg-sand-50')
                    }
                  >
                    {t(`adminNew.invoiceDetail.creditModal.${mode}`)}
                  </button>
                ))}
              </div>
            </div>
            {creditMode === 'partial' ? (
              <Input
                label={t('adminNew.invoiceDetail.creditModal.amount')}
                type="number"
                step="0.01"
                min="0"
                value={creditAmount}
                onChange={(e) => setCreditAmount(e.target.value)}
                leftIcon={<span className="text-navy-400">€</span>}
                required
              />
            ) : null}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-navy-800">
                {t('adminNew.invoiceDetail.creditModal.reason')}
              </label>
              <textarea
                className="input-base min-h-28"
                value={creditReason}
                onChange={(e) => setCreditReason(e.target.value)}
                placeholder={t('adminNew.invoiceDetail.creditModal.reasonPlaceholder')}
                required
              />
            </div>
            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-navy-300 text-marine-600 focus:ring-marine-500"
                checked={sendEmailCredit}
                onChange={(e) => setSendEmailCredit(e.target.checked)}
              />
              <span className="text-sm text-navy-700">
                {t('adminNew.invoiceDetail.creditModal.sendEmail')}
              </span>
            </label>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setShowCredit(false)}>
              {t('adminNew.common.cancel')}
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={creditInvoice.loading || !creditReason.trim()}
            >
              {t('adminNew.invoiceDetail.creditModal.confirm')}
            </Button>
          </div>
        </form>
      </Modal>

      <AdminConfirmModal
        open={confirmSend}
        onClose={() => setConfirmSend(false)}
        onConfirm={async () => {
          await action(t('adminNew.invoiceDetail.toasts.invoiceSent'), () => sendInvoice.mutate());
          setConfirmSend(false);
        }}
        title={t('adminNew.invoiceDetail.actions.send')}
        message={t('adminNew.invoiceDetail.confirmSend')}
        confirmLabel={t('adminNew.invoiceDetail.actions.send')}
        cancelLabel={t('adminNew.common.cancel')}
        variant="primary"
        icon={Mail}
        loading={sendInvoice.loading}
      />

      <AdminConfirmModal
        open={confirmMarkPaid}
        onClose={() => setConfirmMarkPaid(false)}
        onConfirm={async () => {
          await action(t('adminNew.invoiceDetail.toasts.markedPaid'), async () => {
            await markPaid.mutate(paidMethod);
            setShowMarkPaid(false);
          });
          setConfirmMarkPaid(false);
        }}
        title={t('adminNew.invoiceDetail.markPaidModal.title')}
        message={t('adminNew.invoiceDetail.confirmMarkPaid')}
        confirmLabel={t('adminNew.invoiceDetail.actions.markPaid')}
        cancelLabel={t('adminNew.common.cancel')}
        variant="primary"
        icon={CreditCard}
        loading={markPaid.loading}
      />
    </>
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
