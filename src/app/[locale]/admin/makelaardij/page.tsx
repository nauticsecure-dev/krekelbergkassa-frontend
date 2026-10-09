'use client';

import {
  FileText,
  Ship,
  Users,
  WalletCards,
} from 'lucide-react';
import { AdminModuleHub } from '@/components/admin/AdminModuleHub';
import { useIntl } from '@/i18n/IntlProvider';

export default function BrokerageHubPage() {
  const { locale, t } = useIntl();
  const prefix = 'adminModules.hubs.brokerage';

  return (
    <AdminModuleHub
      title={t(`${prefix}.title`)}
      subtitle={t(`${prefix}.subtitle`)}
      groups={[
        {
          title: t(`${prefix}.workflows`),
          links: [
            { href: `/${locale}/admin/verkopen`, label: t(`${prefix}.sales`), description: t(`${prefix}.salesDesc`), icon: FileText },
            { href: `/${locale}/admin/boten`, label: t(`${prefix}.boats`), description: t(`${prefix}.boatsDesc`), icon: Ship },
            { href: `/${locale}/admin/klanten`, label: t(`${prefix}.leads`), description: t(`${prefix}.leadsDesc`), icon: Users },
            { href: `/${locale}/admin/tarieven/makelaardij`, label: t(`${prefix}.pricing`), description: t(`${prefix}.pricingDesc`), icon: WalletCards },
          ],
        },
      ]}
    />
  );
}
