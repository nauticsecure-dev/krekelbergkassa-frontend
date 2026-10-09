'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CalendarDays, ListPlus, MessageSquareText, Plus, Search, Trash2, UserRoundPlus } from 'lucide-react';
import { AdminContent, AdminFormGrid, AdminSectionCard } from '@/components/admin/AdminUi';
import { AdminPageHeader } from '@/components/admin/AdminShell';
import { ErrorState, LoadingState } from '@/components/admin/DataState';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useMutation, useQuery } from '@/lib/hooks/useAsync';
import { customersService, invoicesService, productsService } from '@/lib/services';
import type { Customer, Product } from '@/lib/api-types';
import { useIntl } from '@/i18n/IntlProvider';
import { useToast } from '@/components/ui/ToastProvider';
import { getApiErrorMessage } from '@/lib/api-error';

type InvoiceDraftLine = {
  product_id?: string;
  description: string;
  quantity: string;
  unit_price: string;
  vat_rate: string;
  discount_percent: string;
};

const newLine = (): InvoiceDraftLine => ({
  description: '',
  quantity: '1',
  unit_price: '0.00',
  vat_rate: '21',
  discount_percent: '0',
});

const today = () => new Date().toISOString().slice(0, 10);
const addDays = (date: string, days: number) => {
  const value = new Date(`${date}T12:00:00`);
  value.setDate(value.getDate() + days);
  return value.toISOString().slice(0, 10);
};
const euroToCents = (value: string) => Math.round((Number(value.replace(',', '.')) || 0) * 100);
const lineSubtotalCents = (line: InvoiceDraftLine) =>
  Math.round(
    Number(line.quantity.replace(',', '.')) *
      euroToCents(line.unit_price) *
      (1 - Math.min(100, Math.max(0, Number(line.discount_percent.replace(',', '.')) || 0)) / 100)
  );

