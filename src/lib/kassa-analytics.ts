import type { Sale } from './api-types';

export interface KassaAnalyticsTotals {
  turnover_cents: number;
  transaction_count: number;
  avg_ticket_cents: number;
  refund_count: number;
}

export interface KassaAnalyticsSeriesPoint {
  label: string;
  value_cents: number;
}

export interface KassaAnalyticsPaymentSlice {
  method: string;
  count: number;
  amount_cents: number;
}

export interface KassaAnalyticsView {
  totals: KassaAnalyticsTotals;
  series: KassaAnalyticsSeriesPoint[];
  byPaymentMethod: KassaAnalyticsPaymentSlice[];
  periodLabel?: string;
}

function readNumber(obj: Record<string, unknown> | undefined, key: string): number {
  if (!obj) return 0;
  const raw = obj[key];
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw === 'string' && raw !== '') {
    const n = Number(raw);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function readSeries(data: Record<string, unknown>): KassaAnalyticsSeriesPoint[] {
  const candidates = [
    data.series,
    data.daily,
    data.by_day,
    data.chart,
    data.turnover_by_day,
    data.revenue_by_day,
  ];

  for (const candidate of candidates) {
    if (!Array.isArray(candidate)) continue;
    const points = candidate
      .map((item) => {
        if (!item || typeof item !== 'object') return null;
        const row = item as Record<string, unknown>;
        const label = String(row.label ?? row.date ?? row.day ?? row.period ?? '');
        const value_cents = readNumber(row, 'value_cents') ||
          readNumber(row, 'turnover_cents') ||
          readNumber(row, 'amount_cents') ||
          readNumber(row, 'total_cents') ||
          Math.round(readNumber(row, 'value') * 100) ||
          Math.round(readNumber(row, 'total_euros') * 100);
        if (!label) return null;
        return { label, value_cents };
      })
      .filter(Boolean) as KassaAnalyticsSeriesPoint[];
    if (points.length) return points;
  }

  return [];
}

function readPaymentMethods(data: Record<string, unknown>): KassaAnalyticsPaymentSlice[] {
  const candidates = [
    data.by_payment_method,
    data.payment_methods,
    data.methods,
    data.payments,
  ];

  for (const candidate of candidates) {
    if (!Array.isArray(candidate)) continue;
    const slices = candidate
      .map((item) => {
        if (!item || typeof item !== 'object') return null;
        const row = item as Record<string, unknown>;
        const method = String(row.method ?? row.payment_method ?? row.name ?? '—');
        const count = readNumber(row, 'count') || readNumber(row, 'transaction_count');
        const amount_cents =
          readNumber(row, 'amount_cents') ||
          readNumber(row, 'turnover_cents') ||
          readNumber(row, 'total_cents') ||
          Math.round(readNumber(row, 'amount_euros') * 100);
        return { method, count, amount_cents };
      })
      .filter(Boolean) as KassaAnalyticsPaymentSlice[];
    if (slices.length) return slices;
  }

  return [];
}

export function seriesFromSales(sales: Sale[], locale = 'nl-NL'): KassaAnalyticsSeriesPoint[] {
  const buckets = new Map<string, number>();

  for (const sale of sales) {
    const d = new Date(sale.created_at);
    if (Number.isNaN(d.getTime())) continue;
    const label = new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric' }).format(d);
    const cents =
      typeof sale.total_amount_cents === 'string'
        ? Number(sale.total_amount_cents)
        : sale.total_amount_cents;
    buckets.set(label, (buckets.get(label) ?? 0) + (Number.isFinite(cents) ? cents : 0));
  }

  return Array.from(buckets.entries()).map(([label, value_cents]) => ({ label, value_cents }));
}

export function totalsFromSales(sales: Sale[]): KassaAnalyticsTotals {
  let turnover_cents = 0;
  for (const sale of sales) {
    const raw =
      typeof sale.total_amount_cents === 'string'
        ? Number(sale.total_amount_cents)
        : sale.total_amount_cents;
    turnover_cents += Number.isFinite(raw) ? raw : 0;
  }
  const transaction_count = sales.length;
  const avg_ticket_cents = transaction_count ? Math.round(turnover_cents / transaction_count) : 0;
  return { turnover_cents, transaction_count, avg_ticket_cents, refund_count: 0 };
}

export function normalizeKassaAnalytics(
  data: Record<string, unknown> | null | undefined,
  fallbackSales: Sale[] = [],
  locale = 'nl-NL'
): KassaAnalyticsView {
  if (!data) {
    const totals = totalsFromSales(fallbackSales);
    return {
      totals,
      series: seriesFromSales(fallbackSales, locale),
      byPaymentMethod: [],
      periodLabel: undefined,
    };
  }

  const totalsObj = (data.totals ?? data.summary ?? data) as Record<string, unknown>;
  const totals: KassaAnalyticsTotals = {
    turnover_cents: readNumber(totalsObj, 'turnover_cents') || readNumber(totalsObj, 'revenue_cents'),
    transaction_count:
      readNumber(totalsObj, 'transaction_count') ||
      readNumber(totalsObj, 'transactions') ||
      readNumber(totalsObj, 'sales_count'),
    avg_ticket_cents:
      readNumber(totalsObj, 'avg_ticket_cents') || readNumber(totalsObj, 'average_ticket_cents'),
    refund_count: readNumber(totalsObj, 'refund_count') || readNumber(totalsObj, 'refunds'),
  };

  if (!totals.turnover_cents && fallbackSales.length) {
    const fallbackTotals = totalsFromSales(fallbackSales);
    totals.turnover_cents = fallbackTotals.turnover_cents;
    totals.transaction_count ||= fallbackTotals.transaction_count;
    totals.avg_ticket_cents ||= fallbackTotals.avg_ticket_cents;
  }

  if (!totals.avg_ticket_cents && totals.transaction_count > 0) {
    totals.avg_ticket_cents = Math.round(totals.turnover_cents / totals.transaction_count);
  }

  const series = readSeries(data);
  const byPaymentMethod = readPaymentMethods(data);

  return {
    totals,
    series: series.length ? series : seriesFromSales(fallbackSales, locale),
    byPaymentMethod,
    periodLabel: typeof data.period === 'string' ? data.period : undefined,
  };
}
