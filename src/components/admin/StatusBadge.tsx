'use client';

import { Badge } from '@/components/ui/Badge';
import { useIntl } from '@/i18n/IntlProvider';

export function InvoiceStatusBadge({ status }: { status: string }) {
  const { t } = useIntl();
  const normalized = status.toLowerCase();
  if (normalized.includes('paid')) return <Badge tone="success">{t('adminNew.status.paid')}</Badge>;
  if (normalized.includes('overdue')) return <Badge tone="danger">{t('adminNew.status.overdue')}</Badge>;
  if (normalized.includes('credit')) return <Badge tone="warning">{t('adminNew.status.credited')}</Badge>;
  if (normalized.includes('cancel')) return <Badge tone="sand">{t('adminNew.status.cancelled')}</Badge>;
  if (normalized.includes('draft')) return <Badge tone="navy">{t('adminNew.status.draft')}</Badge>;
  return <Badge tone="marine">{t('adminNew.status.open')}</Badge>;
}

export function PaymentStatusBadge({ status }: { status: string }) {
  const { t } = useIntl();
  const normalized = status.toLowerCase();
  if (normalized.includes('paid') || normalized.includes('success')) {
    return <Badge tone="success" dot>{t('adminNew.status.paid')}</Badge>;
  }
  if (normalized.includes('overdue') || normalized.includes('failed')) {
    return <Badge tone="danger" dot>{t('adminNew.status.failed')}</Badge>;
  }
  if (normalized.includes('expir')) return <Badge tone="warning" dot>{t('adminNew.status.expiring')}</Badge>;
  if (normalized.includes('cancel')) return <Badge tone="sand" dot>{t('adminNew.status.cancelled')}</Badge>;
  return <Badge tone="navy" dot>{t('adminNew.status.open')}</Badge>;
}