export default function ManualInvoicePage() {
  const { locale, t } = useIntl();
  const router = useRouter();
  const { push } = useToast();
  const [customerSearch, setCustomerSearch] = React.useState('');
  const [customerQuery, setCustomerQuery] = React.useState('');
  const [selectedCustomer, setSelectedCustomer] = React.useState<Customer | null>(null);
  const [createCustomerOpen, setCreateCustomerOpen] = React.useState(false);
  const [customerForm, setCustomerForm] = React.useState({ name: '', email: '', phone: '', company_name: '' });
  const [invoiceDate, setInvoiceDate] = React.useState(today);
  const [dueDate, setDueDate] = React.useState(() => addDays(today(), 14));
  const [invoiceNumber, setInvoiceNumber] = React.useState('');
  const [reference, setReference] = React.useState('');
  const [currency, setCurrency] = React.useState('EUR');
  const [paymentMethod, setPaymentMethod] = React.useState('');
  const [billingAddress, setBillingAddress] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [internalNote, setInternalNote] = React.useState('');
  const [lines, setLines] = React.useState<InvoiceDraftLine[]>([newLine()]);
  const [productSearch, setProductSearch] = React.useState('');
  const [productQuery, setProductQuery] = React.useState('');

  React.useEffect(() => {
    const timer = window.setTimeout(() => setCustomerQuery(customerSearch.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [customerSearch]);
  React.useEffect(() => {
    const timer = window.setTimeout(() => setProductQuery(productSearch.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [productSearch]);

  const customers = useQuery(
    [customerQuery],
    () => customersService.list({ search: customerQuery, per_page: 10 }),
    { immediate: false }
  );
  const products = useQuery(
    [productQuery],
    () => productsService.list({ search: productQuery, active: true, per_page: 10 }),
    { immediate: false }
  );
  React.useEffect(() => {
    if (customerQuery.length >= 2) void customers.refetch().catch(() => undefined);
  }, [customerQuery]); // eslint-disable-line react-hooks/exhaustive-deps
  React.useEffect(() => {
    if (productQuery.length >= 2) void products.refetch().catch(() => undefined);
  }, [productQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  const createInvoice = useMutation((payload: Record<string, unknown>) => invoicesService.create(payload));
  const createCustomer = useMutation((payload: {
    name: string;
    email: string;
    phone: string;
    company_name: string;
  }) => customersService.create(payload));

  const updateLine = (index: number, update: Partial<InvoiceDraftLine>) =>
    setLines((current) => current.map((line, lineIndex) => lineIndex === index ? { ...line, ...update } : line));

  const addProduct = (product: Product) => {
    setLines((current) => [
      ...current,
      {
        product_id: product.id,
        description: product.name,
        quantity: '1',
        unit_price: (product.price_excl_vat / 100).toFixed(2),
        vat_rate: product.vat_rate || '21',
        discount_percent: '0',
      },
    ]);
    setProductSearch('');
    setProductQuery('');
  };

  const createInlineCustomer = async () => {
    try {
      const customer = await createCustomer.mutate(customerForm);
      setSelectedCustomer(customer);
      setCustomerSearch('');
      setCreateCustomerOpen(false);
      setCustomerForm({ name: '', email: '', phone: '', company_name: '' });
    } catch (error) {
      push({ tone: 'error', title: t('adminNew.invoices.customerCreateFailed', { defaultValue: 'Klant aanmaken mislukt' }), message: getApiErrorMessage(error) });
    }
  };

  const totals = React.useMemo(() => {
    const subtotal = lines.reduce((sum, line) => sum + lineSubtotalCents(line), 0);
    const vatByRate = new Map<number, number>();
    lines.forEach((line) => {
      const rate = Number(line.vat_rate.replace(',', '.')) || 0;
      const vat = Math.round(lineSubtotalCents(line) * rate / 100);
      vatByRate.set(rate, (vatByRate.get(rate) ?? 0) + vat);
    });
    const vat = [...vatByRate.values()].reduce((sum, amount) => sum + amount, 0);
    return { subtotal, vat, total: subtotal + vat };
  }, [lines]);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedCustomer) {
      push({ tone: 'error', title: t('adminNew.invoices.selectCustomer') });
      return;
    }
    if (!lines.length || lines.some((line) => !line.description.trim() || Number(line.quantity) <= 0)) {
      push({ tone: 'error', title: t('adminNew.invoices.invalidLines', { defaultValue: 'Controleer de omschrijving en hoeveelheid van alle factuurregels.' }) });
      return;
    }

    try {
      const invoice = await createInvoice.mutate({
        customer_id: selectedCustomer.id,
        source: 'manual',
        invoice_number: invoiceNumber.trim() || undefined,
        invoice_date: invoiceDate,
        due_date: dueDate,
        reference: reference.trim() || undefined,
        payment_method: paymentMethod || undefined,
        currency,
        billing_address: billingAddress.trim() || undefined,
        notes: notes.trim() || undefined,
        internal_note: internalNote.trim() || undefined,
        lines: lines.map((line) => ({
          product_id: line.product_id,
          description: line.description.trim(),
          quantity: Number(line.quantity.replace(',', '.')),
          unit_price: euroToCents(line.unit_price),
          vat_rate: Number(line.vat_rate.replace(',', '.')) || 0,
          discount_percent: Number(line.discount_percent.replace(',', '.')) || 0,
        })),
      });
      push({ tone: 'success', title: t('adminNew.invoices.toasts.created') });
      router.push(`/${locale}/admin/facturen/${invoice.id}`);
    } catch (error) {
      push({ tone: 'error', title: t('adminNew.invoices.toasts.createFailed'), message: getApiErrorMessage(error) });
    }
  };

  const money = (cents: number) => new Intl.NumberFormat(
    locale === 'en' ? 'en-GB' : locale === 'de' ? 'de-DE' : 'nl-NL',
    { style: 'currency', currency }
  ).format(cents / 100);

  return (
    <>
      <AdminPageHeader
        title={t('adminNew.invoices.manualCreate', { defaultValue: 'Handmatige factuur' })}
        subtitle={t('adminNew.invoices.manualCreateDescription', { defaultValue: 'Maak een factuur op vanuit klant- en factuurgegevens.' })}
        rightSlot={
          <Link href={`/${locale}/admin/facturen/nieuw`}>
            <Button variant="outline" leftIcon={<ArrowLeft className="h-4 w-4" />}>
              {t('adminNew.invoices.back', { defaultValue: 'Terug' })}
            </Button>
          </Link>
        }
      />
      <AdminContent>
        <form onSubmit={save} className="space-y-5">
          <AdminSectionCard title={t('adminNew.invoices.customer', { defaultValue: 'Klant' })} icon={Search}>
            {selectedCustomer ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <div>
                  <p className="font-semibold text-navy-900">{selectedCustomer.name}</p>
                  <p className="text-sm text-navy-600">{selectedCustomer.email ?? selectedCustomer.phone ?? ''}</p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => setSelectedCustomer(null)}>
                  {t('adminNew.invoices.changeCustomer', { defaultValue: 'Andere klant kiezen' })}
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <Input
                  value={customerSearch}
                  onChange={(event) => setCustomerSearch(event.target.value)}
                  placeholder={t('adminNew.invoices.customerSearchHint', { defaultValue: 'Zoek op naam, e-mail, telefoon of bedrijf (minimaal 2 tekens)' })}
                  leftIcon={<Search className="h-4 w-4" />}
                />
                {customers.loading ? <LoadingState label={t('adminNew.customers.loading')} /> : null}
                {customers.error ? <ErrorState message={customers.error} onRetry={() => void customers.refetch()} /> : null}
                {(customers.data?.data ?? []).map((customer) => (
                  <button
                    key={customer.id}
                    type="button"
                    onClick={() => setSelectedCustomer(customer)}
                    className="block w-full rounded-lg border border-navy-100 bg-white p-3 text-left hover:border-marine-400"
                  >
                    <span className="font-medium text-navy-900">{customer.name}</span>
                    <span className="ml-2 text-sm text-navy-500">
                      {[customer.company_name, customer.email, customer.phone].filter(Boolean).join(' · ')}
                    </span>
                  </button>
                ))}
                {customerQuery.length < 2 ? (
                  <p className="text-sm text-navy-500">{t('adminNew.invoices.customerSearchHint', { defaultValue: 'Zoek op naam, e-mail, telefoon of bedrijf (minimaal 2 tekens)' })}</p>
                ) : null}
                <Button type="button" variant="outline" leftIcon={<UserRoundPlus className="h-4 w-4" />} onClick={() => setCreateCustomerOpen((open) => !open)}>
                  {t('adminNew.invoices.createCustomerInline', { defaultValue: 'Nieuwe klant aanmaken' })}
                </Button>
                {createCustomerOpen ? (
                  <div className="rounded-xl border border-navy-200 bg-sand-50 p-4">
                    <AdminFormGrid>
                      <Input required value={customerForm.name} onChange={(e) => setCustomerForm((v) => ({ ...v, name: e.target.value }))} placeholder={t('adminNew.customers.fields.name', { defaultValue: 'Naam' })} />
                      <Input type="email" value={customerForm.email} onChange={(e) => setCustomerForm((v) => ({ ...v, email: e.target.value }))} placeholder={t('adminNew.customers.fields.email', { defaultValue: 'E-mail' })} />
                      <Input value={customerForm.phone} onChange={(e) => setCustomerForm((v) => ({ ...v, phone: e.target.value }))} placeholder={t('adminNew.customers.fields.phone', { defaultValue: 'Telefoon' })} />
                      <Input value={customerForm.company_name} onChange={(e) => setCustomerForm((v) => ({ ...v, company_name: e.target.value }))} placeholder={t('adminNew.customers.fields.company', { defaultValue: 'Bedrijf' })} />
                    </AdminFormGrid>
                    <Button type="button" className="mt-3" variant="gold" disabled={createCustomer.loading || !customerForm.name.trim()} onClick={() => void createInlineCustomer()}>
                      {createCustomer.loading ? t('adminNew.common.saving') : t('adminNew.invoices.createCustomerInline', { defaultValue: 'Nieuwe klant aanmaken' })}
                    </Button>
                  </div>
                ) : null}
              </div>
            )}
            <div className="mt-4">
              <label className="mb-1 block text-sm font-medium text-navy-700">{t('adminNew.invoices.billingAddress', { defaultValue: 'Factuuradres' })}</label>
              <textarea className="input-base min-h-20 w-full" value={billingAddress} onChange={(e) => setBillingAddress(e.target.value)} />
            </div>
          </AdminSectionCard>

          <AdminSectionCard title={t('adminNew.invoices.invoiceDetails')} icon={CalendarDays}>
            <AdminFormGrid>
              <Input type="date" required value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} aria-label={t('adminNew.invoices.invoiceDate', { defaultValue: 'Factuurdatum' })} />
              <Input type="date" required value={dueDate} onChange={(e) => setDueDate(e.target.value)} aria-label={t('adminNew.invoices.dueDate', { defaultValue: 'Vervaldatum' })} />
              <Input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} placeholder={t('adminNew.invoices.invoiceNumberOptional', { defaultValue: 'Factuurnummer (automatisch indien leeg)' })} />
              <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder={t('adminNew.invoices.reference', { defaultValue: 'Referentie' })} />
              <select className="input-base" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} aria-label={t('adminNew.invoices.paymentMethod', { defaultValue: 'Betaalmethode' })}>
                <option value="">{t('adminNew.invoices.paymentMethod', { defaultValue: 'Betaalmethode' })}</option>
                <option value="banktransfer">{t('adminNew.invoiceDetail.paymentMethods.banktransfer')}</option>
                <option value="pin">{t('adminNew.invoiceDetail.paymentMethods.pin')}</option>
                <option value="cash">{t('adminNew.invoiceDetail.paymentMethods.cash')}</option>
              </select>
              <select className="input-base" value={currency} onChange={(e) => setCurrency(e.target.value)} aria-label={t('adminNew.invoices.currency', { defaultValue: 'Valuta' })}>
                <option value="EUR">EUR — Euro</option>
              </select>
            </AdminFormGrid>
          </AdminSectionCard>

          <AdminSectionCard title={t('adminNew.invoices.lines')} icon={ListPlus}>
            <div className="mb-4 max-w-xl">
              <Input value={productSearch} onChange={(e) => setProductSearch(e.target.value)} placeholder={t('adminNew.invoices.productSearch', { defaultValue: 'Zoek een dienst of product' })} leftIcon={<Search className="h-4 w-4" />} />
              {products.loading ? <LoadingState label={t('adminNew.common.loading')} /> : null}
              {products.error ? <ErrorState message={products.error} onRetry={() => void products.refetch()} /> : null}
              {(products.data?.data ?? []).map((product) => (
                <button key={product.id} type="button" onClick={() => addProduct(product)} className="mt-1 block w-full rounded-lg border border-navy-100 bg-white p-2 text-left text-sm hover:border-marine-400">
                  {product.name} · {money(product.price_excl_vat)}
                </button>
              ))}
            </div>
            <div className="space-y-3">
              {lines.map((line, index) => (
                <div key={`${index}-${line.product_id ?? 'custom'}`} className="grid gap-2 rounded-xl border border-navy-100 bg-white p-3 sm:grid-cols-2 lg:grid-cols-[minmax(180px,2fr)_90px_130px_100px_100px_auto]">
                  <Input required value={line.description} onChange={(e) => updateLine(index, { description: e.target.value })} placeholder={t('adminNew.invoices.lineDescription', { defaultValue: 'Omschrijving' })} />
                  <Input required type="number" min="0.001" step="0.001" value={line.quantity} onChange={(e) => updateLine(index, { quantity: e.target.value })} aria-label={t('adminNew.invoices.quantity', { defaultValue: 'Aantal' })} />
                  <Input required type="number" min="0" step="0.01" value={line.unit_price} onChange={(e) => updateLine(index, { unit_price: e.target.value })} aria-label={t('adminNew.invoices.unitPriceExVat', { defaultValue: 'Prijs excl. btw' })} />
                  <Input required type="number" min="0" max="100" step="0.01" value={line.vat_rate} onChange={(e) => updateLine(index, { vat_rate: e.target.value })} aria-label={t('adminNew.invoices.vatRate', { defaultValue: 'Btw %' })} />
                  <Input type="number" min="0" max="100" step="0.01" value={line.discount_percent} onChange={(e) => updateLine(index, { discount_percent: e.target.value })} aria-label={t('adminNew.invoices.discount', { defaultValue: 'Korting %' })} />
                  <Button type="button" variant="ghost" aria-label={t('adminNew.common.delete')} onClick={() => setLines((current) => current.length > 1 ? current.filter((_, i) => i !== index) : current)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
            </div>
            <Button type="button" variant="outline" className="mt-3" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setLines((current) => [...current, newLine()])}>
              {t('adminNew.invoices.addFreeLine', { defaultValue: 'Vrije factuurregel toevoegen' })}
            </Button>
            <div className="ml-auto mt-5 max-w-sm space-y-2 border-t border-navy-100 pt-4 text-sm">
              <div className="flex justify-between"><span>{t('adminNew.invoices.subtotal', { defaultValue: 'Subtotaal excl. btw' })}</span><span>{money(totals.subtotal)}</span></div>
              <div className="flex justify-between"><span>{t('adminNew.invoices.vatTotal', { defaultValue: 'Btw totaal' })}</span><span>{money(totals.vat)}</span></div>
              <div className="flex justify-between text-lg font-bold"><span>{t('adminNew.invoices.totalAmount', { defaultValue: 'Totaal' })}</span><span>{money(totals.total)}</span></div>
            </div>
          </AdminSectionCard>

          <AdminSectionCard title={t('adminNew.invoices.notesAndTerms')} icon={MessageSquareText}>
            <AdminFormGrid>
              <label className="text-sm font-medium text-navy-700">{t('adminNew.invoices.customerNote', { defaultValue: 'Opmerking op factuur' })}<textarea className="input-base mt-1 min-h-24 w-full" value={notes} onChange={(e) => setNotes(e.target.value)} /></label>
              <label className="text-sm font-medium text-navy-700">{t('adminNew.invoices.internalNote', { defaultValue: 'Interne notitie' })}<textarea className="input-base mt-1 min-h-24 w-full" value={internalNote} onChange={(e) => setInternalNote(e.target.value)} /></label>
            </AdminFormGrid>
          </AdminSectionCard>

          <div className="flex justify-end gap-2">
            <Link href={`/${locale}/admin/facturen`}><Button type="button" variant="outline">{t('adminNew.common.cancel')}</Button></Link>
            <Button type="submit" variant="gold" disabled={createInvoice.loading || !selectedCustomer}>
              {createInvoice.loading ? t('adminNew.common.saving') : t('adminNew.invoices.saveDraft', { defaultValue: 'Factuur opslaan als concept' })}
            </Button>
          </div>
        </form>
      </AdminContent>
    </>
  );
}
