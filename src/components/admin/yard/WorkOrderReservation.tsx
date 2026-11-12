'use client';

import { useEffect, useState } from 'react';
import { TranslatedText } from '@/components/cms/TranslatedText';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api-error';
import { yardEndpoint } from './YardHistory';
import type { ScheduleResources } from './YardSchedulingSettings';

export type Reservation = { start: string; duration_minutes: number; equipment_id: string | null };
const amsterdam = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Amsterdam', dateStyle: 'short', timeStyle: 'short' });

export function WorkOrderReservation({ id, initial, onSaved }: { id: string; initial?: Reservation | null; onSaved: () => void }) {
  const [reservation, setReservation] = useState(initial);
  const [start, setStart] = useState(initial ? amsterdam.format(new Date(initial.start)).replace(' ', 'T') : '');
  const [duration, setDuration] = useState(initial?.duration_minutes ?? 30);
  const [equipment, setEquipment] = useState(initial?.equipment_id ?? '');
  const [resources, setResources] = useState<ScheduleResources>();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    api<ScheduleResources>(`${yardEndpoint}/schedule-resources`).then(value => { if (active) setResources(value); })
      .catch(err => { if (active) setError(getApiErrorMessage(err)); });
    return () => { active = false; };
  }, []);

  async function save(value: string | null) {
    setBusy(true); setError('');
    try {
      const result = await api<{ reservation: Reservation | null }>(`${yardEndpoint}/work-orders/${id}/reservation`, {
        method: 'PUT', body: { start: value, duration_minutes: value ? duration : null, equipment_id: value ? equipment || null : null },
      });
      setReservation(result.reservation);
      if (!result.reservation) { setStart(''); setEquipment(''); }
      onSaved();
    } catch (err) { setError(getApiErrorMessage(err)); }
    finally { setBusy(false); }
  }

  return <details className="rounded-lg border border-navy-100 p-3">
    <summary className="cursor-pointer font-medium"><TranslatedText textKey="yardSchedule.workOrderReservation" inline={false} /></summary>
    <form className="mt-3 space-y-2" onSubmit={event => { event.preventDefault(); void save(start); }}>
      {error && <p role="alert" className="text-red-700">{error}</p>}
      <fieldset disabled={busy} className="flex flex-wrap items-end gap-2">
        <label className="grid"><TranslatedText textKey="yardSchedule.start" inline={false} />
          <input className="input-base" type="datetime-local" required value={start} onChange={event => setStart(event.target.value)} />
        </label>
        <label className="grid"><TranslatedText textKey="yardSchedule.minutes" inline={false} />
          <input className="input-base w-24" type="number" min={1} max={720} required value={duration} onChange={event => setDuration(Number(event.target.value))} />
        </label>
        {resources?.equipment?.length ? <label className="grid"><TranslatedText textKey="yardSchedule.equipment" inline={false} />
          <select className="input-base" value={equipment} onChange={event => setEquipment(event.target.value)}>
            <option value="">—</option>{resources.equipment.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
        </label> : null}
        <Button type="submit" size="sm"><TranslatedText textKey="adminNew.common.save" inline={false} /></Button>
        {reservation && <Button type="button" variant="outline" size="sm" onClick={() => void save(null)}><TranslatedText textKey="yardSchedule.clearReservation" inline={false} /></Button>}
      </fieldset>
    </form>
  </details>;
}
