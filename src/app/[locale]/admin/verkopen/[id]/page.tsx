'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Receipt } from 'lucide-react';
import { AdminPageHeader } from '@/components/admin/AdminShell';
import { AdminContent, AdminSectionCard } from '@/components/admin/AdminUi';
import { ErrorState, LoadingState } from '@/components/admin/DataState';
import { PaymentStatusBadge } from '@/components/admin/StatusBadge';
import { kassaService } from '@/lib/services';
import { useQuery } from '@/lib/hooks/useAsync';
import { formatCurrency, intlLocale } from '@/lib/format';
import { useIntl } from '@/i18n/IntlProvider';

export default function SaleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { locale, t } = useIntl();
  const sale = useQuery(['sale', id], () => kassaService.sale(id));
  return <>
    <AdminPageHeader title={sale.data?.invoice_number ?? t('adminNew.sales.title')} />
    <AdminContent>
      {sale.loading ? <LoadingState label={t('adminNew.common.loading')} /> : null}
      {sale.error ? <ErrorState message={sale.error} onRetry={() => void sale.refetch()} /> : null}
      {sale.data ? <AdminSectionCard title={t('adminNew.invoices.source.kassa')} icon={Receipt}>
        <p className="mb-3">{sale.data.customer?.name ?? '—'}</p>
        <PaymentStatusBadge status={sale.data.payment_status} />
        <div className="my-4 divide-y divide-navy-100">
          {(sale.data.lines ?? []).map((line, index) => <div key={index} className="flex justify-between py-3">
            <span>{line.quantity} × {line.description}</span>
            <span>{formatCurrency(Number(line.line_total) / 100, intlLocale(locale))}</span>
          </div>)}
        </div>
        <p className="mb-4 font-semibold">{formatCurrency(Number(sale.data.total_amount_cents) / 100, intlLocale(locale))}</p>
        <Link className="font-semibold text-marine-700 hover:underline" href={`/${locale}/admin/facturen/${id}`}>
          {t('adminNew.invoices.details')}
        </Link>
      </AdminSectionCard> : null}
    </AdminContent>
  </>;
}
