'use client';

import * as React from 'react';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { ArrowRight, Search } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Card } from '@/components/ui/Card';
import type { PaginationMeta } from '@/lib/api-types';
import { Pagination } from '@/components/admin/Pagination';

export function AdminContent({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('mx-auto w-full max-w-[1440px] space-y-5 px-4 pb-6 pt-2 sm:px-6 sm:pb-8', className)}>
      {children}
    </div>
  );
}

export function AdminMetricGrid({ children }: { children: React.ReactNode }) {
  return <div className="bento-grid-4">{children}</div>;
}

export function AdminMetric({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'navy',
  loading,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon?: LucideIcon;
  tone?: 'navy' | 'marine' | 'gold' | 'success' | 'danger' | 'warning';
  loading?: boolean;
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
    <Card className="surface-float-hover relative overflow-hidden p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-widest text-navy-400">
            {label}
          </div>
          <div className="mt-1 text-2xl font-semibold text-navy-900">
            {loading ? (
              <span className="block h-8 w-24 animate-pulse rounded-md bg-navy-100" />
            ) : (
              value
            )}
          </div>
          {hint ? (
            <div className="mt-1 text-xs text-navy-500">
              {loading ? <span className="block h-3 w-32 animate-pulse rounded bg-navy-100" /> : hint}
            </div>
          ) : null}
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
    </Card>
  );
}

export function AdminToolbar({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn('p-3 shadow-card sm:p-4', className)}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">{children}</div>
    </Card>
  );
}

export function AdminSearchInput({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={cn('relative min-w-0 flex-1', className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-400" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="input-base w-full pl-9"
      />
    </div>
  );
}

export function AdminSelect({
  value,
  onChange,
  children,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <select
      className={cn('input-base w-full lg:w-auto lg:min-w-[180px]', className)}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {children}
    </select>
  );
}

export function AdminFilterPill({
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

export function AdminTableCard({
  children,
  footer,
}: {
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <Card className="overflow-hidden shadow-card">
      {children}
      {footer}
    </Card>
  );
}

export function AdminTable({
  children,
  minWidth = 840,
}: {
  children: React.ReactNode;
  minWidth?: number;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm" style={{ minWidth }}>
        {children}
      </table>
    </div>
  );
}

export function AdminTableHead({ children }: { children: React.ReactNode }) {
  return (
    <thead className="bg-gradient-to-b from-sand-50 to-sand-50/40 text-left text-[11px] uppercase tracking-widest text-navy-500">
      {children}
    </thead>
  );
}

export function AdminTableRow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <tr className={cn('transition hover:bg-sand-50/80', className)}>{children}</tr>
  );
}

export function AdminTableCell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <td className={cn('border-t border-navy-100 px-4 py-3.5 align-middle', className)}>{children}</td>;
}

export function AdminTableHeaderCell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th className={cn('px-4 py-3 font-semibold first:pl-5 last:pr-5', className)}>{children}</th>
  );
}

export function AdminTableFooter({
  summary,
  meta,
  onPageChange,
}: {
  summary: React.ReactNode;
  meta?: PaginationMeta;
  onPageChange: (page: number) => void;
}) {
  return (
    <div className="flex flex-col gap-3 border-t border-navy-100 bg-sand-50/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-xs font-medium text-navy-500">{summary}</span>
      <Pagination meta={meta} onChange={onPageChange} />
    </div>
  );
}

export function AdminLinkButton({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 text-sm font-semibold text-marine-700 transition hover:text-marine-900"
    >
      {children}
      <ArrowRight className="h-3.5 w-3.5" />
    </Link>
  );
}

