'use client';

import * as React from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Badge } from '@/components/ui/Badge';
import { useIntl } from '@/i18n/IntlProvider';

export function PortalContent({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('mx-auto w-full max-w-7xl space-y-5 px-4 pb-6 pt-2 sm:px-6 sm:pb-8', className)}>
      {children}
    </div>
  );
}

export function PortalSectionCard({
  title,
  description,
  icon: Icon,
  action,
  children,
  className,
}: {
  title: string;
  description?: string;
  icon: LucideIcon;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        'surface-float overflow-hidden rounded-2xl border border-navy-100/60 bg-white',
        className
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-navy-100/80 bg-gradient-to-r from-sand-50/90 via-white to-marine-50/30 px-5 py-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-marine-50 text-marine-700">
            <Icon className="h-4 w-4" />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-navy-900">{title}</h3>
            {description ? <p className="mt-0.5 text-xs text-navy-500">{description}</p> : null}
          </div>
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

export function PortalMetricGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="bento-grid sm:grid-cols-2 xl:grid-cols-4">{children}</div>
  );
}

export function PortalMetric({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'navy',
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: LucideIcon;
  tone?: 'navy' | 'marine' | 'gold' | 'success' | 'danger' | 'warning';
}) {
  const tones: Record<string, string> = {
    navy: 'bg-navy-50 text-navy-700',
    marine: 'bg-marine-50 text-marine-700',
    gold: 'bg-gold-50 text-gold-700',
    success: 'bg-emerald-50 text-emerald-700',
    danger: 'bg-rose-50 text-rose-700',
    warning: 'bg-amber-50 text-amber-700',
  };

  return (
    <div className="surface-float surface-float-hover p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-widest text-navy-400">
            {label}
          </div>
          <div className="mt-1 text-2xl font-semibold text-navy-900">{value}</div>
          {hint ? <div className="mt-1 text-xs text-navy-500">{hint}</div> : null}
        </div>
        {Icon ? (
          <span
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
              tones[tone]
            )}
          >
            <Icon className="h-4 w-4" />
          </span>
        ) : null}
      </div>
    </div>
  );
}

export function PortalFilterBar({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-2 rounded-xl2 border border-navy-100 bg-white p-3 shadow-card',
        className
      )}
    >
      {children}
    </div>
  );
}

export function PortalFilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full px-3 py-1.5 text-xs font-semibold transition',
        active
          ? 'bg-navy-900 text-white shadow-sm'
          : 'bg-sand-50 text-navy-600 hover:bg-sand-100 hover:text-navy-900'
      )}
    >
      {children}
    </button>
  );
}

export function PortalSectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2 flex items-center gap-2 px-1">
      <span className="text-[11px] font-semibold uppercase tracking-widest text-navy-400">
        {children}
      </span>
      <span className="h-px flex-1 bg-navy-100" />
    </div>
  );
}

export function PortalInteractiveRow({
  icon: Icon,
  tone = 'marine',
  title,
  subtitle,
  meta,
  trailing,
  unread,
  priority,
  onClick,
}: {
  icon: LucideIcon;
  tone?: 'marine' | 'gold' | 'navy' | 'sand' | 'success' | 'warning' | 'danger';
  title: string;
  subtitle?: string;
  meta?: string;
  trailing?: React.ReactNode;
  unread?: boolean;
  priority?: 'normal' | 'high' | 'urgent';
  onClick?: () => void;
}) {
  const iconTones: Record<string, string> = {
    marine: 'bg-marine-50 text-marine-700',
    gold: 'bg-gold-50 text-gold-700',
    navy: 'bg-navy-50 text-navy-700',
    sand: 'bg-sand-100 text-sand-800',
    success: 'bg-emerald-50 text-emerald-700',
    warning: 'bg-amber-50 text-amber-700',
    danger: 'bg-rose-50 text-rose-700',
  };
  const accent: Record<string, string> = {
    normal: 'bg-transparent',
    high: 'bg-amber-500',
    urgent: 'bg-rose-500',
  };

  const Comp = onClick ? 'button' : 'div';

  return (
    <Comp
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'group relative flex w-full items-start gap-4 rounded-2xl border border-navy-100 bg-white p-4 text-left transition',
        onClick && 'hover:border-navy-200 hover:shadow-sm'
      )}
    >
      <span
        aria-hidden
        className={cn(
          'absolute inset-y-3 left-0 w-[3px] rounded-full',
          accent[priority ?? 'normal']
        )}
      />
      <span
        className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
          iconTones[tone]
        )}
      >
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <div className="truncate text-sm font-semibold text-navy-900">{title}</div>
          {unread ? (
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-marine-500" aria-hidden />
          ) : null}
        </div>
        {subtitle ? (
          <p className="mt-0.5 text-xs leading-relaxed text-navy-500">{subtitle}</p>
        ) : null}
        {meta ? <div className="mt-1 text-[11px] text-navy-400">{meta}</div> : null}
      </div>
      {trailing ? <div className="shrink-0">{trailing}</div> : null}
    </Comp>
  );
}

