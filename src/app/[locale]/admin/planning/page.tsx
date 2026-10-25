'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { AdminPageHeader } from '@/components/admin/AdminShell';
import { LoadingState } from '@/components/admin/DataState';
import { Button } from '@/components/ui/Button';
import { adminHref } from '@/config/admin-routes';
import { useIntl } from '@/i18n/IntlProvider';
import { localDateKey } from '@/lib/appointment-calendar';
import { cn } from '@/lib/cn';

const CalendarAdminPage = dynamic(() => import('@/components/admin/CalendarAdminPage'), {
  loading: () => <LoadingState />,
});
const AppointmentsPage = dynamic(() => import('@/components/admin/AppointmentsPage'), {
  loading: () => <LoadingState />,
});
const WorkOrdersPage = dynamic(() => import('@/components/admin/WorkOrdersPage'), {
  loading: () => <LoadingState />,
});

const TABS = ['kalender', 'afspraken', 'vandaag', 'week', 'werf'] as const;
type PlanningTab = (typeof TABS)[number];

function normalizeTab(value: string | null): PlanningTab {
  return (TABS as readonly string[]).includes(value ?? '') ? (value as PlanningTab) : 'kalender';
}

export default function PlanningHubPage() {
  return (
    <React.Suspense fallback={<LoadingState />}>
      <PlanningWorkspace />
    </React.Suspense>
  );
}

function PlanningWorkspace() {
  const { locale, t } = useIntl();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = normalizeTab(searchParams.get('tab'));
  const prefix = 'adminModules.hubs.planning';

  const selectTab = (next: PlanningTab) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', next);
    if (next === 'vandaag') {
      params.set('view', 'day');
      params.set('date', localDateKey(new Date()));
    } else if (next === 'week') {
      params.set('view', 'week');
    } else if (next === 'afspraken' && !params.get('view')) {
      params.set('view', 'week');
    }
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const tabs: { id: PlanningTab; label: string }[] = [
    { id: 'kalender', label: t(`${prefix}.tabCalendar`, { defaultValue: 'Kalender' }) },
    { id: 'afspraken', label: t(`${prefix}.tabAppointments`, { defaultValue: 'Afspraken' }) },
    { id: 'vandaag', label: t(`${prefix}.tabToday`, { defaultValue: 'Vandaag' }) },
    { id: 'week', label: t(`${prefix}.tabWeek`, { defaultValue: 'Week' }) },
    { id: 'werf', label: t(`${prefix}.tabYard`, { defaultValue: 'Werfplanning' }) },
  ];

  return (
    <>
      <AdminPageHeader
        title={t(`${prefix}.title`)}
        subtitle={t(`${prefix}.subtitle`)}
        rightSlot={
          <div className="flex flex-wrap gap-2">
            <Link href={adminHref(locale, 'admin.planning.create')}>
              <Button variant="gold" size="sm">{t('adminModules.create.appointment')}</Button>
            </Link>
            <Link href={`/${locale}/kraanafspraak`}>
              <Button variant="outline" size="sm">{t(`${prefix}.crane`)}</Button>
            </Link>
          </div>
        }
      >
        <div role="tablist" aria-label={t(`${prefix}.title`)} className="mt-4 flex flex-wrap gap-1">
          {tabs.map((item) => {
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => selectTab(item.id)}
                className={cn(
                  'rounded-lg px-3 py-2 text-sm font-semibold transition',
                  active ? 'bg-navy-900 text-white' : 'bg-white text-navy-600 hover:bg-sand-100',
                )}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </AdminPageHeader>

      {tab === 'kalender' ? <CalendarAdminPage embedded /> : null}
      {tab === 'afspraken' || tab === 'vandaag' || tab === 'week' ? <AppointmentsPage embedded /> : null}
      {tab === 'werf' ? <WorkOrdersPage embedded /> : null}
    </>
  );
}
