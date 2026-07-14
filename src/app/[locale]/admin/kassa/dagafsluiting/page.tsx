'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowLeft, Wallet } from 'lucide-react';
import { AdminPageHeader } from '@/components/admin/AdminShell';
import {
  AdminContent,
  AdminSectionCard,
  AdminTable,
  AdminTableCard,
  AdminTableCell,
  AdminTableHead,
  AdminTableHeaderCell,
  AdminTableRow,
} from '@/components/admin/AdminUi';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { LoadingState, EmptyState } from '@/components/admin/DataState';
import { kassaService } from '@/lib/services';
import { useMutation, useQuery } from '@/lib/hooks/useAsync';
import { formatCurrency, formatDate } from '@/lib/format';
import { useIntl } from '@/i18n/IntlProvider';
import { useToast } from '@/components/ui/ToastProvider';
import { getApiErrorMessage } from '@/lib/api-error';

type Rec = Record<string, unknown>;
const n = (v: unknown): number => (typeof v === 'number' ? v : Number(v) || 0);

export default function CashClosePage() {
  const { locale, t } = useIntl();
  const { push } = useToast();
  const dateLocale = locale === 'en' ? 'en-GB' : locale === 'de' ? 'de-DE' : 'nl-NL';
  const money = (cents: unknown) => formatCurrency(n(cents) / 100, dateLocale);

  const [form, setForm] = React.useState({
    opening_cash: '',
    cash_paid_out: '',
    counted_cash: '',
    note: '',
  });

  const todayAnalytics = useQuery(['dagafsluiting-today'], () =>
    kassaService.analytics({ period: 'today' }).catch(() => null)
  );
  const cashReceivedCents = React.useMemo(() => {
    const methods = ((todayAnalytics.data?.payment_methods ?? []) as Array<Record<string, unknown>>);
    const cashEntry = methods.find((m) => String(m.method).toLowerCase() === 'cash');
    return cashEntry != null ? Number(cashEntry.total ?? cashEntry.total_cents ?? 0) : null;
  }, [todayAnalytics.data]);

  const closures = useQuery(['cash-closures'], () => kassaService.cashClosures().catch(() => []));
  const createClosure = useMutation((payload: Parameters<typeof kassaService.createCashClosure>[0]) =>
    kassaService.createCashClosure(payload)
  );

  const toCents = (v: string) => Math.round(parseFloat(v.replace(',', '.') || '0') * 100);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createClosure.mutate({
        business_date: new Date().toISOString().slice(0, 10),
        opening_cash_cents: toCents(form.opening_cash),
        cash_paid_out_cents: toCents(form.cash_paid_out),
        counted_cash_cents: toCents(form.counted_cash),
        note: form.note || undefined,
      });
      push({ tone: 'success', title: t('adminNew.cashClose.toasts.created') });
      setForm({ opening_cash: '', cash_paid_out: '', counted_cash: '', note: '' });
      await closures.refetch();
    } catch (err) {
      push({ tone: 'error', title: t('adminNew.common.operationFailed'), message: getApiErrorMessage(err) });
    }
  };

  const rows = (closures.data ?? []) as Rec[];

  return (
    <>
      <AdminPageHeader
        title={t('adminNew.cashClose.title')}
        subtitle={t('adminNew.cashClose.subtitle')}
        rightSlot={
          <Link href={`/${locale}/admin/rapportages`}>
            <Button variant="outline" size="sm" leftIcon={<ArrowLeft className="h-4 w-4" />}>
              {t('adminNew.reports.title')}
            </Button>
          </Link>
        }
      />
      <AdminContent className="grid gap-5 lg:grid-cols-[24rem_1fr]">
        <AdminSectionCard title={t('adminNew.cashClose.formTitle')} icon={Wallet} className="self-start">
          {cashReceivedCents != null ? (
            <div className="mb-4 rounded-lg bg-sand-50 px-4 py-3">
              <div className="text-xs font-semibold uppercase tracking-widest text-navy-400">
                {t('adminNew.cashClose.cashReceivedToday', { defaultValue: 'Contante ontvangsten vandaag' })}
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-xl font-bold text-navy-900">{money(cashReceivedCents)}</span>
                <span className="text-xs text-navy-400">
                  {t('adminNew.cashClose.cashReceivedNote', { defaultValue: 'automatisch berekend uit kassabetalingen' })}
                </span>
              </div>
            </div>
          ) : null}
          <form onSubmit={onSubmit} className="space-y-3">
            <Input
              label={t('adminNew.cashClose.fields.opening')}
              type="number"
              step="0.01"
              value={form.opening_cash}
              onChange={(e) => setForm({ ...form, opening_cash: e.target.value })}
              leftIcon={<span className="text-navy-400">€</span>}
            />
            <Input
              label={t('adminNew.cashClose.fields.paidOut')}
              type="number"
              step="0.01"
              value={form.cash_paid_out}
              onChange={(e) => setForm({ ...form, cash_paid_out: e.target.value })}
              leftIcon={<span className="text-navy-400">€</span>}
            />
            <Input
              label={t('adminNew.cashClose.fields.counted')}
              type="number"
              step="0.01"
              value={form.counted_cash}
              onChange={(e) => setForm({ ...form, counted_cash: e.target.value })}
              leftIcon={<span className="text-navy-400">€</span>}
              required
            />
            <div>
              <label className="mb-1.5 block text-sm font-medium text-navy-800">
                {t('adminNew.cashClose.fields.note')}
              </label>
              <textarea
                className="input-base min-h-16 w-full"
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
              />
            </div>
            <Button type="submit" variant="gold" fullWidth disabled={createClosure.loading}>
              {t('adminNew.cashClose.submit')}
            </Button>
          </form>
        </AdminSectionCard>

        <AdminSectionCard title={t('adminNew.cashClose.historyTitle')} icon={Wallet}>
          <AdminTableCard>
            {closures.loading ? (
              <LoadingState label={t('adminNew.common.loading')} variant="table" />
            ) : rows.length === 0 ? (
              <EmptyState
                title={t('adminNew.cashClose.emptyTitle')}
                message={t('adminNew.cashClose.emptyMessage')}
              />
            ) : (
              <AdminTable minWidth={620}>
                <AdminTableHead>
                  <tr>
                    <AdminTableHeaderCell>{t('adminNew.cashClose.columns.date')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{t('adminNew.cashClose.columns.expected')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{t('adminNew.cashClose.columns.counted')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{t('adminNew.cashClose.columns.difference')}</AdminTableHeaderCell>
                  </tr>
                </AdminTableHead>
                <tbody>
                  {rows.map((c, i) => {
                    const diff = n(c.difference_cents);
                    return (
                      <AdminTableRow key={String(c.id ?? i)}>
                        <AdminTableCell className="whitespace-nowrap">
                          {c.business_date ? formatDate(String(c.business_date), dateLocale) : '—'}
                        </AdminTableCell>
                        <AdminTableCell>{money(c.expected_cash_cents)}</AdminTableCell>
                        <AdminTableCell>{money(c.counted_cash_cents)}</AdminTableCell>
                        <AdminTableCell
                          className={
                            diff === 0 ? 'text-emerald-700' : diff > 0 ? 'text-marine-700' : 'text-rose-600'
                          }
                        >
                          {diff > 0 ? '+' : ''}
                          {money(c.difference_cents)}
                        </AdminTableCell>
                      </AdminTableRow>
                    );
                  })}
                </tbody>
              </AdminTable>
            )}
          </AdminTableCard>
        </AdminSectionCard>
      </AdminContent>
    </>
  );
}
