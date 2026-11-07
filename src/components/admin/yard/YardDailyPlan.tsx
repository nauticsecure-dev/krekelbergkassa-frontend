'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api-error';
import { control, yardEndpoint } from './YardHistory';

type Point = { x: number; y: number; location_code?: string };
type Job = {
  id: string; boat: string; title: string; actual?: Point; planned?: Point; assigned_to?: string;
  due_at?: string; priority: string; equipment?: string; instructions?: string; status: string;
};
type Plan = { generated_at: string; jobs: Job[] };
const position = (point?: Point) => point ? point.location_code || `${point.x.toFixed(1)} / ${point.y.toFixed(1)} m` : '—';
const amsterdam = { timeZone: 'Europe/Amsterdam' };

export function YardDailyPlan({ date, onClose }: { date: string; onClose: () => void }) {
  const [day, setDay] = useState(date);
  const [plan, setPlan] = useState<Plan>();
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    setPlan(undefined); setError('');
    api<Plan>(yardEndpoint + '/daily-plan', { query: { date: day } })
      .then((result) => { if (active) setPlan(result); })
      .catch((err) => { if (active) setError(getApiErrorMessage(err)); });
    return () => { active = false; };
  }, [day, retry]);

  return <div role="dialog" aria-label="Dagplanning" className="absolute inset-0 z-40 overflow-auto bg-slate-950 p-4 text-white" data-yard-print-wrapper>
    <style>{`@media print {
      body:has([data-yard-print]) :not(:has([data-yard-print])):not([data-yard-print]):not([data-yard-print] *) { display: none !important; }
      body:has([data-yard-print]) :has([data-yard-print]) { position: static !important; display: block !important; height: auto !important; min-height: 0 !important; max-height: none !important; overflow: visible !important; margin: 0 !important; padding: 0 !important; }
      [data-yard-print] article { break-inside: avoid; }
    }`}</style>
    <div className="mb-4 flex flex-wrap items-center gap-2 print:hidden">
      <label>Datum <input className={control} type="date" value={day} onChange={(event) => { if (event.target.value) setDay(event.target.value); }} /></label>
      <button className={control} disabled={!plan} onClick={() => window.print()}>Afdrukken / PDF</button>
      <button className={control} onClick={onClose}>Sluiten</button>
    </div>
    {error && <p role="alert">{error} <button className={control} onClick={() => setRetry(retry + 1)}>Opnieuw proberen</button></p>}
    {!plan && !error && <p role="status">Dagplanning laden…</p>}
    {plan && <section data-yard-print className="mx-auto max-w-3xl space-y-3 bg-white p-4 text-slate-950">
      <h2 className="text-xl font-semibold">Werfcanvas · Dagplanning {day}</h2>
      <p>Momentopname · opgehaald op {new Date(plan.generated_at).toLocaleString('nl-NL', amsterdam)} Nederlandse tijd.</p>
      {!plan.jobs.length && <p>Geen geplande werftaken voor deze datum.</p>}
      {plan.jobs.map((job) => <article key={job.id} className="space-y-1 border-t border-slate-300 py-2 text-sm">
        <h3 className="font-semibold">{job.boat} · {job.title}</h3>
        <p>Huidig · {position(job.actual)} | Voorgesteld · {position(job.planned)}</p>
        <p>{job.due_at ? new Date(job.due_at).toLocaleTimeString('nl-NL', { ...amsterdam, hour: '2-digit', minute: '2-digit' }) : 'Tijd onbekend'} · {job.assigned_to ?? 'Niet toegewezen'} · {job.priority} · {job.status}</p>
        {job.equipment && <p>Materieel · {job.equipment}</p>}
        {job.instructions && <p className="whitespace-pre-wrap">{job.instructions}</p>}
      </article>)}
    </section>}
  </div>;
}
