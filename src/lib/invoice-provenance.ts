import type { Invoice } from '@/lib/api-types';

type ProvenanceInvoice = Pick<
  Invoice,
  'source' | 'source_type' | 'source_id' | 'stalling_contract_id' | 'stalling_contract'
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
      href: `/${locale}/admin/stalling/${id}`,
      label: number ? `Stallingcontract ${number}` : 'Stallingcontract',
    };
  }

  if (type === 'invoice_import' && id) {
    return {
      href: `/${locale}/admin/facturen/import/${id}`,
      label: 'Import',
    };
  }

  if (type === 'calculator_record' && id) {
    return {
      href: `/${locale}/admin/calculator`,
      label: 'Calculator',
    };
  }

  if (type === 'kassa_transaction' || type === 'kassa' || type === 'kassa_payment_session' || invoice.source === 'kassa') {
    return {
      href: `/${locale}/admin/kassa`,
      label: 'Kassa-transactie',
    };
  }

  return null;
}
