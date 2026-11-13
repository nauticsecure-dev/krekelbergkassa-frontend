'use client';

import { useEffect, useState } from 'react';
import { TranslatedText } from '@/components/cms/TranslatedText';
import { api } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api-error';
import { control, yardEndpoint } from './YardHistory';
import type { ScheduleResources } from './YardSchedulingSettings';

type Step = { id: number; product_id: string; start: string; duration_minutes: number; assigned_to_user_id: string; team_id: string; equipment_id: string };
type Preview = { id: string; steps: { product_id: string; title: string; start: string; duration_minutes: number }[];
  change?: { kind: string; notice: { title: string; message: string }; notice_days?: number; minimum_charge_cents?: number; cancel_task_ids?: string[] };
  relocation?: { due_at: string; instructions?: string; warnings?: string[] };
};
type PlanContext = {
  can_add_services: boolean;
  can_terminate: boolean;
  appointments: { id: string; appointment_date: string; start_time: string; status: string }[];
  contracts: { id: string; contract_number: string; status: string }[];
  moves: { id: string; title: string; due_at: string; placement_version?: number }[];
};
type TerminationLine = { id: string; description: string; invoice_number: string | null; available_cents: number };
const emptyStep = (id: number): Step => ({ id, product_id: '', start: '', duration_minutes: 30, assigned_to_user_id: '', team_id: '', equipment_id: '' });

