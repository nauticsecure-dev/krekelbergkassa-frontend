'use client';

import { useState } from 'react';
import { getApiErrorMessage } from '@/lib/api-error';
import { boatsService } from '@/lib/services';
import { api } from '@/lib/api';
import { control, yardEndpoint } from './YardHistory';

export function YardQuickPhoto({ boat, taskId, onClose }: { boat: { id: string; name: string }; taskId?: string; onClose: () => void }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  return <div className="absolute inset-0 z-40 grid place-items-center bg-black/60 p-4">
    <form role="dialog" aria-label={`Foto toevoegen · ${boat.name}`} className="grid w-full max-w-sm gap-3 rounded-xl bg-slate-900 p-4 text-sm"
      onSubmit={async (event) => {
        event.preventDefault();
        if (busy) return;
        const form = event.currentTarget;
        const body = new FormData(form);
        setBusy(true); setMessage('');
        try {
          if (taskId) await api(`${yardEndpoint}/moves/${boat.id}/tasks/${taskId}/photos`, { method: 'POST', body });
          else await boatsService.uploadPhoto(boat.id, body);
          form.reset();
          setMessage('Foto toegevoegd aan het bootdossier.');
        } catch (err) { setMessage(getApiErrorMessage(err)); }
        finally { setBusy(false); }
      }}>
      <h3 className="font-semibold">Foto toevoegen · {boat.name}</h3>
      <label className="grid gap-1">Categorie
        <select name="folder" className={control}>
          <option value="general">Algemene bootfoto</option><option value="arrival">Aankomst</option>
          <option value="before_move">Voor verplaatsing</option><option value="after_move">Na verplaatsing</option>
          <option value="inspection">Conditie</option><option value="damage">Schade</option><option value="maintenance">Onderhoud</option>
        </select>
      </label>
      <label className="grid gap-1">Foto<input autoFocus name="file" type="file" accept="image/jpeg,image/png,image/webp" required /></label>
      {message && <p role="status">{message}</p>}
      <div className="flex gap-2"><button className={control} disabled={busy}>Uploaden</button>
        <button type="button" className={control} disabled={busy} onClick={onClose}>Sluiten</button></div>
    </form>
  </div>;
}
