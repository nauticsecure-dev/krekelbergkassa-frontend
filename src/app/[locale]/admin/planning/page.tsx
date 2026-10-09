'use client';

import {
  CalendarDays,
  ClipboardList,
  Hammer,
  Ship,
} from 'lucide-react';
import { AdminModuleHub } from '@/components/admin/AdminModuleHub';
import { useIntl } from '@/i18n/IntlProvider';

export default function PlanningHubPage() {
  const { locale, t } = useIntl();
  const prefix = 'adminModules.hubs.planning';

  return (
    <AdminModuleHub
      title={t(`${prefix}.title`)}
      subtitle={t(`${prefix}.subtitle`)}
      groups={[
        {
          title: t(`${prefix}.schedule`),
          links: [
            { href: `/${locale}/admin/kalender`, label: t(`${prefix}.calendar`), description: t(`${prefix}.calendarDesc`), icon: CalendarDays },
            { href: `/${locale}/admin/afspraken`, label: t(`${prefix}.appointments`), description: t(`${prefix}.appointmentsDesc`), icon: ClipboardList },
            { href: `/${locale}/admin/werkorders`, label: t(`${prefix}.workOrders`), description: t(`${prefix}.workOrdersDesc`), icon: Hammer },
          ],
        },
        {
          title: t(`${prefix}.quickAccess`),
          links: [
            { href: `/${locale}/kraanafspraak`, label: t(`${prefix}.crane`), description: t(`${prefix}.craneDesc`), icon: Ship },
          ],
        },
      ]}
    />
  );
}
