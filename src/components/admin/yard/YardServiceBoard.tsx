'use client';
import { TranslatedText } from '@/components/cms/TranslatedText';

import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import { api } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api-error';
import { control, yardEndpoint, type Page } from './YardHistory';
import { YardServicePlan } from './YardServicePlan';
import { YardSchedulingSettings } from './YardSchedulingSettings';

type Column = { id: string; label: string; state: string; archived: boolean; replacement_id?: string };
type Config = { version: number; columns: Column[] };
type Allocation = { payment_id: string; paid_cents: number; refunded_cents: number };
type FinanceLine = { invoice_id: string; invoice_line_id: string; currency: string; invoice_status: string; total_cents: number;
  paid_cents: number; credited_cents: number; refunded_cents: number; outstanding_cents: number; credit_balance_cents: number;
  payments: Allocation[]; credit_note_ids: string[]; allocation_revision: string };
type Card = { id: string; boat_id: string; boat_name: string; title: string; status: string; column_id: string; service_code: string | null;
  version: number; ready: boolean; entity_type: string; priority: string; assigned_to: string | null; due_at: string | null;
  actual: { x: number; y: number } | null; planned: { x: number; y: number } | null;
  can_execute?: boolean; appointment_id?: string | null; appointment_action?: string | null; financial_evidence?: FinanceLine[] };
type Board = { config: Config; can_configure: boolean; can_transition?: boolean; can_allocate?: boolean; cards: Page<Card>; services: { id: string; name: string; service_code: string }[] };
const stateLabels: Record<string, string> = { open: 'Te doen', in_progress: 'Bezig', done: 'Gereed', cancelled: 'Geannuleerd' };
const priorityLabels: Record<string, string> = { low: 'Laag', normal: 'Normaal', high: 'Hoog', urgent: 'Urgent' };
const milestoneLabels: Record<string, string> = { started: 'Kraanwerk starten', out_of_water: 'Boot uit het water bevestigen',
  in_water: 'Boot te water bevestigen', wash_started: 'Wassen registreren', completed: 'Afspraak afronden' };

function FinanceEditor({ card, line, onSaved }: { card: Card; line?: FinanceLine; onSaved: () => void }) {
  const [rows, setRows] = useState<Allocation[]>(line?.payments ?? []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    setBusy(true); setError('');
    try {
      await api(`${yardEndpoint}/service-board/tasks/${card.id}/finance`, { method: 'PUT', body: {
        invoice_line_id: fields.get('line'), expected_revision: line?.allocation_revision,
        allocations: rows.map(({ payment_id, paid_cents, refunded_cents }) => ({ payment_id, paid_cents, refunded_cents })),
      } });
      onSaved();
    } catch (err) { setError(getApiErrorMessage(err)); }
    finally { setBusy(false); }
  }

  return <form onSubmit={save} className="grid gap-2">
    {error && <p role="alert" className="text-red-300">{error}</p>}
    <label className="grid">ID factuurregel<input className={control} name="line" defaultValue={line?.invoice_line_id} readOnly={!!line} required /></label>
    {rows.map((row, index) => <fieldset key={index} className="grid gap-1 border-t border-slate-700 pt-2" disabled={busy}>
      <label className="grid">ID betaling<input className={control} required value={row.payment_id} onChange={e => setRows(rows.map((item, i) => i === index ? { ...item, payment_id: e.target.value } : item))} /></label>
      {(['paid_cents', 'refunded_cents'] as const).map(field => <label key={field} className="grid">
        {field === 'paid_cents' ? 'Betaald (cent)' : 'Terugbetaald (cent)'}
        <input className={control} type="number" required min={field === 'paid_cents' ? 1 : 0} value={row[field]} onChange={e => setRows(rows.map((item, i) => i === index ? { ...item, [field]: Number(e.target.value) } : item))} />
      </label>)}
      <button className={control} type="button" onClick={() => setRows(rows.filter((_, i) => i !== index))}>Betaling verwijderen</button>
    </fieldset>)}
    <button className={control} type="button" disabled={busy} onClick={() => setRows([...rows, { payment_id: '', paid_cents: 0, refunded_cents: 0 }])}>Betaling toewijzen</button>
    <button className={control} disabled={busy}>Toewijzing opslaan</button>
  </form>;
}

