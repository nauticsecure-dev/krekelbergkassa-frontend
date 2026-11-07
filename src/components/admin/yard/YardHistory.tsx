'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export const yardEndpoint = '/v1/admin/yard-canvas';

export const control = 'rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-50';

export type Page<T> = { data: T[]; current_page: number; last_page: number; total: number };

type HistoryEvent = {
  id: string;
  event: string;
  title: string;
  route: string | null;
  actor: string | null;
  created_at: string;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  reason: string | null;
};

export function YardHistory({ locale, boatId, revision, initialSource = '' }: { locale: string; boatId?: string; revision: number; initialSource?: string }) {
  const [filters, setFilters] = useState<Record<string, string>>({ source: initialSource });
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<Page<HistoryEvent>>();
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    setResult(undefined);
    setError('');
    api<{ events: Page<HistoryEvent> }>(`${yardEndpoint}/history`, { query: { ...filters, boat_id: boatId ?? filters.boat_id, page } })
      .then(({ events }) => { if (active) setResult(events); })
      .catch((err) => { if (active) setError(err.message); });
    return () => { active = false; };
  }, [boatId, filters, page, revision]);

  return <section className="space-y-4">
    <h2 className="text-lg font-semibold">Historie {result && `(${result.total})`}</h2>
    <p className="text-sm text-slate-300">Oudere registraties kunnen onvolledig zijn. Alleen vastgelegde gebeurtenissen worden getoond.</p>
    <form className="flex flex-wrap gap-2" onSubmit={(event) => {
      event.preventDefault();
      setPage(1);
      setFilters(Object.fromEntries(new FormData(event.currentTarget)) as Record<string, string>);
    }}>
      {!boatId && <label className="grid text-xs">Boot-ID<input name="boat_id" className={control} /></label>}
      {!boatId && <label className="grid text-xs">Klant-ID<input name="customer_id" className={control} /></label>}
      <label className="grid text-xs">Van<input type="date" name="from" className={control} /></label>
      <label className="grid text-xs">Tot<input type="date" name="to" className={control} /></label>
      <label className="grid text-xs">Bron<select name="source" defaultValue={initialSource} className={control}>
        <option value="">Alle bronnen</option><option value="boat">Boten en werf</option>
        <option value="stallingcontract">Stalling en makelaardij</option><option value="appointment">Afspraken</option>
        <option value="workorder">Werkorders</option><option value="invoice">Facturen</option><option value="payment">Betalingen</option>
        <option value="communication">Communicatie</option>
      </select></label>
      {!boatId && <>
        <label className="grid text-xs">Medewerker-ID<input name="employee_id" className={control} /></label>
        <label className="grid text-xs">Gebeurteniscode<input name="event" className={control} /></label>
        <label className="grid text-xs">Statuscode<input name="status" className={control} /></label>
        <label className="grid text-xs">Dienstcode<input name="service" className={control} /></label>
        <label className="grid text-xs">Betaling<select name="payment_state" className={control}>
          <option value="">Alle betaalstatussen</option><option value="paid">Betaald</option>
          <option value="refunded">Terugbetaald</option><option value="failed">Mislukt</option>
        </select></label>
      </>}
      <button className={`${control} self-end`}>Filteren</button>
    </form>
    {error && <p role="alert">{error}</p>}
    {!error && !result && <p role="status">Historie laden…</p>}
    {result?.total === 0 && <p>Geen vastgelegde gebeurtenissen gevonden.</p>}
    <ol className="divide-y divide-slate-700">
      {result?.data.map((item) => <li key={item.id} className="py-3">
        <div className="flex flex-wrap justify-between gap-2">
          <strong>{item.title ?? item.event}</strong>
          <time className="text-xs text-slate-300" dateTime={item.created_at}>{new Date(item.created_at).toLocaleString(locale)}</time>
        </div>
        <div className="flex flex-wrap gap-3 text-sm text-slate-300">
          <span>{item.actor}</span>
          {item.route && <Link className="text-blue-300 underline" href={`/${locale}/admin/${item.route}`}>Open bron</Link>}
        </div>
        {item.reason && <p className="text-sm">{item.reason}</p>}
        {(Object.keys(item.before).length > 0 || Object.keys(item.after).length > 0) &&
          <details className="text-xs"><summary className="cursor-pointer">Vóór en na</summary>
            <pre className="mt-2 whitespace-pre-wrap break-all">{JSON.stringify({ vóór: item.before, na: item.after }, null, 2)}</pre>
          </details>}
      </li>)}
    </ol>
    {result && result.last_page > 1 && <div className="flex items-center gap-2">
      <button className={control} disabled={page === 1} onClick={() => setPage(page - 1)}>Vorige</button>
      <span>{page} / {result.last_page}</span>
      <button className={control} disabled={page >= result.last_page} onClick={() => setPage(page + 1)}>Volgende</button>
    </div>}
  </section>;
}