export function PortalDetailGrid({
  items,
}: {
  items: Array<{ label: string; value: string }>;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {items.map((item) => (
        <div key={item.label} className="rounded-xl border border-navy-100 bg-sand-50/50 px-3 py-2.5">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-navy-400">
            {item.label}
          </div>
          <div className="mt-1 text-sm font-medium text-navy-900">{item.value}</div>
        </div>
      ))}
    </div>
  );
}

export function PortalModalHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="border-b border-navy-100 px-6 pb-5 pt-6 pr-14">
      {eyebrow ? (
        <div className="text-[11px] font-semibold uppercase tracking-widest text-navy-400">
          {eyebrow}
        </div>
      ) : null}
      <h2 className="heading-display mt-1 text-xl text-navy-900">{title}</h2>
      {subtitle ? <p className="mt-1 text-sm text-navy-500">{subtitle}</p> : null}
    </div>
  );
}

export function PortalModalBody({ children }: { children: React.ReactNode }) {
  return <div className="space-y-4 px-6 py-5">{children}</div>;
}

export function PortalModalFooter({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2 border-t border-navy-100 bg-sand-50/50 px-6 py-4">
      {children}
    </div>
  );
}

export function AppointmentStatusBadge({ status, statusGeneric, tooltip }: { status: string; statusGeneric?: string | null; tooltip?: string }) {
  const { t } = useIntl();
  // Trello #99: prefer the coarse status_generic bucket for colour when present;
  // the raw status string is exposed as a tooltip for yard staff who need detail.
  const normalized = (statusGeneric || status || '').toLowerCase();
  const title = tooltip ?? status;
  if (normalized.includes('confirm') || normalized.includes('approved')) {
    return <Badge tone="success" dot><span title={title}>{t('adminNew.portal.appointments.statusConfirmed')}</span></Badge>;
  }
  if (normalized.includes('complete') || normalized.includes('done')) {
    return <Badge tone="marine" dot><span title={title}>{t('adminNew.portal.appointments.statusCompleted')}</span></Badge>;
  }
  if (normalized.includes('cancel') || normalized.includes('no_show')) {
    return <Badge tone="sand"><span title={title}>{t('adminNew.portal.appointments.statusCancelled')}</span></Badge>;
  }
  if (normalized.includes('progress') || normalized.includes('started') || normalized.includes('water') || normalized.includes('wash')) {
    return <Badge tone="gold" dot><span title={title}>{t('adminNew.portal.appointments.statusInProgress')}</span></Badge>;
  }
  if (normalized.includes('pending') || normalized.includes('request') || normalized.includes('review')) {
    return <Badge tone="warning" dot><span title={title}>{t('adminNew.portal.appointments.statusPending')}</span></Badge>;
  }
  return <Badge tone="navy"><span title={title}>{status}</span></Badge>;
}

export function ContractStatusBadge({ status }: { status: string }) {
  const { t } = useIntl();
  const normalized = status.toLowerCase();
  if (normalized === 'active') {
    return <Badge tone="success" dot>{t('adminNew.portal.stalling.statusActive')}</Badge>;
  }
  if (normalized.includes('overdue')) {
    return <Badge tone="danger" dot>{t('adminNew.status.overdue')}</Badge>;
  }
  if (normalized.includes('expir')) {
    return <Badge tone="warning" dot>{t('adminNew.portal.stalling.statusExpiring')}</Badge>;
  }
  if (normalized.includes('cancel')) {
    return <Badge tone="sand">{t('adminNew.status.cancelled')}</Badge>;
  }
  return <Badge tone="navy">{status}</Badge>;
}

export function groupByDateKey<T extends { created_at?: string | null; appointment_date?: string | null }>(
  items: T[],
  key: 'created_at' | 'appointment_date' = 'created_at'
) {
  const groups = new Map<string, typeof items>();
  for (const item of items) {
    const raw = item[key];
    const dateKey = raw ? raw.slice(0, 10) : 'unknown';
    const list = groups.get(dateKey) ?? [];
    list.push(item);
    groups.set(dateKey, list);
  }
  return [...groups.entries()].sort(([a], [b]) => b.localeCompare(a));
}