export function AdminQuickAction({
  href,
  label,
  description,
  icon: Icon,
  tone = 'marine',
}: {
  href: string;
  label: string;
  description?: string;
  icon: LucideIcon;
  tone?: 'marine' | 'gold' | 'navy' | 'success';
}) {
  const tones: Record<string, string> = {
    marine: 'bg-marine-50 text-marine-700',
    gold: 'bg-gold-50 text-gold-700',
    navy: 'bg-navy-50 text-navy-700',
    success: 'bg-emerald-50 text-emerald-700',
  };

  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-xl border border-navy-100 bg-white p-3.5 transition hover:-translate-y-0.5 hover:border-navy-200 hover:shadow-sm"
    >
      <span
        className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition',
          tones[tone]
        )}
      >
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-navy-900">{label}</div>
        {description ? (
          <div className="truncate text-[11px] text-navy-500">{description}</div>
        ) : null}
      </div>
      <ArrowRight className="h-4 w-4 shrink-0 text-navy-300 transition group-hover:translate-x-0.5 group-hover:text-navy-700" />
    </Link>
  );
}

export function AdminPanel({
  title,
  description,
  action,
  children,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn('overflow-hidden shadow-card', className)}>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-navy-100 bg-white px-5 py-4">
        <div>
          <h3 className="text-sm font-semibold text-navy-900">{title}</h3>
          {description ? <p className="mt-0.5 text-xs text-navy-500">{description}</p> : null}
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </Card>
  );
}

export function AdminSectionCard({
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

export function AdminListItem({
  title,
  subtitle,
  error,
  meta,
  actions,
  className,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  error?: React.ReactNode;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-3 rounded-xl border border-navy-100 bg-gradient-to-r from-white to-sand-50/40 px-4 py-3 transition hover:border-navy-200',
        className
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="font-medium text-navy-900">{title}</div>
        {subtitle ? <div className="text-xs text-navy-500">{subtitle}</div> : null}
        {error ? <div className="mt-0.5 text-xs text-rose-600">{error}</div> : null}
      </div>
      {meta ? <div className="text-xs text-navy-500">{meta}</div> : null}
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function AdminModalHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="border-b border-navy-100 px-6 pb-5 pt-6 pr-14">
      <h2 className="heading-display text-xl text-navy-900">{title}</h2>
      {subtitle ? <p className="mt-1 text-sm text-navy-500">{subtitle}</p> : null}
    </div>
  );
}

export function AdminModalBody({ children }: { children: React.ReactNode }) {
  return <div className="space-y-4 px-6 py-5">{children}</div>;
}

export function AdminModalFooter({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2 border-t border-navy-100 bg-sand-50/50 px-6 py-4">
      {children}
    </div>
  );
}

export function AdminTabBar<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: Array<{ id: T; label: string; icon?: LucideIcon }>;
  active: T;
  onChange: (id: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1 rounded-xl border border-navy-100 bg-white p-1 shadow-card">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition',
              isActive
                ? 'bg-navy-900 text-white shadow-sm'
                : 'text-navy-600 hover:bg-sand-50 hover:text-navy-900'
            )}
          >
            {Icon ? <Icon className="h-4 w-4" /> : null}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

export function AdminDetailGrid({
  items,
}: {
  items: Array<{ label: string; value: React.ReactNode }>;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-xl border border-navy-100 bg-sand-50/50 px-3 py-2.5"
        >
          <div className="text-[11px] font-semibold uppercase tracking-wide text-navy-400">
            {item.label}
          </div>
          <div className="mt-1 text-sm font-medium text-navy-900">{item.value}</div>
        </div>
      ))}
    </div>
  );
}

export function AdminStatusStrip({
  label,
  value,
  tone = 'navy',
}: {
  label: string;
  value: React.ReactNode;
  tone?: 'navy' | 'marine' | 'gold' | 'success' | 'danger' | 'warning';
}) {
  const tones: Record<string, string> = {
    navy: 'border-navy-200 bg-navy-50/50',
    marine: 'border-marine-200 bg-marine-50/50',
    gold: 'border-gold-200 bg-gold-50/50',
    success: 'border-emerald-200 bg-emerald-50/50',
    danger: 'border-rose-200 bg-rose-50/50',
    warning: 'border-amber-200 bg-amber-50/50',
  };

  return (
    <div className={cn('flex items-center justify-between rounded-xl border px-4 py-3', tones[tone])}>
      <span className="text-sm text-navy-600">{label}</span>
      <span className="text-sm font-semibold text-navy-900">{value}</span>
    </div>
  );
}
