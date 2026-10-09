'use client';

import {
  Activity,
  KeyRound,
  Settings,
  ShieldCheck,
  Users,
  Wrench,
  AlertTriangle,
} from 'lucide-react';
import { AdminModuleHub } from '@/components/admin/AdminModuleHub';
import { useIntl } from '@/i18n/IntlProvider';

export default function ManagementHubPage() {
  const { locale, t } = useIntl();
  const prefix = 'adminModules.hubs.management';

  return (
    <AdminModuleHub
      title={t(`${prefix}.title`)}
      subtitle={t(`${prefix}.subtitle`)}
      groups={[
        {
          title: t(`${prefix}.configuration`),
          links: [
            { href: `/${locale}/admin/gebruikers`, label: t(`${prefix}.users`), description: t(`${prefix}.usersDesc`), icon: Users },
            { href: `/${locale}/admin/instellingen`, label: t(`${prefix}.settings`), description: t(`${prefix}.settingsDesc`), icon: Settings },
          ],
        },
        {
          title: t(`${prefix}.system`),
          links: [
            { href: `/${locale}/admin/audit`, label: t(`${prefix}.audit`), description: t(`${prefix}.auditDesc`), icon: Activity },
            { href: `/${locale}/admin/beveiliging`, label: t(`${prefix}.security`), description: t(`${prefix}.securityDesc`), icon: ShieldCheck },
            { href: `/${locale}/admin/api-credentials`, label: t(`${prefix}.credentials`), description: t(`${prefix}.credentialsDesc`), icon: KeyRound },
            { href: `/${locale}/admin/incidenten`, label: t(`${prefix}.incidents`), description: t(`${prefix}.incidentsDesc`), icon: AlertTriangle },
            { href: `/${locale}/admin/systeem`, label: t(`${prefix}.systemAdmin`), description: t(`${prefix}.systemAdminDesc`), icon: Wrench },
          ],
        },
      ]}
    />
  );
}
