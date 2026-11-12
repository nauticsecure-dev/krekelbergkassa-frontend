'use client';
import { TranslatedText } from '@/components/cms/TranslatedText';

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
    <h2 className="text-lg font-semibold"><TranslatedText textKey="siteCopy.13b42dd0ee393181" fallbackText={"Historie"} />{' '}{result && `(${result.total})`}</h2>
    <p className="text-sm text-slate-300"><TranslatedText textKey="siteCopy.53e12b527b169d89" fallbackText={"Oudere registraties kunnen onvolledig zijn. Alleen vastgelegde gebeurtenissen worden getoond."} /></p>
    <form className="flex flex-wrap gap-2" onSubmit={(event) => {
      event.preventDefault();
      setPage(1);
      setFilters(Object.fromEntries(new FormData(event.currentTarget)) as Record<string, string>);
    }}>
      {!boatId && <label className="grid text-xs"><TranslatedText textKey="siteCopy.bc3f383a9acf2f9b" fallbackText={"Boot-ID"} /><input name="boat_id" className={control} /></label>}
      {!boatId && <label className="grid text-xs"><TranslatedText textKey="siteCopy.0c13fff0e4ab7055" fallbackText={"Klant-ID"} /><input name="customer_id" className={control} /></label>}
      <label className="grid text-xs"><TranslatedText textKey="siteCopy.0a211792d9564974" fallbackText={"Van"} /><input type="date" name="from" className={control} /></label>
      <label className="grid text-xs"><TranslatedText textKey="siteCopy.5775f506a94535c4" fallbackText={"Tot"} /><input type="date" name="to" className={control} /></label>
      <label className="grid text-xs"><TranslatedText textKey="siteCopy.4460741852a6e865" fallbackText={"Bron"} /><select name="source" defaultValue={initialSource} className={control}>
        <option value=""><TranslatedText textKey="siteCopy.1e7782191f040eed" fallbackText={"Alle bronnen"} inline={false} /></option><option value="boat"><TranslatedText textKey="siteCopy.e7d72b337803d53b" fallbackText={"Boten en werf"} inline={false} /></option>
        <option value="stallingcontract"><TranslatedText textKey="siteCopy.baf1cd7ddad50fb8" fallbackText={"Stalling en makelaardij"} inline={false} /></option><option value="appointment"><TranslatedText textKey="siteCopy.1c3e206d4954d6e9" fallbackText={"Afspraken"} inline={false} /></option>
        <option value="workorder"><TranslatedText textKey="siteCopy.d4bea565f1b4ce76" fallbackText={"Werkorders"} inline={false} /></option><option value="invoice"><TranslatedText textKey="siteCopy.a379d6afe2f21f5f" fallbackText={"Facturen"} inline={false} /></option><option value="payment"><TranslatedText textKey="siteCopy.ff4ea19475c656d3" fallbackText={"Betalingen"} inline={false} /></option>
        <option value="communication"><TranslatedText textKey="siteCopy.35b5ae00fd6b9e4b" fallbackText={"Communicatie"} inline={false} /></option>
        <option value="calculatorrecord"><TranslatedText textKey="siteCopy.0e2bc3d409ddcf97" fallbackText={"Calculaties en offertes"} inline={false} /></option><option value="task"><TranslatedText textKey="siteCopy.db608ee6fc165e93" fallbackText={"Taken"} inline={false} /></option>
      </select></label>
      {!boatId && <>
        <label className="grid text-xs"><TranslatedText textKey="siteCopy.14e23440e4ac7bcf" fallbackText={"Medewerker-ID"} /><input name="employee_id" className={control} /></label>
        <label className="grid text-xs"><TranslatedText textKey="siteCopy.e39309594928d3a3" fallbackText={"Gebeurteniscode"} /><input name="event" className={control} /></label>
        <label className="grid text-xs"><TranslatedText textKey="siteCopy.099899c4612af065" fallbackText={"Statuscode"} /><input name="status" className={control} /></label>
        <label className="grid text-xs"><TranslatedText textKey="siteCopy.c5911409ad20e757" fallbackText={"Dienstcode"} /><input name="service" className={control} /></label>
        <label className="grid text-xs"><TranslatedText textKey="siteCopy.677b7abeb0ac5f06" fallbackText={"Betaling"} /><select name="payment_state" className={control}>
          <option value=""><TranslatedText textKey="siteCopy.eae133c115e1f846" fallbackText={"Alle betaalstatussen"} inline={false} /></option><option value="paid"><TranslatedText textKey="siteCopy.9e29f6f29a5b93de" fallbackText={"Betaald"} inline={false} /></option>
          <option value="refunded"><TranslatedText textKey="siteCopy.67e9aba793214f9c" fallbackText={"Terugbetaald"} inline={false} /></option><option value="failed"><TranslatedText textKey="siteCopy.2e26eabe959e4f34" fallbackText={"Mislukt"} inline={false} /></option>
        </select></label>
      </>}
      <button className={`${control} self-end`}><TranslatedText textKey="siteCopy.f22fc3a5bd6a1ab6" fallbackText={"Filteren"} /></button>
    </form>
    {error && <p role="alert">{error}</p>}
    {!error && !result && <p role="status"><TranslatedText textKey="siteCopy.15f33d4996e9632a" fallbackText={"Historie laden…"} /></p>}
    {result?.total === 0 && <p><TranslatedText textKey="siteCopy.e9d5d3c606210358" fallbackText={"Geen vastgelegde gebeurtenissen gevonden."} /></p>}
    <ol className="divide-y divide-slate-700">
      {result?.data.map((item) => <li key={item.id} className="py-3">
        <div className="flex flex-wrap justify-between gap-2">
          <strong>{item.title ?? item.event}</strong>
          <time className="text-xs text-slate-300" dateTime={item.created_at}>{new Date(item.created_at).toLocaleString(locale)}</time>
        </div>
        <div className="flex flex-wrap gap-3 text-sm text-slate-300">
          <span>{item.actor}</span>
          {item.route && <Link className="text-blue-300 underline" href={`/${locale}/admin/${item.route}`}><TranslatedText textKey="siteCopy.b75bf853381b184d" fallbackText={"Open bron"} /></Link>}
        </div>
        {item.reason && <p className="text-sm">{item.reason}</p>}
        {(Object.keys(item.before).length > 0 || Object.keys(item.after).length > 0) &&
          <details className="text-xs"><summary className="cursor-pointer"><TranslatedText textKey="siteCopy.9fe1093e78acb0e8" fallbackText={"Vóór en na"} /></summary>
            <pre className="mt-2 whitespace-pre-wrap break-all">{JSON.stringify({ vóór: item.before, na: item.after }, null, 2)}</pre>
          </details>}
      </li>)}
    </ol>
    {result && result.last_page > 1 && <div className="flex items-center gap-2">
      <button className={control} disabled={page === 1} onClick={() => setPage(page - 1)}><TranslatedText textKey="siteCopy.6c6f27897b38c6d8" fallbackText={"Vorige"} /></button>
      <span>{page} / {result.last_page}</span>
      <button className={control} disabled={page >= result.last_page} onClick={() => setPage(page + 1)}><TranslatedText textKey="siteCopy.3b1a8ef6826c1965" fallbackText={"Volgende"} /></button>
    </div>}
  </section>;
}
