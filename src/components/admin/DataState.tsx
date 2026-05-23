'use client';

import { useIntl } from '@/i18n/IntlProvider';
import { AlertTriangle, Inbox } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';

type LoadingVariant = 'default' | 'table' | 'detail' | 'cards' | 'list';

export function LoadingState({
  label,
  variant = 'default',
}: {
  label?: string;
  variant?: LoadingVariant;
}) {
  const { t } = useIntl();
  const text = label ?? t('adminNew.common.loading');

  if (variant === 'table') {
    return (
      <div className="space-y-3 p-4">
        <div className="flex items-center gap-2 text-xs font-medium text-navy-500">{text}</div>
        <div className="overflow-hidden rounded-xl border border-navy-100">
          <div className="grid grid-cols-6 gap-3 border-b border-navy-100 bg-sand-50/70 px-4 py-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonBlock key={i} className="h-3 w-20" />
            ))}
          </div>
          <div className="divide-y divide-navy-100">
            {Array.from({ length: 7 }).map((_, row) => (
              <div key={row} className="grid grid-cols-6 gap-3 px-4 py-3">
                <SkeletonBlock className="h-4 w-24" />
                <SkeletonBlock className="h-4 w-28" />
                <SkeletonBlock className="h-4 w-20" />
                <SkeletonBlock className="h-4 w-16" />
                <SkeletonBlock className="h-4 w-24" />
                <SkeletonBlock className="h-4 w-14" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'detail') {
    return (
      <div className="space-y-5 p-4 sm:p-6">
        <div className="flex items-center gap-2 text-xs font-medium text-navy-500">{text}</div>
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="space-y-3 rounded-xl border border-navy-100 p-5 lg:col-span-2">
            <SkeletonBlock className="h-6 w-48" />
            <div className="grid gap-3 sm:grid-cols-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonBlock key={i} className="h-14 w-full" />
              ))}
            </div>
            <SkeletonBlock className="h-24 w-full" />
          </div>
          <div className="space-y-3 rounded-xl border border-navy-100 p-5">
            <SkeletonBlock className="h-6 w-32" />
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonBlock key={i} className="h-10 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'cards') {
    return (
      <div className="space-y-4 p-4">
        <div className="flex items-center gap-2 text-xs font-medium text-navy-500">{text}</div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-3 rounded-xl border border-navy-100 p-4">
              <SkeletonBlock className="h-4 w-24" />
              <SkeletonBlock className="h-6 w-36" />
              <SkeletonBlock className="h-3 w-28" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (variant === 'list') {
    return (
      <div className="space-y-3 p-4">
        <div className="flex items-center gap-2 text-xs font-medium text-navy-500">{text}</div>
        <div className="divide-y divide-navy-100 overflow-hidden rounded-xl border border-navy-100">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between px-4 py-3">
              <div className="space-y-2">
                <SkeletonBlock className="h-4 w-40" />
                <SkeletonBlock className="h-3 w-28" />
              </div>
              <SkeletonBlock className="h-8 w-20" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[220px] items-center justify-center p-4">
      <div className="w-full max-w-md space-y-2">
        <div className="text-center text-sm text-navy-500">{text}</div>
        <SkeletonBlock className="h-4 w-full" />
        <SkeletonBlock className="h-4 w-5/6" />
        <SkeletonBlock className="h-4 w-4/6" />
      </div>
    </div>
  );
}

export function ErrorState({
  title,
  message,
  onRetry,
}: {
  title?: string;
  message?: string | null;
  onRetry?: () => void;
}) {
  const { t } = useIntl();
  return (
    <div className="flex min-h-[220px] items-center justify-center px-4 text-center">
      <div>
        <AlertTriangle className="mx-auto h-8 w-8 text-rose-500" />
        <div className="mt-2 text-base font-semibold text-navy-900">{title ?? t('adminNew.states.errorTitle')}</div>
        {message ? <div className="mt-1 text-sm text-navy-500">{message}</div> : null}
        {onRetry ? (
          <Button onClick={onRetry} variant="outline" size="sm" className="mt-4">
            {t('adminNew.states.retry')}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  message,
  action,
}: {
  title?: string;
  message?: string;
  action?: React.ReactNode;
}) {
  const { t } = useIntl();
  return (
    <div className="flex min-h-[220px] items-center justify-center px-4 text-center">
      <div>
        <Inbox className="mx-auto h-8 w-8 text-navy-300" />
        <div className="mt-2 text-base font-semibold text-navy-900">{title ?? t('adminNew.states.emptyTitle')}</div>
        {message ? <div className="mt-1 text-sm text-navy-500">{message}</div> : null}
        {action ? <div className="mt-4">{action}</div> : null}
      </div>
    </div>
  );
}

function SkeletonBlock({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'block animate-pulse rounded-md bg-gradient-to-r from-navy-100 via-sand-100 to-navy-100 bg-[length:200%_100%] motion-safe:animate-[pulse_1.5s_ease-in-out_infinite]',
        className
      )}
    />
  );
}
