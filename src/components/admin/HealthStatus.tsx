'use client';

import {
  AlertTriangle,
  CheckCircle2,
  CircleDashed,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/cn';

export type HealthStatusKind = 'healthy' | 'degraded' | 'error' | 'unknown';

export function normalizeHealthStatus(status: string): HealthStatusKind {
  const s = status.toLowerCase();
  if (['ok', 'healthy', 'up', 'pass', 'passed', 'success'].includes(s)) return 'healthy';
  if (['degraded', 'warning', 'warn', 'partial', 'conflict'].includes(s)) return 'degraded';
  if (['error', 'down', 'fail', 'failed', 'critical'].includes(s)) return 'error';
  return 'unknown';
}

const STATUS_STYLE: Record<
  HealthStatusKind,
  { icon: LucideIcon; pill: string; iconColor: string; metricTone: 'success' | 'warning' | 'danger' | 'navy' }
> = {
  healthy: {
    icon: CheckCircle2,
    pill: 'border-emerald-200/80 bg-emerald-50 text-emerald-800',
    iconColor: 'text-emerald-600',
    metricTone: 'success',
  },
  degraded: {
    icon: AlertTriangle,
    pill: 'border-amber-200/80 bg-amber-50 text-amber-900',
    iconColor: 'text-amber-600',
    metricTone: 'warning',
  },
  error: {
    icon: XCircle,
    pill: 'border-rose-200/80 bg-rose-50 text-rose-800',
    iconColor: 'text-rose-600',
    metricTone: 'danger',
  },
  unknown: {
    icon: CircleDashed,
    pill: 'border-slate-200/80 bg-slate-50 text-slate-700',
    iconColor: 'text-slate-500',
    metricTone: 'navy',
  },
};

export function healthStatusMeta(status: string) {
  const kind = normalizeHealthStatus(status);
  return { kind, ...STATUS_STYLE[kind] };
}

export function HealthStatusBadge({
  status,
  label,
  size = 'md',
  className,
}: {
  status: string;
  label: string;
  size?: 'sm' | 'md';
  className?: string;
}) {
  const { icon: Icon, pill, iconColor } = healthStatusMeta(status);

  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-full border font-semibold leading-none',
        size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm',
        pill,
        className,
      )}
    >
      <Icon className={cn(size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4', iconColor)} aria-hidden />
      <span>{label}</span>
    </span>
  );
}
