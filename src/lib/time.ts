/** Normalize API time strings (HH:MM or HH:MM:SS) to HH:MM for `<input type="time">`. */
export function toTimeInputValue(value: string | null | undefined): string {
  if (!value) return '';
  const match = value.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return value;
  return `${match[1].padStart(2, '0')}:${match[2]}`;
}

/** Display time without seconds — e.g. "08:00:00" → "08:00". */
export function formatTimeDisplay(value: string | null | undefined): string {
  return toTimeInputValue(value) || '—';
}

/** Parse time to minutes from midnight; supports HH:MM and HH:MM:SS. */
export function parseTimeToMinutes(value: string | null | undefined): number | null {
  if (!value) return null;
  const match = value.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
}

export function formatTimeRange(
  from: string | null | undefined,
  until: string | null | undefined
): string {
  const a = formatTimeDisplay(from);
  const b = formatTimeDisplay(until);
  if (a === '—' || b === '—') return '—';
  return `${a} – ${b}`;
}
