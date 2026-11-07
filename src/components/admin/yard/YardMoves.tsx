'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { api } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api-error';
import { YardQuickPhoto } from './YardQuickPhoto';
import { control, yardEndpoint, type Page } from './YardHistory';

type Position = { x: number; y: number; rotation: number; scale: number; location_code?: string | null };
type Move = {
  id: string; entity_id: string; title: string; description: string | null; due_at: string;
  assigned_to: string | null; is_assignee: boolean; photo_url: string | null; boat_name: string;
  length_cm: number | null; width_cm: number | null; placement_version: number;
  metadata: { state: string; equipment?: string; reason?: string; blocked_reason?: string; from: Position; to: Position; final?: Position };
};
type Operation = 'accept' | 'start' | 'block' | 'complete';

const labels: Record<string, string> = {
  planned: 'Gepland', assigned: 'Toegewezen', accepted: 'Geaccepteerd',
  in_progress: 'Bezig', blocked: 'Geblokkeerd', done: 'Gereed', cancelled: 'Geannuleerd',
};

function PositionComparison({ move }: { move: Move }) {
  const [view, setView] = useState('Beide');
  const from = move.metadata.from;
  const to = move.metadata.final ?? move.metadata.to;
  const length = (move.length_cm || 700) / 100;
  const width = (move.width_cm || 250) / 100;
  const margin = length * Math.max(from.scale, to.scale) + 2;
  const describe = (p: Position) => [p.location_code, `${p.x.toFixed(1)} / ${p.y.toFixed(1)} m`, `${p.rotation}°`].filter(Boolean).join(' · ');
  return <figure className="space-y-1">
    <div className="flex flex-wrap gap-1" aria-label="Positieweergave" role="group">
      {['Voor', 'Na', 'Beide'].map((mode) => <button key={mode} type="button" aria-pressed={view === mode}
        className={`${control} ${view === mode ? '!bg-blue-800' : ''}`} onClick={() => setView(mode)}>{mode}</button>)}
    </div>
    <svg className="h-28 w-full rounded bg-slate-950" role="img" aria-label="Voor- en napositie"
      viewBox={`${Math.min(from.x, to.x) - margin} ${Math.min(from.y, to.y) - margin} ${Math.abs(from.x - to.x) + margin * 2} ${Math.abs(from.y - to.y) + margin * 2}`}>
      {view === 'Beide' && <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="#facc15" strokeWidth=".35" strokeDasharray=".8 .5" />}
      {[from, to].map((p, index) => (view === 'Beide' || view === (index ? 'Na' : 'Voor')) && <ellipse key={index} transform={`translate(${p.x} ${p.y}) rotate(${p.rotation}) scale(${p.scale})`}
        rx={length / 2} ry={width / 2} fill={index ? '#854d0e' : '#1d4ed8'}
        stroke={index ? '#facc15' : '#bfdbfe'} strokeWidth=".35" strokeDasharray={index && !move.metadata.final ? '.7 .4' : undefined} />)}
    </svg>
    <figcaption className="grid grid-cols-2 gap-2 text-xs">
      <span>Voor · {describe(from)}</span><span>{move.metadata.final ? 'Werkelijk' : 'Gepland'} · {describe(to)}</span>
    </figcaption>
  </figure>;
}

