'use client';

import { useEffect, useState } from 'react';
import { TranslatedText } from '@/components/cms/TranslatedText';
import { api } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api-error';
import { control, yardEndpoint } from './YardHistory';

type Team = { id: string; label: string; lead_id: string; member_ids: string[] };
type Equipment = { id: string; label: string };
type Availability = { user_id: string; kind: 'shift' | 'leave'; start: string; end: string };
export type ScheduleResources = { version: number; teams: Team[]; equipment: Equipment[]; availability: Availability[]; workers: { id: string; name: string }[] };
const endpoint = `${yardEndpoint}/schedule-resources`;
const localTime = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Amsterdam', dateStyle: 'short', timeStyle: 'short' });
const inputTime = (value: string) => !value || value.length === 16 ? value : localTime.format(new Date(value)).replace(' ', 'T');

export function YardSchedulingSettings({ onSaved }: { onSaved: () => void }) {
  const [draft, setDraft] = useState<ScheduleResources>();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let active = true;
    api<ScheduleResources>(endpoint).then(value => { if (active) { setDraft(value); setError(''); } })
      .catch(err => { if (active) setError(getApiErrorMessage(err)); });
    return () => { active = false; };
  }, [revision]);

  if (!draft) return error ? <p role="alert">{error}</p> : <p role="status"><TranslatedText textKey="yardPhotos.loading" inline={false} /></p>;

  function change(values: Partial<ScheduleResources>) {
    setDraft(current => current && { ...current, ...values });
    setSaved(false);
  }

  return <form className="space-y-3 rounded border border-slate-600 p-3" onSubmit={async event => {
    event.preventDefault(); setBusy(true); setError(''); setSaved(false);
    try {
      const { version, teams, equipment, availability } = draft;
      setDraft(await api<ScheduleResources>(endpoint, { method: 'PUT', body: { version, teams, equipment, availability } }));
      setSaved(true);
      onSaved();
    } catch (err) { setError(getApiErrorMessage(err)); }
    finally { setBusy(false); }
  }}>
    {error && <p role="alert">{error}</p>}
    {saved && <p role="status"><TranslatedText textKey="yardSchedule.saved" inline={false} /></p>}
    <fieldset disabled={busy} className="space-y-2">
      <legend className="font-semibold"><TranslatedText textKey="yardSchedule.team" inline={false} /></legend>
      {draft.teams.map((team, index) => <div key={team.id} className="flex flex-wrap items-end gap-2 border-t border-slate-700 pt-2">
        <label className="grid"><TranslatedText textKey="yardSchedule.name" inline={false} />
          <input className={control} required maxLength={100} value={team.label} onChange={event => change({ teams: draft.teams.map((row, i) => i === index ? { ...row, label: event.target.value } : row) })} />
        </label>
        <label className="grid"><TranslatedText textKey="yardSchedule.members" inline={false} />
          <select className={control} multiple required value={team.member_ids} onChange={event => {
            const member_ids = Array.from(event.target.selectedOptions, option => option.value);
            change({ teams: draft.teams.map((row, i) => i === index ? { ...row, member_ids, lead_id: member_ids.includes(row.lead_id) ? row.lead_id : '' } : row) });
          }}>{draft.workers.map(worker => <option key={worker.id} value={worker.id}>{worker.name}</option>)}</select>
        </label>
        <label className="grid"><TranslatedText textKey="yardSchedule.lead" inline={false} />
          <select className={control} value={team.lead_id} required onChange={event => change({ teams: draft.teams.map((row, i) => i === index ? { ...row, lead_id: event.target.value } : row) })}>
            <option value="">—</option>{draft.workers.filter(worker => team.member_ids.includes(worker.id)).map(worker => <option key={worker.id} value={worker.id}>{worker.name}</option>)}
          </select>
        </label>
        <button className={control} type="button" onClick={() => change({ teams: draft.teams.filter(row => row.id !== team.id) })}><TranslatedText textKey="yardSchedule.remove" inline={false} /></button>
      </div>)}
      <button className={control} type="button" onClick={() => change({ teams: [...draft.teams, { id: crypto.randomUUID(), label: '', lead_id: '', member_ids: [] }] })}><TranslatedText textKey="yardSchedule.addTeam" inline={false} /></button>
    </fieldset>
    <fieldset disabled={busy} className="space-y-2">
      <legend className="font-semibold"><TranslatedText textKey="yardSchedule.equipment" inline={false} /></legend>
      {draft.equipment.map(item => <div key={item.id} className="flex items-end gap-2">
        <label className="grid"><TranslatedText textKey="yardSchedule.name" inline={false} />
          <input className={control} required maxLength={150} value={item.label} onChange={event => change({ equipment: draft.equipment.map(row => row.id === item.id ? { ...row, label: event.target.value } : row) })} />
        </label>
        <button className={control} type="button" onClick={() => change({ equipment: draft.equipment.filter(row => row.id !== item.id) })}><TranslatedText textKey="yardSchedule.remove" inline={false} /></button>
      </div>)}
      <button className={control} type="button" onClick={() => change({ equipment: [...draft.equipment, { id: crypto.randomUUID(), label: '' }] })}><TranslatedText textKey="yardSchedule.addEquipment" inline={false} /></button>
    </fieldset>
    <fieldset disabled={busy} className="space-y-2">
      <legend className="font-semibold"><TranslatedText textKey="yardSchedule.availability" inline={false} /></legend>
      {draft.availability.map((slot, index) => <div key={index} className="flex flex-wrap items-end gap-2">
        <label className="grid"><TranslatedText textKey="yardSchedule.worker" inline={false} />
          <select className={control} required value={slot.user_id} onChange={event => change({ availability: draft.availability.map((row, i) => i === index ? { ...row, user_id: event.target.value } : row) })}>
            <option value="">—</option>{draft.workers.map(worker => <option key={worker.id} value={worker.id}>{worker.name}</option>)}
          </select>
        </label>
        <label className="grid"><TranslatedText textKey="yardSchedule.availability" inline={false} />
          <select className={control} value={slot.kind} onChange={event => change({ availability: draft.availability.map((row, i) => i === index ? { ...row, kind: event.target.value as Availability['kind'] } : row) })}>
            <option value="shift"><TranslatedText textKey="yardSchedule.shift" inline={false} /></option>
            <option value="leave"><TranslatedText textKey="yardSchedule.leave" inline={false} /></option>
          </select>
        </label>
        {(['start', 'end'] as const).map(field => <label key={field} className="grid"><TranslatedText textKey={`yardSchedule.${field}`} inline={false} />
          <input className={control} type="datetime-local" required value={inputTime(slot[field])} onChange={event => change({ availability: draft.availability.map((row, i) => i === index ? { ...row, [field]: event.target.value } : row) })} />
        </label>)}
        <button className={control} type="button" onClick={() => change({ availability: draft.availability.filter((_, i) => i !== index) })}><TranslatedText textKey="yardSchedule.remove" inline={false} /></button>
      </div>)}
      <button className={control} type="button" onClick={() => change({ availability: [...draft.availability, { user_id: '', kind: 'shift', start: '', end: '' }] })}><TranslatedText textKey="yardSchedule.addAvailability" inline={false} /></button>
    </fieldset>
    <div className="flex gap-2">
      <button className={control} disabled={busy}><TranslatedText textKey="adminNew.common.save" inline={false} /></button>
      <button className={control} type="button" disabled={busy} onClick={() => setRevision(value => value + 1)}><TranslatedText textKey="yardSchedule.reload" inline={false} /></button>
    </div>
  </form>;
}
