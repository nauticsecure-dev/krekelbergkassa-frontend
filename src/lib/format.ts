/** App locale (nl, en, de, fr) to a BCP-47 tag used by Intl. */
export function intlLocale(locale: string): string {
  switch (locale) {
    case 'en':
      return 'en-GB';
    case 'de':
      return 'de-DE';
    case 'fr':
      return 'fr-FR';
    default:
      return 'nl-NL';
  }
}

export function formatCurrency(value: number, locale = 'nl-NL', currency = 'EUR') {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatDate(value?: string | null, locale = 'nl-NL') {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

export function formatDateTime(value?: string | null, locale = 'nl-NL') {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export function centsToEuro(cents?: number | string | null) {
  if (cents == null) return 0;
  const n = typeof cents === 'string' ? Number(cents) : cents;
  return Number.isFinite(n) ? n / 100 : 0;
}
