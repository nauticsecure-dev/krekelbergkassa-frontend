'use client';
import { TranslatedText } from '@/components/cms/TranslatedText';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api-error';
import { control, yardEndpoint, type Page } from './YardHistory';
import { YardServicePlan } from './YardServicePlan';
import { YardSchedulingSettings } from './YardSchedulingSettings';

type Column = { id: string; label: string; state: string; archived: boolean; replacement_id?: string };
type Config = { version: number; columns: Column[] };
type Card = { id: string; boat_id: string; boat_name: string; title: string; status: string; column_id: string; service_code: string | null;
  version: number; ready: boolean; entity_type: string; priority: string; assigned_to: string | null; due_at: string | null;
  actual: { x: number; y: number } | null; planned: { x: number; y: number } | null };
type Board = { config: Config; can_configure: boolean; can_transition?: boolean; cards: Page<Card>; services: { id: string; name: string; service_code: string }[] };
const stateLabels: Record<string, string> = { open: 'Te doen', in_progress: 'Bezig', done: 'Gereed', cancelled: 'Geannuleerd' };
const priorityLabels: Record<string, string> = { low: 'Laag', normal: 'Normaal', high: 'Hoog', urgent: 'Urgent' };

export function YardServiceBoard({ locale, boatId, onChange }: { locale: string; boatId?: string; onChange: () => void }) {
  const [board, setBoard] = useState<Board>();
  const [editing, setEditing] = useState<Config>();
  const [service, setService] = useState('');
  const [date, setDate] = useState('');
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [planningBoat, setPlanningBoat] = useState<string>();
  const [scheduleSettings, setScheduleSettings] = useState(false);
  useEffect(() => {
    let active = true;
    const load = () => api<Board>(`${yardEndpoint}/service-board`, { query: { service_code: service, date, page } })
      .then((data) => { if (active) { setBoard(data); setError(''); } })
      .catch((err) => { if (active) setError(getApiErrorMessage(err)); });
    void load();
    const timer = setInterval(() => void load(), 30000);
    return () => { active = false; clearInterval(timer); };
  }, [service, date, page, revision]);

  async function transition(card: Card, column: string) {
    setBusy(true); setError('');
    try {
      await api(`${yardEndpoint}/service-board/tasks/${card.id}`, { method: 'PATCH', body: { version: card.version, expected_status: card.status, column_id: column } });
      setRevision((n) => n + 1); onChange();
    } catch (err) { setError(getApiErrorMessage(err)); setRevision((n) => n + 1); }
    finally { setBusy(false); }
  }
  return <section aria-label="Dienstenbord" className="min-w-0 space-y-3">
    <div className="flex flex-wrap gap-2">
      <select className={control} aria-label="Dienst op bord" value={service} onChange={(e) => { setService(e.target.value); setPage(1); }}>
        <option value=""><TranslatedText textKey="siteCopy.afed69743e0e81c6" fallbackText={"Alle diensten"} inline={false} /></option>{board?.services.map((s) => <option key={s.id} value={s.service_code}>{s.name}</option>)}
      </select>
      <input aria-label="Borddatum" className={control} type="date" value={date} onChange={(e) => { setDate(e.target.value); setPage(1); }} />
      <button className={control} onClick={() => setRevision((n) => n + 1)}><TranslatedText textKey="siteCopy.873656b855d7d198" fallbackText={"Vernieuwen"} /></button>
      {board?.can_configure && <button className={control} onClick={() => setEditing(structuredClone(board.config))}><TranslatedText textKey="siteCopy.b7e52e72e03cb650" fallbackText={"Kolommen beheren"} /></button>}
      {board?.can_configure && <button className={control} onClick={() => setScheduleSettings(open => !open)}><TranslatedText textKey="yardSchedule.resources" inline={false} /></button>}
      {board?.can_configure && boatId && <button className={control} onClick={() => setPlanningBoat(boatId)}><TranslatedText textKey="yardSchedule.plan" inline={false} /></button>}
    </div>
    {scheduleSettings && <YardSchedulingSettings onSaved={onChange} />}
    {board?.can_configure && planningBoat && <YardServicePlan key={planningBoat} boatId={planningBoat} services={board.services}
      onClose={() => setPlanningBoat(undefined)} onSaved={() => { setPlanningBoat(undefined); setRevision(value => value + 1); onChange(); }} />}
    {error && <p role="alert" className="text-red-300">{error}</p>}
    {!board && !error && <p role="status"><TranslatedText textKey="siteCopy.2ad4d4d91928a76d" fallbackText={"Bord laden…"} /></p>}
    {editing && <form className="space-y-2 rounded border border-slate-600 p-3" onSubmit={async (e) => {
      e.preventDefault(); setBusy(true);
      try {
        await api(`${yardEndpoint}/service-board/config`, { method: 'PUT', body: editing });
        setEditing(undefined); setRevision((n) => n + 1);
      } catch (err) { setError(getApiErrorMessage(err)); }
      finally { setBusy(false); }
    }}>
      <p className="text-sm"><TranslatedText textKey="siteCopy.4686ba0baf275d9b" fallbackText={"De taakstatus van een bestaande kolom blijft behouden. Bij archiveren verhuizen kaarten naar een actieve kolom met dezelfde status."} /></p>
      {editing.columns.map((column, index) => <div key={column.id} className="flex flex-wrap items-center gap-2">
        <input aria-label={`Kolomnaam ${index + 1}`} className={control} value={column.label} maxLength={80} required onChange={(e) => setEditing({ ...editing, columns: editing.columns.map((c) => c.id === column.id ? { ...c, label: e.target.value } : c) })} />
        <span className="text-xs">{stateLabels[column.state]}</span>
        <label className="text-sm"><input type="checkbox" checked={column.archived} onChange={(e) => setEditing({ ...editing, columns: editing.columns.map((c) => c.id === column.id ? { ...c, archived: e.target.checked } : c) })} /> <TranslatedText textKey="siteCopy.0d92551f6d3d8855" fallbackText={" Archiveren"} /></label>
        {column.archived && <select aria-label={`Vervangende kolom voor ${column.label}`} className={control} value={column.replacement_id ?? ''} required onChange={(e) => setEditing({ ...editing, columns: editing.columns.map((c) => c.id === column.id ? { ...c, replacement_id: e.target.value } : c) })}>
          <option value=""><TranslatedText textKey="siteCopy.5eef36703b93a5fb" fallbackText={"Verplaatsen naar…"} inline={false} /></option>{editing.columns.filter((c) => c.id !== column.id && !c.archived && c.state === column.state).map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>}
        <button type="button" className={control} disabled={!index} onClick={() => { const columns = [...editing.columns]; [columns[index - 1], columns[index]] = [columns[index], columns[index - 1]]; setEditing({ ...editing, columns }); }}><TranslatedText textKey="siteCopy.9e802be2eed5d9e9" fallbackText={"Omhoog"} /></button>
      </div>)}
      <div className="flex flex-wrap gap-2">{Object.keys(stateLabels).map((state) => <button type="button" className={control} key={state} onClick={() => setEditing({ ...editing, columns: [...editing.columns, { id: crypto.randomUUID(), label: 'Nieuwe kolom', state, archived: false }] })}><TranslatedText textKey="siteCopy.91f354d0d504450f" fallbackText={"+ Kolom ("} />{stateLabels[state]})</button>)}</div>
      <button className={control} disabled={busy}><TranslatedText textKey="siteCopy.130bb0a08302155d" fallbackText={"Bord opslaan"} /></button>{' '}<button type="button" className={control} onClick={() => setEditing(undefined)}><TranslatedText textKey="siteCopy.68dfbfa42f2e26e0" fallbackText={"Annuleren"} /></button>
    </form>}
    <div className="flex min-w-0 gap-3 overflow-x-auto pb-3">
      {board?.config.columns.filter((c) => !c.archived).map((column) => {
        const cards = board.cards.data.filter((card) => card.column_id === column.id).sort((a, b) => Number(b.ready) - Number(a.ready));
        return <section key={column.id} aria-label={column.label} className="w-72 shrink-0 space-y-2 rounded-lg bg-slate-800 p-2">
          <h3 className="font-semibold">{column.label} ({cards.length})</h3>
          {cards.map((card) => <article key={card.id} className="space-y-2 rounded border border-slate-600 bg-slate-900 p-3 text-sm">
            <h4>{card.title}</h4><Link className="text-blue-300 underline" href={`/${locale}/admin/boten/${card.boat_id}`}>{card.boat_name}</Link>
            <p>{board.services.find((service) => service.service_code === card.service_code)?.name ?? card.service_code ?? 'Algemene taak'} · {priorityLabels[card.priority] ?? card.priority} · {card.assigned_to ?? 'Niet toegewezen'}</p>
            {card.due_at && <time>{new Date(card.due_at).toLocaleString('nl-NL', { timeZone: 'Europe/Amsterdam' })}</time>}
            <p>{card.status === 'done' ? 'Afgerond' : card.status === 'cancelled' ? 'Geannuleerd' : card.status === 'in_progress' ? 'In uitvoering' : card.ready ? 'Gereed voor uitvoering' : 'Wacht op voorgaande taken'}</p>
            <p><TranslatedText textKey="siteCopy.5582787500bff01d" fallbackText={"Actueel: "} />{card.actual ? `${card.actual.x.toFixed(1)} / ${card.actual.y.toFixed(1)} m` : 'Niet geplaatst'}<br /><TranslatedText textKey="siteCopy.50eb57912e8bf207" fallbackText={"Gepland: "} />{card.planned ? `${card.planned.x.toFixed(1)} / ${card.planned.y.toFixed(1)} m` : 'Geen verplaatsing'}</p>
            <p className="text-xs text-slate-400"><TranslatedText textKey="siteCopy.606d372e3a33109a" fallbackText={"Betaling per dienst: nog niet toegewezen"} /></p>
            {board.can_configure && <button className={control} onClick={() => setPlanningBoat(card.boat_id)}><TranslatedText textKey="yardSchedule.plan" inline={false} /></button>}
            {card.entity_type === 'yard_move' ? <Link href={`/${locale}/admin/stalling/werfcanvas#verplaatsingen`} className="text-blue-300 underline"><TranslatedText textKey="siteCopy.81a7471c091f539c" fallbackText={"Open fysieke werfopdracht"} /></Link>
              : <select aria-label={`Kolom voor ${card.title}`} className={`${control} w-full`} value={card.column_id} disabled={busy || board.can_transition === false} onChange={(e) => void transition(card, e.target.value)}>
                {board.config.columns.filter((c) => !c.archived).map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>}
          </article>)}
        </section>;
      })}
    </div>
    {board && board.cards.last_page > 1 && <div className="flex gap-2"><button className={control} disabled={page <= 1} onClick={() => setPage(page - 1)}><TranslatedText textKey="siteCopy.e9e108f7421413d8" fallbackText={"Vorige"} /></button><span>{page} / {board.cards.last_page}</span><button className={control} disabled={page >= board.cards.last_page} onClick={() => setPage(page + 1)}><TranslatedText textKey="siteCopy.d3b28b0cb56b6238" fallbackText={"Volgende"} /></button></div>}
  </section>;
}
