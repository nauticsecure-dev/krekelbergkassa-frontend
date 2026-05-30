export interface RemindersSummaryCounts {
  invoiceDue: number;
  contractsExpiring: number;
  workOrdersDue: number;
  total: number;
}

function readCount(value: unknown, key: string): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (value && typeof value === 'object' && key in (value as Record<string, unknown>)) {
    const nested = Number((value as Record<string, unknown>)[key]);
    return Number.isFinite(nested) ? nested : 0;
  }
  return 0;
}

/** Normalizes /v1/admin/reminders/summary into flat counts for the dashboard. */
export function normalizeRemindersSummary(raw: unknown): RemindersSummaryCounts {
  if (!raw || typeof raw !== 'object') {
    return { invoiceDue: 0, contractsExpiring: 0, workOrdersDue: 0, total: 0 };
  }

  const data = raw as Record<string, unknown>;

  if ('invoice_due' in data || 'contracts_expiring' in data || 'work_orders_due' in data) {
    const invoiceDue = readCount(data, 'invoice_due');
    const contractsExpiring = readCount(data, 'contracts_expiring');
    const workOrdersDue = readCount(data, 'work_orders_due');
    const total = readCount(data, 'total') || invoiceDue + contractsExpiring + workOrdersDue;
    return { invoiceDue, contractsExpiring, workOrdersDue, total };
  }

  let invoiceDue = 0;
  let contractsExpiring = 0;
  let workOrdersDue = 0;

  for (const bucket of ['today', 'upcoming', 'overdue', 'completed']) {
    const value = data[bucket];
    invoiceDue += readCount(value, 'invoice_due');
    contractsExpiring += readCount(value, 'contracts_expiring');
    workOrdersDue += readCount(value, 'work_orders_due');
  }

  const total = readCount(data, 'total') || invoiceDue + contractsExpiring + workOrdersDue;
  return { invoiceDue, contractsExpiring, workOrdersDue, total };
}
