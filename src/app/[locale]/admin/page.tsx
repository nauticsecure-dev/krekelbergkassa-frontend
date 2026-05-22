'use client';

import Link from 'next/link';
import {
  ArrowRight,
  BarChart3,
  Calendar,
  CreditCard,
  FileText,
  ShoppingCart,
  Warehouse,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { AdminPageHeader } from '@/components/admin/AdminShell';
import { useIntl } from '@/i18n/IntlProvider';

export default function AdminDashboardPage() {
  const { t, locale } = useIntl();

  const tiles = [
    {
      href: `/${locale}/admin/kassa`,
      icon: ShoppingCart,
      label: t('admin.sidebar.kassa'),
      desc: t('admin.dashboard.tiles.kassaDesc'),
      tone: 'gold',
    },
    {
      href: `/${locale}/admin/stalling`,
      icon: Warehouse,
      label: t('admin.sidebar.stalling'),
      desc: t('admin.dashboard.tiles.stallingDesc', { count: '198' }),
      tone: 'marine',
    },
    {
      href: `/${locale}/admin/planning`,
      icon: Calendar,
      label: t('admin.sidebar.calendar'),
      desc: t('admin.dashboard.tiles.planningDesc', { count: '14' }),
      tone: 'navy',
    },
    {
      href: `/${locale}/admin/contracten`,
      icon: FileText,
      label: t('admin.sidebar.contracts'),
      desc: t('admin.dashboard.tiles.contractsDesc', { count: '12' }),
      tone: 'sand',
    },
    {
      href: `/${locale}/admin/audit`,
      icon: BarChart3,
      label: t('admin.sidebar.audit'),
      desc: t('admin.dashboard.tiles.auditDesc', { count: '1.248' }),
      tone: 'navy',
    },
    {
      href: `/${locale}/admin/facturen`,
      icon: CreditCard,
      label: t('admin.sidebar.invoices'),
      desc: t('admin.dashboard.tiles.invoicesDesc', { amount: '€ 12.450' }),
      tone: 'marine',
    },
  ] as const;

  return (
    <>
      <AdminPageHeader
        title={t('admin.dashboard.title')}
        subtitle={t('admin.dashboard.subtitle')}
        rightSlot={
          <Badge tone="success" dot>
            {t('admin.dashboard.operational')}
          </Badge>
        }
      />
      <div className="px-4 py-6 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tiles.map((tile) => {
            const Icon = tile.icon;
            const toneMap: Record<string, string> = {
              navy: 'bg-navy-50 text-navy-700',
              gold: 'bg-gold-50 text-gold-700',
              marine: 'bg-marine-50 text-marine-700',
              sand: 'bg-sand-100 text-sand-800',
            };
            return (
              <Link key={tile.href} href={tile.href}>
                <Card className="group flex items-start gap-4 p-5 transition hover:shadow-elev">
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-lg ${toneMap[tile.tone]}`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-base font-semibold text-navy-900">
                      {tile.label}
                    </div>
                    <div className="truncate text-xs text-navy-400">{tile.desc}</div>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-navy-300 transition group-hover:text-navy-700" />
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