export function YardServiceBoard({ locale, boatId, taskId, refreshRevision, onChange }: { locale: string; boatId?: string; taskId?: string; refreshRevision: number; onChange: () => void }) {
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
  const [editingFinance, setEditingFinance] = useState<{ taskId: string; line?: FinanceLine }>();
  const refreshFinance = () => { setEditingFinance(undefined); setRevision(value => value + 1); onChange(); };
  useEffect(() => {
    let active = true;
    const load = () => api<Board>(`${yardEndpoint}/service-board`, { query: { service_code: service, date, page, task_id: taskId } })
      .then((data) => { if (active) { setBoard(data); setError(''); } })
      .catch((err) => { if (active) setError(getApiErrorMessage(err)); });
    void load();
    const timer = setInterval(() => void load(), 30000);
    return () => { active = false; clearInterval(timer); };
  }, [service, date, page, revision, refreshRevision, taskId]);

  async function transition(card: Card, column: string) {
    setBusy(true); setError('');
    try {
      await api(`${yardEndpoint}/service-board/tasks/${card.id}`, { method: 'PATCH', body: { version: card.version, expected_status: card.status, column_id: column } });
      setRevision((n) => n + 1); onChange();
    } catch (err) { setError(getApiErrorMessage(err)); setRevision((n) => n + 1); }
    finally { setBusy(false); }
  }

  async function recordMilestone(card: Card) {
    setBusy(true); setError('');
    try {
      await api(`/v1/appointments/${card.appointment_id}/status`, { method: 'POST', body: { status: card.appointment_action }, queueWhenOffline: false });
      setRevision(value => value + 1); onChange();
    } catch (err) { setError(getApiErrorMessage(err)); }
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
            <p>{card.status === 'done' ? 'Afgerond' : card.status === 'cancelled' ? 'Geannuleerd' : card.status === 'in_progress' ? 'In uitvoering' : card.ready ? 'Gereed voor uitvoering' : 'Wacht op voorgaande taken of afspraak'}</p>
            {card.appointment_id && <Link className="underline" href={`/${locale}/admin/afspraken?appointment_id=${card.appointment_id}`}>Gekoppelde afspraak</Link>}
            {card.appointment_id && card.appointment_action && <button className={`${control} block`} disabled={busy}
              onClick={() => void recordMilestone(card)}>{milestoneLabels[card.appointment_action]}</button>}
            <p><TranslatedText textKey="siteCopy.5582787500bff01d" fallbackText={"Actueel: "} />{card.actual ? `${card.actual.x.toFixed(1)} / ${card.actual.y.toFixed(1)} m` : 'Niet geplaatst'}<br /><TranslatedText textKey="siteCopy.50eb57912e8bf207" fallbackText={"Gepland: "} />{card.planned ? `${card.planned.x.toFixed(1)} / ${card.planned.y.toFixed(1)} m` : 'Geen verplaatsing'}</p>
            {card.financial_evidence?.length === 0 && <p className="text-xs text-slate-400"><TranslatedText textKey="siteCopy.606d372e3a33109a" fallbackText={"Betaling per dienst: nog niet toegewezen"} /></p>}
            {card.financial_evidence?.map(line => {
              const amount = (cents: number) => new Intl.NumberFormat(locale, { style: 'currency', currency: line.currency }).format(cents / 100);
              return <div key={line.invoice_line_id} className="space-y-1 border-t border-slate-700 pt-2">
                <Link className="underline" href={`/${locale}/admin/facturen/${line.invoice_id}`}>{line.invoice_status === 'draft' ? 'Conceptfactuur' : 'Factuur'} · {amount(line.total_cents)}</Link>
                <p>Toegewezen betaald {amount(line.paid_cents)} · Openstaand {amount(line.outstanding_cents)}</p>
                {line.credit_note_ids.map(id => <Link key={id} className="block underline" href={`/${locale}/admin/facturen/${id}`}>Creditnota</Link>)}
                {line.credited_cents > 0 && <p>Gecrediteerd {amount(line.credited_cents)}</p>}
                {line.refunded_cents > 0 && <p>Terugbetaald {amount(line.refunded_cents)}</p>}
                {line.credit_balance_cents > 0 && <p>Terug te betalen {amount(line.credit_balance_cents)}</p>}
                {board.can_allocate && line.invoice_status !== 'draft' && <button type="button" className={control} onClick={() => setEditingFinance({ taskId: card.id, line })}>Toewijzing wijzigen</button>}
              </div>;
            })}
            {board.can_allocate && card.entity_type === 'boat' && card.service_code && <button type="button" className={control} onClick={() => setEditingFinance({ taskId: card.id })}>Factuurregel koppelen</button>}
            {editingFinance?.taskId === card.id && <FinanceEditor key={editingFinance.line?.invoice_line_id ?? card.id} card={card} line={editingFinance.line} onSaved={refreshFinance} />}
            {board.can_configure && <button className={control} onClick={() => setPlanningBoat(card.boat_id)}><TranslatedText textKey="yardSchedule.plan" inline={false} /></button>}
            {card.entity_type === 'yard_move' ? <Link href={`/${locale}/admin/stalling/werfcanvas?task_id=${card.id}#verplaatsingen`} className="text-blue-300 underline"><TranslatedText textKey="siteCopy.81a7471c091f539c" fallbackText={"Open fysieke werfopdracht"} /></Link>
              : <select aria-label={`Kolom voor ${card.title}`} className={`${control} w-full`} value={card.column_id} disabled={busy || board.can_transition === false || card.can_execute === false} onChange={(e) => void transition(card, e.target.value)}>
                {board.config.columns.filter((c) => !c.archived).map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>}
          </article>)}
        </section>;
      })}
    </div>
    {board && board.cards.last_page > 1 && <div className="flex gap-2"><button className={control} disabled={page <= 1} onClick={() => setPage(page - 1)}><TranslatedText textKey="siteCopy.e9e108f7421413d8" fallbackText={"Vorige"} /></button><span>{page} / {board.cards.last_page}</span><button className={control} disabled={page >= board.cards.last_page} onClick={() => setPage(page + 1)}><TranslatedText textKey="siteCopy.d3b28b0cb56b6238" fallbackText={"Volgende"} /></button></div>}
  </section>;
}
