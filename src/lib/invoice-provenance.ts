import { adminRecordHref } from '@/config/admin-routes';
import type { Invoice } from '@/lib/api-types';

type ProvenanceInvoice = Pick<
  Invoice,
  'supplier_payable' | 'id' | 'customer' | 'source' | 'source_type' | 'source_id' | 'stalling_contract_id' | 'stalling_contract'
>;

export function invoiceProvenance(
  locale: string,
  invoice: ProvenanceInvoice,
): { href: string; label: string } | null {
  const type = invoice.source_type || (invoice.stalling_contract_id ? 'stalling_contract' : null);
  const id = invoice.source_id || invoice.stalling_contract_id || null;

  if (type === 'stalling_contract' && id) {
    const number = invoice.stalling_contract?.contract_number;
    return {
      href: adminRecordHref(locale, 'stalling', invoice.stalling_contract ?? { id }),
      label: number ? `Stallingcontract ${number}` : 'Stallingcontract',
    };
  }

  if (type === 'invoice_import' && id) {
    return {
      href: `/${locale}/admin/facturen/import/${id}`,
      label: 'Import',
    };
  }

  if (type === 'supplier_payable' && invoice.supplier_payable?.supplier_id) {
    return { href: adminRecordHref(locale, 'leveranciers', { id: invoice.supplier_payable.supplier_id, public_id: invoice.supplier_payable.supplier_public_id, slug: invoice.supplier_payable.supplier_slug }), label: 'Leveranciersfactuur' };
  }

  if (type === 'appointment' && id) {
    return { href: `/${locale}/admin/afspraken?appointment_id=${encodeURIComponent(id)}`, label: 'Afspraak' };
  }

  if (type === 'work_order' && id) {
    return { href: `/${locale}/admin/werkorders/${encodeURIComponent(id)}`, label: 'Werkorder' };
  }

  if (type === 'wallet' && invoice.customer) {
    return { href: adminRecordHref(locale, 'klanten', invoice.customer), label: 'Rekeningoverzicht' };
  }

  if (type === 'calculator_record' && id) {
    return {
      href: `/${locale}/admin/calculator?record_id=${encodeURIComponent(id)}`,
      label: 'Calculator',
    };
  }

  if (type === 'kassa_transaction' || type === 'kassa' || type === 'kassa_payment_session' || invoice.source === 'kassa') {
    return {
      href: `/${locale}/admin/verkopen/${encodeURIComponent(invoice.id)}`,
      label: 'Kassa-transactie',
    };
  }

  return null;
}
