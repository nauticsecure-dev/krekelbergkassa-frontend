'use client';
import { TranslatedText } from '@/components/cms/TranslatedText';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api-error';
import { control, yardEndpoint } from './YardHistory';
import { YardPlan, YardPoint, yardDayOffset, yardToday } from './daily-plan';

const position = (point?: YardPoint | null) => point ? point.location_code || `${point.x.toFixed(1)} / ${point.y.toFixed(1)} m` : '—';
const amsterdam = { timeZone: 'Europe/Amsterdam' };

export function YardDailyPlan({ date, refreshRevision, onClose }: { date: string; refreshRevision: number; onClose: () => void }) {
  const [day, setDay] = useState(date);
  const [plan, setPlan] = useState<YardPlan>();
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    setPlan(undefined); setError('');
    api<YardPlan>(yardEndpoint + '/daily-plan', { query: { date: day } })
      .then((result) => { if (active) setPlan(result); })
      .catch((err) => { if (active) setError(getApiErrorMessage(err)); });
    return () => { active = false; };
  }, [day, retry, refreshRevision]);

  return <div role="dialog" aria-label="Dagplanning" className="absolute inset-0 z-40 overflow-auto bg-slate-950 p-4 text-white" data-yard-print-wrapper>
    <style>{`@media print {
      body:has([data-yard-print]) :not(:has([data-yard-print])):not([data-yard-print]):not([data-yard-print] *) { display: none !important; }
      body:has([data-yard-print]) :has([data-yard-print]) { position: static !important; display: block !important; height: auto !important; min-height: 0 !important; max-height: none !important; overflow: visible !important; margin: 0 !important; padding: 0 !important; }
      [data-yard-print] article { break-inside: avoid; }
    }`}</style>
    <div className="mb-4 flex flex-wrap items-center gap-2 print:hidden">
      <button className={control} onClick={() => setDay(yardToday())}><TranslatedText textKey="yardDaily.today" /></button>
      <button className={control} onClick={() => setDay(yardDayOffset(yardToday(), 1))}><TranslatedText textKey="yardDaily.tomorrow" /></button>
      <button className={control} onClick={() => setDay(yardDayOffset(day, 7))}><TranslatedText textKey="yardDaily.week" /></button>
      <label><TranslatedText textKey="siteCopy.18aef06688df26a1" fallbackText={"Datum"} />{' '}<input className={control} type="date" value={day} onChange={(event) => { if (event.target.value) setDay(event.target.value); }} /></label>
      <button className={control} disabled={!plan} onClick={() => window.print()}><TranslatedText textKey="siteCopy.4d3b706e7c5e4cb0" fallbackText={"Afdrukken / PDF"} /></button>
      <button className={control} onClick={onClose}><TranslatedText textKey="siteCopy.f2565acb9bca9f44" fallbackText={"Sluiten"} /></button>
    </div>
    {error && <p role="alert">{error} <button className={control} onClick={() => setRetry(retry + 1)}><TranslatedText textKey="siteCopy.5d9ac3a109c5c365" fallbackText={"Opnieuw proberen"} /></button></p>}
    {!plan && !error && <p role="status"><TranslatedText textKey="siteCopy.d45c34448c8c998c" fallbackText={"Dagplanning laden…"} /></p>}
    {plan && <section data-yard-print className="mx-auto max-w-3xl space-y-3 bg-white p-4 text-slate-950">
      <h2 className="text-xl font-semibold"><TranslatedText textKey="siteCopy.bc77cd2ac8a3609a" fallbackText={"Werfcanvas · Dagplanning"} />{' '}{day}</h2>
      <p><TranslatedText textKey="siteCopy.3bf01a6902a30791" fallbackText={"Momentopname · opgehaald op"} />{' '}{new Date(plan.generated_at).toLocaleString('nl-NL', amsterdam)}{' '}<TranslatedText textKey="siteCopy.081fd4da1ffa0da2" fallbackText={"Nederlandse tijd."} /></p>
      {!plan.jobs.length && <p><TranslatedText textKey="siteCopy.0f5d738e29b4811f" fallbackText={"Geen geplande werftaken voor deze datum."} /></p>}
      {plan.jobs.map((job) => <article key={`${job.type}:${job.id}`} data-boat-id={job.boat_id} className="space-y-1 border-t border-slate-300 py-2 text-sm">
        {job.photo_url && <img src={job.photo_url} alt={job.boat} className="float-right ml-3 h-16 w-24 rounded object-cover" />}
        <h3 className="font-semibold">{job.boat} · {job.title}</h3>
        <p><TranslatedText textKey="siteCopy.80a785b8bd17d230" fallbackText={"Huidig ·"} />{' '}{position(job.actual)}{' '}<TranslatedText textKey="siteCopy.2afdb98ae5c18c70" fallbackText={"| Voorgesteld ·"} />{' '}{position(job.planned)}</p>
        <p>{job.due_at ? new Date(job.due_at).toLocaleTimeString('nl-NL', { ...amsterdam, hour: '2-digit', minute: '2-digit' }) : 'Tijd onbekend'} · {job.assigned_to ?? 'Niet toegewezen'} · {job.priority} · {job.status}</p>
        {job.equipment && <p><TranslatedText textKey="siteCopy.42877f2e39850810" fallbackText={"Materieel ·"} />{' '}{job.equipment}</p>}
        {job.instructions && <p className="whitespace-pre-wrap">{job.instructions}</p>}
      </article>)}
    </section>}
  </div>;
}
