'use client';

import * as React from 'react';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

export type PageHeaderStatTone =
  | 'navy'
  | 'marine'
  | 'gold'
  | 'success'
  | 'danger'
  | 'warning';

export type PageHeaderStat = {
  label: string;
  value: React.ReactNode;
  hint?: string;
  loading?: boolean;
  icon?: LucideIcon;
  tone?: PageHeaderStatTone;
  href?: string;
  /** Small shortcut icon in the card header (e.g. pencil → edit page). */
  actionIcon?: LucideIcon;
  actionHref?: string;
  actionLabel?: string;
};

const toneStyles: Record<PageHeaderStatTone, string> = {
  navy: 'bg-navy-50 text-navy-700',
  marine: 'bg-marine-50 text-marine-700',
  gold: 'bg-gold-50 text-gold-700',
  success: 'bg-emerald-50 text-emerald-700',
  danger: 'bg-rose-50 text-rose-700',
  warning: 'bg-amber-50 text-amber-700',
};

function PageHeaderStatCard({ stat }: { stat: PageHeaderStat }) {
  const Icon = stat.icon;
  const ActionIcon = stat.actionIcon;
  const tone = stat.tone ?? 'navy';

  const inner = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <div className="text-[10px] font-bold uppercase tracking-widest text-navy-400">
              {stat.label}
            </div>
            {ActionIcon && stat.actionHref ? (
              <Link
                href={stat.actionHref}
                aria-label={stat.actionLabel ?? stat.label}
                className="inline-flex rounded-md p-0.5 text-navy-400 transition hover:bg-sand-100 hover:text-marine-700"
                onClick={(e) => e.stopPropagation()}
              >
                <ActionIcon className="h-3 w-3" />
              </Link>
            ) : null}
          </div>
          <div className="mt-1 text-2xl font-semibold tabular-nums text-navy-900">
            {stat.loading ? (
              <span className="inline-block h-7 w-14 animate-pulse rounded-md bg-navy-100" />
            ) : (
              stat.value
            )}
          </div>
          {stat.hint && !stat.loading ? (
            <div className="mt-0.5 text-xs leading-relaxed text-navy-500">{stat.hint}</div>
          ) : null}
        </div>
        {Icon ? (
          <span
            className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
              toneStyles[tone]
            )}
          >
            <Icon className="h-4 w-4" />
          </span>
        ) : null}
      </div>
    </>
  );

  const className = cn(
    'block rounded-xl border border-navy-100/60 bg-white/95 px-4 py-3.5 shadow-sm transition',
    stat.href ? 'hover:border-navy-200/70 hover:shadow-md' : 'hover:border-navy-200/70'
  );

  if (stat.href) {
    return (
      <Link href={stat.href} className={className}>
        {inner}
      </Link>
    );
  }

  return <div className={className}>{inner}</div>;
}

export function PageHeaderStatsGrid({ stats }: { stats: PageHeaderStat[] }) {
  if (!stats.length) return null;

  return (
    <div className="relative mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {stats.map((stat) => (
        <PageHeaderStatCard key={stat.label} stat={stat} />
      ))}
    </div>
  );
}
