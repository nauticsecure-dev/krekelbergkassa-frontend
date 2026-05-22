'use client';

import React, { createContext, useContext, useMemo } from 'react';
import type { Locale } from './config';

type Dict = Record<string, unknown>;

interface IntlContextValue {
  locale: Locale;
  messages: Dict;
  t: (path: string, vars?: Record<string, string | number>) => string;
}

const IntlContext = createContext<IntlContextValue | null>(null);

function getByPath(dict: Dict, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object' && key in (acc as Dict)) {
      return (acc as Dict)[key];
    }
    return undefined;
  }, dict);
}

function interpolate(value: string, vars?: Record<string, string | number>) {
  if (!vars) return value;
  return value.replace(/\{(\w+)\}/g, (_, k) =>
    vars[k] != null ? String(vars[k]) : `{${k}}`
  );
}

export function IntlProvider({
  locale,
  messages,
  children,
}: {
  locale: Locale;
  messages: Dict;
  children: React.ReactNode;
}) {
  const value = useMemo<IntlContextValue>(
    () => ({
      locale,
      messages,
      t: (path, vars) => {
        const v = getByPath(messages, path);
        if (typeof v === 'string') return interpolate(v, vars);
        return path;
      },
    }),
    [locale, messages]
  );
  return <IntlContext.Provider value={value}>{children}</IntlContext.Provider>;
}

export function useIntl() {
  const ctx = useContext(IntlContext);
  if (!ctx) throw new Error('useIntl must be used inside IntlProvider');
  return ctx;
}

export function useT() {
  return useContext(IntlContext)?.t ?? ((p: string) => p);
}
