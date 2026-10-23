import 'server-only';
import { Locale, defaultLocale, locales } from './config';
import { frenchCreateLabels, shortcutCopy } from './phase1-overlays';

import nl from './messages/nl.json';
import en from './messages/en.json';
import de from './messages/de.json';
import fr from './messages/fr.json';

const all: Record<Locale, Record<string, unknown>> = { nl, en, de, fr: fr as typeof nl };

export type Messages = typeof nl;

export function getMessages(locale: string): Messages {
  const safe = (locales as readonly string[]).includes(locale)
    ? (locale as Locale)
    : defaultLocale;
  const base = all[safe] as Messages & {
    adminNew?: Record<string, unknown>;
    adminModules?: { create?: Record<string, string> };
  };
  const withShortcuts = {
    ...base,
    adminNew: {
      ...(base.adminNew ?? {}),
      shortcuts: shortcutCopy[safe],
    },
  };
  if (safe !== 'fr') return withShortcuts as Messages;
  return {
    ...withShortcuts,
    adminModules: {
      ...base.adminModules,
      create: {
        ...(base.adminModules?.create ?? {}),
        ...frenchCreateLabels,
      },
    },
  } as Messages;
}

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}
