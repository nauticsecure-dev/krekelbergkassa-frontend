'use client';

import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { ArrowRight } from 'lucide-react';
import { AdminContent, AdminQuickAction } from '@/components/admin/AdminUi';
import { AdminPageHeader } from '@/components/admin/AdminShell';
import type { AdminHeaderStat } from '@/components/admin/AdminShell';

export interface AdminModuleLink {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
}

export interface AdminModuleGroup {
  title: string;
  links: AdminModuleLink[];
}

export function AdminModuleHub({
  title,
  subtitle,
  groups,
  stats,
  actions,
  actionsLabel,
}: {
  title: string;
  subtitle: string;
  groups: AdminModuleGroup[];
  stats?: AdminHeaderStat[];
  actions?: AdminModuleLink[];
  actionsLabel?: string;
}) {
  return (
    <>
      <AdminPageHeader title={title} subtitle={subtitle} stats={stats} />
      <AdminContent>
        {actions?.length ? (
          <section className="space-y-3" aria-label={actionsLabel ?? title}>
            {actionsLabel ? (
              <h2 className="text-sm font-semibold uppercase tracking-widest text-navy-500">
                {actionsLabel}
              </h2>
            ) : null}
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {actions.map(({ href, label, description, icon }) => (
                <AdminQuickAction
                  key={href}
                  href={href}
                  label={label}
                  description={description}
                  icon={icon}
                  tone="gold"
                />
              ))}
            </div>
          </section>
        ) : null}
        {groups.map((group) => (
          <section key={group.title} className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-navy-500">{group.title}</h2>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {group.links.map(({ href, label, description, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className="group flex min-h-28 items-center gap-4 rounded-2xl border border-navy-100 bg-white p-4 shadow-card transition hover:-translate-y-0.5 hover:border-navy-200 hover:shadow-elev"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-marine-50 text-marine-700">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-navy-900">{label}</span>
                    <span className="mt-1 block text-sm text-navy-500">{description}</span>
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-navy-300 transition group-hover:translate-x-0.5 group-hover:text-navy-700" />
                </Link>
              ))}
            </div>
          </section>
        ))}
      </AdminContent>
    </>
  );
}
