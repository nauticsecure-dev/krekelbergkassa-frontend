'use client';

import * as React from 'react';
import {
  BarChart3,
  Hammer,
  UserCircle2,
  type LucideIcon,
} from 'lucide-react';
import { useIntl } from '@/i18n/IntlProvider';
import { cn } from '@/lib/cn';

export type LoginRole = 'customer' | 'staff' | 'manager';

interface RoleConfig {
  id: LoginRole;
  icon: LucideIcon;
  labelKey: string;
  shortKey: string;
  descKey: string;
  tone: 'marine' | 'gold' | 'navy';
}

export const LOGIN_ROLES: RoleConfig[] = [
  {
    id: 'customer',
    icon: UserCircle2,
    labelKey: 'loginRole.customer.label',
    shortKey: 'loginRole.customer.short',
    descKey: 'loginRole.customer.desc',
    tone: 'marine',
  },
  {
    id: 'staff',
    icon: Hammer,
    labelKey: 'loginRole.staff.label',
    shortKey: 'loginRole.staff.short',
    descKey: 'loginRole.staff.desc',
    tone: 'gold',
  },
  {
    id: 'manager',
    icon: BarChart3,
    labelKey: 'loginRole.manager.label',
    shortKey: 'loginRole.manager.short',
    descKey: 'loginRole.manager.desc',
    tone: 'navy',
  },
];

interface Props {
  value: LoginRole;
  onChange: (role: LoginRole) => void;
  className?: string;
}

export function RoleTabs({ value, onChange, className }: Props) {
  const { t } = useIntl();
  const active = LOGIN_ROLES.find((r) => r.id === value)!;

  return (
    <div className={cn('space-y-2', className)}>
      <div className="text-xs font-semibold uppercase tracking-widest text-navy-500">
        {t('loginRole.question')}
      </div>

      <div
        role="tablist"
        aria-label={t('loginRole.question')}
        className="inline-flex w-full rounded-lg border border-navy-100 bg-sand-50 p-1"
      >
        {LOGIN_ROLES.map((r) => {
          const Icon = r.icon;
          const isActive = value === r.id;
          return (
            <button
              key={r.id}
              role="tab"
              aria-selected={isActive}
              type="button"
              onClick={() => onChange(r.id)}
              className={cn(
                'inline-flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-gold-400/40',
                isActive
                  ? 'bg-white text-navy-900 shadow-sm ring-1 ring-navy-200'
                  : 'text-navy-500 hover:text-navy-800'
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{t(r.labelKey)}</span>
            </button>
          );
        })}
      </div>

      <p className="px-1 text-xs text-navy-500">{t(active.descKey)}</p>
    </div>
  );
}

export const ROLE_REDIRECTS: Record<LoginRole, string> = {
  customer: '/feed',
  staff: '/admin/kassa',
  manager: '/admin',
};

export function coerceLoginRole(value: string | null | undefined): LoginRole {
  if (value === 'staff' || value === 'manager' || value === 'customer') {
    return value;
  }
  return 'customer';
}