export function YardServicePlan({ boatId, services, onClose, onSaved }: {
  boatId: string; services: { id: string; name: string }[]; onClose: () => void; onSaved: () => void;
}) {
  const [steps, setSteps] = useState([emptyStep(0)]);
  const [resources, setResources] = useState<ScheduleResources>();
  const [context, setContext] = useState<PlanContext>();
  const [links, setLinks] = useState({ appointment_id: '', contract_id: '', move_task_id: '' });
  const [workflow, setWorkflow] = useState(false);
  const [kind, setKind] = useState('');
  const [bookingStart, setBookingStart] = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [invoiceLine, setInvoiceLine] = useState('');
  const [credit, setCredit] = useState('');
  const [moveStart, setMoveStart] = useState('');
  const [instructions, setInstructions] = useState('');
  const [approved, setApproved] = useState(false);
  const [creditLines, setCreditLines] = useState<TerminationLine[]>([]);
  const [preview, setPreview] = useState<Preview>();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const path = `${yardEndpoint}/boats/${boatId}/service-plans`;
  const linkedMove = context?.moves.find(move => move.id === links.move_task_id);
  const terminating = kind === 'terminate';
  const euros = (cents: number) => new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(cents / 100);

  useEffect(() => {
    let active = true;
    api<ScheduleResources>(`${yardEndpoint}/schedule-resources`).then(value => { if (active) setResources(value); })
      .catch(err => { if (active) setError(getApiErrorMessage(err)); });
    api<PlanContext>(`${path}/context`).then(value => { if (active) setContext(value); })
      .catch(err => { if (active) setError(getApiErrorMessage(err)); });
    return () => { active = false; };
  }, [path]);

  useEffect(() => {
    if (!terminating || !links.contract_id) return;
    let active = true;
    api<TerminationLine[]>(`${path}/contracts/${links.contract_id}/lines`)
      .then(lines => { if (active) setCreditLines(lines); })
      .catch(err => { if (active) setError(getApiErrorMessage(err)); });
    return () => { active = false; };
  }, [path, terminating, links.contract_id]);

  function change(id: number, values: Partial<Step>) {
    setPreview(undefined);
    setSteps(current => current.map(step => step.id === id ? { ...step, ...values } : step));
  }

  async function review() {
    setBusy(true); setError(''); setPreview(undefined); setApproved(false);
    try {
      const change = terminating ? { kind, effective_date: effectiveDate, invoice_line_id: invoiceLine || null, credit_cents: Math.round(Number(credit) * 100) }
        : kind === 'add' ? { kind, start: bookingStart || null } : undefined;
      setPreview(await api<Preview>(path, { method: 'POST', body: { yard_workflow: workflow,
        change, relocation: moveStart && linkedMove?.placement_version !== undefined ? {
          version: linkedMove.placement_version, due_at: moveStart, instructions: instructions || undefined,
        } : undefined,
        ...Object.fromEntries(Object.entries(links).map(([key, value]) => [key, value || null])), steps: terminating ? [] : steps.map(step => ({
        product_id: step.product_id, start: step.start, duration_minutes: step.duration_minutes,
        assigned_to_user_id: step.assigned_to_user_id || null, team_id: step.team_id || null, equipment_id: step.equipment_id || null,
      })) } }));
    } catch (err) { setError(getApiErrorMessage(err)); }
    finally { setBusy(false); }
  }

  async function confirm() {
    if (!preview) return;
    setBusy(true); setError('');
    try {
      await api(`${path}/${preview.id}/confirm`, { method: 'POST', body: { confirmed: true, financial_approved: preview.change ? approved : undefined } });
      onSaved();
    } catch (err) { setError(getApiErrorMessage(err)); }
    finally { setBusy(false); }
  }

  return <form className="space-y-3 rounded border border-slate-600 p-3" onChange={() => setPreview(undefined)} onSubmit={event => { event.preventDefault(); void review(); }}>
    <h3 className="font-semibold"><TranslatedText textKey="yardSchedule.plan" inline={false} /></h3>
    {error && <p role="alert" className="text-red-300">{error}</p>}
    <label className="grid">Actie<select className={control} value={kind} disabled={busy} onChange={event => {
      setKind(event.target.value); setWorkflow(false);
    }}>
      <option value="">Werktaken plannen</option>
      {context?.can_add_services && <option value="add">Diensten toevoegen aan afspraak</option>}
      {context?.can_terminate && <option value="terminate">Stallingscontract opzeggen</option>}
    </select></label>
    {!terminating && <label className="flex items-center gap-2"><input type="checkbox" checked={workflow} disabled={busy} onChange={event => {
      const enabled = event.target.checked;
      setWorkflow(enabled);
      setPreview(undefined);
      if (enabled) setSteps(current => [0, 1, 2].map(index => current[index] ?? emptyStep((current.at(-1)?.id ?? 0) + index + 1)));
    }} />Verplaatsing → kraan → wassen → stalling</label>}
    <fieldset disabled={busy} className="flex flex-wrap gap-2">
      {([
        ['appointment_id', 'yardSchedule.appointment', context?.appointments?.map(row => [row.id, `${row.appointment_date.slice(0, 10)} ${row.start_time} · ${row.status}`])],
        ['contract_id', 'yardSchedule.contract', context?.contracts?.map(row => [row.id, `${row.contract_number} · ${row.status}`])],
        ['move_task_id', 'yardSchedule.move', context?.moves?.map(row => [row.id, `${row.title} · ${new Date(row.due_at).toLocaleString(undefined, { timeZone: 'Europe/Amsterdam' })}`])],
      ] as const).filter(([, , choices]) => choices?.length).map(([field, label, choices]) => <label key={field} className="grid">
        <TranslatedText textKey={label} inline={false} />
        <select className={control} required={workflow || kind === 'add' && field === 'appointment_id' || terminating && field === 'contract_id'} value={links[field]} onChange={event => {
          setLinks({ ...links, [field]: event.target.value });
          if (field === 'move_task_id') { setMoveStart(''); setInstructions(''); }
          if (field === 'contract_id') { setCreditLines([]); setInvoiceLine(''); }
        }}>
          <option value="">—</option>{choices?.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
        </select>
      </label>)}
    </fieldset>
    {kind === 'add' && <label className="grid">Nieuwe starttijd afspraak (optioneel)
      <input className={control} type="datetime-local" value={bookingStart} disabled={busy} onChange={event => setBookingStart(event.target.value)} />
    </label>}
    {terminating && <fieldset disabled={busy} className="flex flex-wrap gap-2">
      <label className="grid">Ingangsdatum<input className={control} type="date" required value={effectiveDate} onChange={event => setEffectiveDate(event.target.value)} /></label>
      <label className="grid">Creditbedrag inclusief btw (€)<input className={control} type="number" step="0.01" min="0" value={credit} onChange={event => setCredit(event.target.value)} /></label>
      {Number(credit) > 0 && <label className="grid">Factuurregel<select className={control} required value={invoiceLine} onChange={event => setInvoiceLine(event.target.value)}>
        <option value="">Kies een factuurregel</option>
        {creditLines.map(line => <option key={line.id} value={line.id}>{line.invoice_number} · {line.description} · {euros(line.available_cents)}</option>)}
      </select></label>}
    </fieldset>}
    {linkedMove?.placement_version !== undefined && <fieldset disabled={busy} className="flex flex-wrap gap-2">
      <label className="grid">Nieuwe starttijd verplaatsing (optioneel)<input className={control} type="datetime-local" value={moveStart} onChange={event => setMoveStart(event.target.value)} /></label>
      {moveStart && <label className="grid">Nieuwe instructies<textarea className={control} maxLength={2000} value={instructions} onChange={event => setInstructions(event.target.value)} /></label>}
    </fieldset>}
    {!terminating && steps.map((step, index) => {
      const team = resources?.teams.find(item => item.id === step.team_id);
      const workers = resources?.workers.filter(worker => !team || team.member_ids.includes(worker.id));
      return <fieldset key={step.id} disabled={busy} className="flex flex-wrap items-end gap-2 border-t border-slate-700 pt-2">
        <legend>{workflow ? ['Kraan', 'Wassen', 'Stalling'][index] : index + 1}</legend>
        <label className="grid"><TranslatedText textKey="yardSchedule.service" inline={false} />
          <select className={control} value={step.product_id} required onChange={event => change(step.id, { product_id: event.target.value })}>
            <option value="">—</option>{services.map(service => <option key={service.id} value={service.id}>{service.name}</option>)}
          </select>
        </label>
        <label className="grid"><TranslatedText textKey="yardSchedule.start" inline={false} />
          <input className={control} type="datetime-local" required value={step.start} onChange={event => change(step.id, { start: event.target.value })} />
        </label>
        <label className="grid"><TranslatedText textKey="yardSchedule.minutes" inline={false} />
          <input className={`${control} w-24`} type="number" min={1} max={720} required value={step.duration_minutes} onChange={event => change(step.id, { duration_minutes: Number(event.target.value) })} />
        </label>
        {resources?.teams.length ? <label className="grid"><TranslatedText textKey="yardSchedule.team" inline={false} />
          <select className={control} value={step.team_id} onChange={event => change(step.id, { team_id: event.target.value, assigned_to_user_id: '' })}>
            <option value="">—</option>{resources.teams.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
        </label> : null}
        <label className="grid"><TranslatedText textKey="yardSchedule.worker" inline={false} />
          <select className={control} value={step.assigned_to_user_id} onChange={event => change(step.id, { assigned_to_user_id: event.target.value })}>
            <option value="">{resources?.workers.find(worker => worker.id === team?.lead_id)?.name ?? '—'}</option>
            {workers?.map(worker => <option key={worker.id} value={worker.id}>{worker.name}</option>)}
          </select>
        </label>
        {resources?.equipment.length ? <label className="grid"><TranslatedText textKey="yardSchedule.equipment" inline={false} />
          <select className={control} value={step.equipment_id} onChange={event => change(step.id, { equipment_id: event.target.value })}>
            <option value="">—</option>{resources.equipment.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
        </label> : null}
        {!workflow && steps.length > 1 && <button className={control} type="button" onClick={() => { setSteps(current => current.filter(item => item.id !== step.id)); setPreview(undefined); }}><TranslatedText textKey="yardSchedule.remove" inline={false} /></button>}
      </fieldset>;
    })}
    <div className="flex flex-wrap gap-2">
      {!workflow && !terminating && <button className={control} type="button" disabled={busy || steps.length >= 10} onClick={() => { setSteps(current => [...current, emptyStep(current.at(-1)!.id + 1)]); setPreview(undefined); }}><TranslatedText textKey="yardSchedule.addStep" inline={false} /></button>}
      <button className={control} disabled={busy}><TranslatedText textKey="yardSchedule.preview" inline={false} /></button>
      <button className={control} type="button" disabled={busy} onClick={onClose}><TranslatedText textKey="adminNew.common.cancel" inline={false} /></button>
    </div>
    {preview && <div className="space-y-2">
      <ol className="list-decimal pl-5">{preview.steps.map((step, index) => <li key={`${step.product_id}:${index}`}>{step.title} · {new Date(step.start).toLocaleString(undefined, { timeZone: 'Europe/Amsterdam' })} · {new Intl.NumberFormat(undefined, { style: 'unit', unit: 'minute' }).format(step.duration_minutes)}</li>)}</ol>
      {preview.relocation && <p>Verplaatsing · {new Date(preview.relocation.due_at).toLocaleString('nl-NL', { timeZone: 'Europe/Amsterdam' })} · {preview.relocation.instructions}</p>}
      {preview.relocation?.warnings?.map(warning => <p key={warning} className="text-amber-200">{warning}</p>)}
      {preview.change ? <>
        {preview.change.kind === 'terminate' && <p>Opzegtermijn {preview.change.notice_days} dagen · Minimumvergoeding {euros(preview.change.minimum_charge_cents ?? 0)} · {preview.change.cancel_task_ids?.length ?? 0} te annuleren taken</p>}
        <blockquote className="border-l-2 border-slate-500 pl-3"><strong>{preview.change.notice.title}</strong><p>{preview.change.notice.message}</p></blockquote>
        <label className="flex gap-2"><input type="checkbox" checked={approved} disabled={busy} onChange={event => { event.stopPropagation(); setApproved(event.target.checked); }} />Ik keur de financiële gevolgen en het bericht in het klantenportaal goed.</label>
      </> : <p><TranslatedText textKey="yardSchedule.internalOnly" inline={false} /></p>}
      <button className={control} type="button" disabled={busy || !!preview.change && !approved} onClick={() => void confirm()}><TranslatedText textKey="yardSchedule.confirm" inline={false} /></button>
    </div>}
  </form>;
}
