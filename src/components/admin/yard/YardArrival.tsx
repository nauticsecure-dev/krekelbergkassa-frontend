'use client';
import { TranslatedText } from '@/components/cms/TranslatedText';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api-error';
import { control, yardEndpoint } from './YardHistory';

export type Arrival = { appointment_id?: string | null; service_code?: string | null; condition?: string | null; photo_ids?: string[] };
type Context = {
  appointments: { id: string; appointment_date: string; start_time: string; service_codes: string[] }[];
  photos: { id: string; name: string; url: string | null }[];
};

export function YardArrival({ boatId, name, version, onSaved, onClose }: {
  boatId: string; name: string; version: number; onSaved: () => void; onClose: () => void;
}) {
  const [context, setContext] = useState<Context>();
  const [appointment, setAppointment] = useState('');
  const [service, setService] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const path = `${yardEndpoint}/boats/${boatId}/arrival-context`;

  useEffect(() => {
    let active = true;
    api<Context>(path).then(data => { if (active) setContext(data); })
      .catch(err => { if (active) setError(getApiErrorMessage(err)); });
    return () => { active = false; };
  }, [path]);

  return <form aria-label="Aankomst registreren" className="grid gap-2 rounded border border-slate-700 p-3 text-sm"
    onSubmit={async event => {
      event.preventDefault();
      if (busy) return;
      const form = new FormData(event.currentTarget);
      setBusy(true); setError('');
      try {
        await api(`${yardEndpoint}/placements/${boatId}`, { method: 'PATCH', body: {
          operation: 'arrive', version, confirmed: form.get('confirmed') === 'on',
          arrival: { appointment_id: appointment || null, service_code: service || null, condition: form.get('condition') || null, photo_ids: photos },
        } });
        onSaved();
      } catch (err) { setError(getApiErrorMessage(err)); }
      finally { setBusy(false); }
    }}>
    <h3 className="font-semibold"><TranslatedText textKey="siteCopy.8db211d8e7048a84" fallbackText={"Aankomst · "} />{name}</h3>
    {!!context?.appointments.length && <div className="grid gap-1"><label htmlFor="yard-arrival-appointment"><TranslatedText textKey="siteCopy.de8bd8f90ac59d5f" fallbackText={"Afspraak"} /></label>
      <select id="yard-arrival-appointment" className={control} value={appointment} onChange={event => { setAppointment(event.target.value); setService(''); }}>
        <option value=""><TranslatedText textKey="siteCopy.41b78d59f2c2883e" fallbackText={"Geen afspraak"} inline={false} /></option>
        {context.appointments.map(row => <option key={row.id} value={row.id}>{row.appointment_date.slice(0, 10)} · {row.start_time} · {row.service_codes?.join(', ')}</option>)}
      </select>
    </div>}
    {appointment && <div className="grid gap-1"><label htmlFor="yard-arrival-service"><TranslatedText textKey="siteCopy.d65b13eacebd7cd3" fallbackText={"Dienst"} /></label>
      <select id="yard-arrival-service" className={control} value={service} onChange={event => setService(event.target.value)}>
        <option value=""><TranslatedText textKey="siteCopy.995cecf80b9722a8" fallbackText={"Geen specifieke dienst"} inline={false} /></option>
        {context?.appointments.find(row => row.id === appointment)?.service_codes?.map(code => <option key={code}>{code}</option>)}
      </select>
    </div>}
    <label className="grid gap-1"><TranslatedText textKey="siteCopy.cf1317ea1f614274" fallbackText={"Conditierapport"} /><textarea className={control} name="condition" maxLength={2000} /></label>
    <label className="grid gap-1"><TranslatedText textKey="siteCopy.ee218ddb47208a3d" fallbackText={"Aankomstfoto uploaden"} /><input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy || uploading || photos.length >= 12}
        onChange={async event => {
          const input = event.currentTarget;
          const file = input.files?.[0];
          if (!file) return;
          setUploading(true); setError('');
          const body = new FormData();
          body.set('folder', 'arrival');
          body.set('file', file);
          try {
            const uploaded = await api<{ file_id: string; filename: string; signed_url: string | null }>(`/v1/boats/${boatId}/photos`, { method: 'POST', body });
            setContext(current => ({ appointments: current?.appointments ?? [], photos: [
              { id: uploaded.file_id, name: uploaded.filename, url: uploaded.signed_url }, ...(current?.photos ?? []),
            ] }));
            setPhotos(current => [...current, uploaded.file_id]);
          } catch (err) { setError(getApiErrorMessage(err)); }
          finally { setUploading(false); input.value = ''; }
        }} />
    </label>
    {!!context?.photos.length && <fieldset className="grid gap-1">
      <legend><TranslatedText textKey="siteCopy.bd176859630ae11d" fallbackText={"Aankomstfoto’s uit het bootdossier"} /></legend>
      {context.photos.map(photo => <div key={photo.id} className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={photos.includes(photo.id)} disabled={uploading || (photos.length >= 12 && !photos.includes(photo.id))}
            onChange={event => setPhotos(current => event.target.checked ? [...current, photo.id] : current.filter(id => id !== photo.id))} />
          {photo.name}
        </label>
        {photo.url && <a className="underline" href={photo.url} target="_blank" rel="noreferrer"><TranslatedText textKey="siteCopy.5dccbda797292f05" fallbackText={"Bekijken"} /></a>}
      </div>)}
    </fieldset>}
    <label className="flex items-center gap-2"><input type="checkbox" name="confirmed" required /><TranslatedText textKey="siteCopy.6c372c5fece451fc" fallbackText={"Boot fysiek aangekomen"} /></label>
    {error && <p role="alert" className="text-red-300">{error}</p>}
    <div className="flex flex-wrap gap-2">
      <button className={control} disabled={busy || uploading}><TranslatedText textKey="siteCopy.f08bc87340cc8d09" fallbackText={"Aankomst opslaan"} /></button>
      <button className={control} disabled={busy || uploading} type="button" onClick={onClose}><TranslatedText textKey="siteCopy.d4edef5df714c528" fallbackText={"Sluiten"} /></button>
    </div>
  </form>;
}