export function YardMoves({ mine, onChange }: { mine: boolean; onChange: () => void }) {
  const [page, setPage] = useState(1);
  const [moves, setMoves] = useState<Page<Move>>();
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [photo, setPhoto] = useState<Move>();
  const [action, setAction] = useState<{ move: Move; operation: Operation }>();

  useEffect(() => {
    let active = true;
    let loading = false;
    async function load() {
      if (loading) return;
      loading = true;
      try {
        const result = await api<Page<Move>>(`${yardEndpoint}/moves`, { query: { mine: mine ? 1 : 0, page } });
        if (active) setMoves(result);
      } catch (err) {
        if (active) setError(getApiErrorMessage(err));
      } finally {
        loading = false;
      }
    }
    void load();
    const timer = window.setInterval(() => void load(), 30000);
    return () => { active = false; window.clearInterval(timer); };
  }, [mine, page, revision]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!action || busy) return;
    const { move, operation } = action;
    const fields = new FormData(event.currentTarget);
    const complete = operation === 'complete';
    setBusy(true);
    setError('');
    try {
      await api(`${yardEndpoint}/moves/${move.entity_id}`, {
        method: 'PATCH',
        body: {
          task_id: move.id, version: move.placement_version, operation,
          reason: fields.get('reason'), notes: fields.get('notes'),
          confirmed: complete ? fields.get('confirmed') === 'on' : undefined,
          position: complete ? {
            ...move.metadata.to, x: Number(fields.get('x')), y: Number(fields.get('y')),
            rotation: Number(fields.get('rotation')), location_code: fields.get('location_code') || null,
          } : undefined,
        },
      });
      setAction(undefined);
      setRevision((value) => value + 1);
      onChange();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return <section className="relative space-y-3 rounded-xl border border-slate-700 p-3">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h2 className="font-semibold">{mine ? 'Mijn werk vandaag en komende opdrachten' : 'Verplaatsingen'}</h2>
      <button className={control} onClick={() => { setAction(undefined); setError(''); setRevision((value) => value + 1); }}>Opdrachten vernieuwen</button>
    </div>
    {error && <p role="alert" className="text-red-300">{error}</p>}
    {!moves && !error && <p role="status">Opdrachten laden…</p>}
    {moves?.total === 0 && <p>Geen verplaatsingen gevonden.</p>}
    <div className="grid gap-3 md:grid-cols-2">
      {moves?.data.map((move) => {
        const state = move.metadata.state;
        const actions: [Operation, string][] = [];
        if (state === 'assigned') actions.push(['accept', 'Accepteren']);
        if (['accepted', 'blocked'].includes(state)) actions.push(['start', 'Starten']);
        if (['accepted', 'in_progress'].includes(state)) actions.push(['block', 'Probleem melden']);
        if (state === 'in_progress') actions.push(['complete', 'Voltooien']);
        return <article key={move.id} className="space-y-3 rounded-lg border border-slate-700 bg-slate-900 p-3">
          <header className="flex gap-3">
            {move.photo_url && <img className="h-14 w-20 rounded object-cover" src={move.photo_url} alt={move.boat_name} />}
            <div><h3 className="font-medium">{move.title}</h3>
              <p className="text-sm text-slate-300">{labels[state] ?? state} · {move.assigned_to ?? 'Nog toe te wijzen'}</p>
              <time className="text-sm text-amber-200" dateTime={move.due_at}>
                {new Date(move.due_at).toLocaleString('nl-NL', { timeZone: 'Europe/Amsterdam', dateStyle: 'medium', timeStyle: 'short' })}
              </time>
            </div>
          </header>
          <PositionComparison move={move} />
          {move.metadata.equipment && <p className="text-sm">Materieel · {move.metadata.equipment}</p>}
          {move.metadata.reason && <p className="text-sm">{move.metadata.reason}</p>}
          {move.description && <p className="whitespace-pre-line text-sm">{move.description}</p>}
          {state === 'blocked' && <p className="text-sm text-amber-200">{move.metadata.blocked_reason}</p>}
          {move.is_assignee && <div className="flex flex-wrap gap-2">
            {state !== 'cancelled' && <button className={`${control} min-h-11`} onClick={() => setPhoto(move)}>Foto toevoegen</button>}
            {actions.map(([operation, label]) => <button key={operation} type="button" className={`${control} min-h-11`} disabled={busy}
              onClick={() => setAction({ move, operation })}>{label}</button>)}
          </div>}
          {action?.move.id === move.id && <form key={action.operation} className="grid gap-2 border-t border-slate-700 pt-3" onSubmit={submit}>
            {action.operation === 'block' && <label className="grid gap-1">Reden<textarea className={control} name="reason" maxLength={500} required /></label>}
            {action.operation === 'complete' && <>
              <div className="grid grid-cols-2 gap-2">
                <label className="grid min-w-0 gap-1">X (m)<input className={`${control} min-w-0 w-full`} name="x" type="number" step="any" defaultValue={move.metadata.to.x} required /></label>
                <label className="grid min-w-0 gap-1">Y (m)<input className={`${control} min-w-0 w-full`} name="y" type="number" step="any" defaultValue={move.metadata.to.y} required /></label>
                <label className="grid min-w-0 gap-1">Rotatie<input className={`${control} min-w-0 w-full`} name="rotation" type="number" step="any" min={0} max={360} defaultValue={move.metadata.to.rotation} required /></label>
                <label className="grid min-w-0 gap-1">Locatiecode<input className={`${control} min-w-0 w-full`} name="location_code" defaultValue={move.metadata.to.location_code ?? ''} /></label>
              </div>
              <label className="grid gap-1">Notities<textarea className={control} name="notes" maxLength={2000} /></label>
              <label className="flex items-center gap-2"><input type="checkbox" name="confirmed" required /> De boot staat fysiek op deze locatie.</label>
            </>}
            <div className="flex gap-2">
              <button className={`${control} min-h-11 !bg-blue-800`} disabled={busy}>Bevestigen</button>
              <button type="button" className={control} disabled={busy} onClick={() => setAction(undefined)}>Annuleren</button>
            </div>
          </form>}
        </article>;
      })}
    </div>
    {photo && <YardQuickPhoto boat={{ id: photo.entity_id, name: photo.boat_name }} taskId={photo.id} onClose={() => setPhoto(undefined)} />}
    {moves && moves.last_page > 1 && <div className="flex items-center gap-2">
      <button className={control} disabled={page <= 1 || busy} onClick={() => { setAction(undefined); setPage(page - 1); }}>Vorige</button>
      <span>{page} / {moves.last_page}</span>
      <button className={control} disabled={page >= moves.last_page || busy} onClick={() => { setAction(undefined); setPage(page + 1); }}>Volgende</button>
    </div>}
  </section>;
}
