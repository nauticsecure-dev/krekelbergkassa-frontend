'use client';

import {
  Boxes,
  Calculator,
  Layers,
  Package,
  Tags,
} from 'lucide-react';
import { AdminModuleHub } from '@/components/admin/AdminModuleHub';
import { useIntl } from '@/i18n/IntlProvider';

export default function ServicesPricingHubPage() {
  const { locale, t } = useIntl();
  const prefix = 'adminModules.hubs.servicesPricing';

  return (
    <AdminModuleHub
      title={t(`${prefix}.title`)}
      subtitle={t(`${prefix}.subtitle`)}
      groups={[
        {
          title: t(`${prefix}.catalog`),
          links: [
            { href: `/${locale}/admin/producten`, label: t(`${prefix}.services`), description: t(`${prefix}.servicesDesc`), icon: Package },
            { href: `/${locale}/admin/calculator/pricing`, label: t(`${prefix}.rules`), description: t(`${prefix}.rulesDesc`), icon: Tags },
            { href: `/${locale}/admin/product-groepen`, label: t(`${prefix}.groups`), description: t(`${prefix}.groupsDesc`), icon: Layers },
            { href: `/${locale}/admin/bundels`, label: t(`${prefix}.bundles`), description: t(`${prefix}.bundlesDesc`), icon: Boxes },
            { href: `/${locale}/admin/calculator`, label: t(`${prefix}.calculator`), description: t(`${prefix}.calculatorDesc`), icon: Calculator },
          ],
        },
      ]}
    />
  );
}
