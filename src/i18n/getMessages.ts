import 'server-only';
import { Locale, defaultLocale, locales } from './config';

import nl from './messages/nl.json';
import en from './messages/en.json';
import de from './messages/de.json';

const all: Record<Locale, Record<string, unknown>> = { nl, en, de };

export type Messages = typeof nl;

export function getMessages(locale: string): Messages {
  const safe = (locales as readonly string[]).includes(locale)
    ? (locale as Locale)
    : defaultLocale;
  return all[safe] as Messages;
}

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}
