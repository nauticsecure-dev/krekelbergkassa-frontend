export type YardPoint = { x: number; y: number; location_code?: string };
export type YardDailyJob = {
  id: string; type: 'yard_move' | 'boat' | 'work_order' | 'appointment';
  boat_id: string; boat: string; photo_url?: string | null; title: string;
  actual?: YardPoint | null; planned?: YardPoint | null; assigned_to?: string | null;
  due_at?: string | null; duration_minutes?: number | null; priority: string;
  equipment?: string | null; instructions?: string | null; status: string;
  service_board?: boolean;
};
export type YardPlan = { date: string; timezone: string; generated_at: string; next_task_id?: string | null; jobs: YardDailyJob[] };

// Calendar arithmetic on date-only strings stays independent of the browser timezone.
export function yardDayOffset(date: string, days: number): string {
  const day = new Date(`${date}T12:00:00Z`);
  day.setUTCDate(day.getUTCDate() + days);
  return day.toISOString().slice(0, 10);
}

export function yardToday(): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Amsterdam', dateStyle: 'short' }).format(new Date());
}

export function yardJobPath(locale: string, job: YardDailyJob): string {
  const base = `/${locale}/admin`;
  if (job.type === 'appointment') return `${base}/afspraken?appointment_id=${encodeURIComponent(job.id)}`;
  if (job.type === 'work_order') return `${base}/werkorders/${encodeURIComponent(job.id)}`;
  if (job.type === 'boat') return job.service_board
    ? `${base}/stalling/werfcanvas?task_id=${encodeURIComponent(job.id)}#dienstenbord`
    : `${base}/taken?task_id=${encodeURIComponent(job.id)}`;
  return `${base}/stalling/werfcanvas?task_id=${encodeURIComponent(job.id)}#verplaatsingen`;
}
