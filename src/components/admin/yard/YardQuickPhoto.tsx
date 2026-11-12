'use client';
import { TranslatedText } from '@/components/cms/TranslatedText';

import { useState } from 'react';
import { getApiErrorMessage } from '@/lib/api-error';
import { boatsService } from '@/lib/services';
import { api } from '@/lib/api';
import { control, yardEndpoint } from './YardHistory';

export function YardQuickPhoto({ boat, taskId, taskType = 'yard_move', canApproveTopView = false, onChange, onClose }: { boat: { id: string; name: string }; taskId?: string; taskType?: 'yard_move' | 'boat'; canApproveTopView?: boolean; onChange?: () => void; onClose: () => void }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [topView, setTopView] = useState(false);

  return <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 text-white">
    <form role="dialog" aria-label={`Foto toevoegen · ${boat.name}`} className="grid w-full max-w-sm gap-3 rounded-xl bg-slate-900 p-4 text-sm"
      onSubmit={async (event) => {
        event.preventDefault();
        if (busy) return;
        const form = event.currentTarget;
        const body = new FormData(form);
        setBusy(true); setMessage('');
        try {
          if (topView && canApproveTopView && !taskId) await api(`${yardEndpoint}/boats/${boat.id}/top-view`, { method: 'POST', body });
          else if (taskId) await api(`${yardEndpoint}/${taskType === 'boat' ? 'boats' : 'moves'}/${boat.id}/tasks/${taskId}/photos`, { method: 'POST', body });
          else await boatsService.uploadPhoto(boat.id, body);
          form.reset();
          onChange?.();
          setMessage('Foto toegevoegd aan het bootdossier.');
        } catch (err) { setMessage(getApiErrorMessage(err)); }
        finally { setBusy(false); }
      }}>
      <h3 className="font-semibold"><TranslatedText textKey="siteCopy.b4aa7d63b0d51609" fallbackText={"Foto toevoegen ·"} />{' '}{boat.name}</h3>
      {canApproveTopView && !taskId && <label className="flex items-center gap-2"><input type="checkbox" checked={topView} onChange={(event) => setTopView(event.target.checked)} /><TranslatedText textKey="siteCopy.b7760951d2e6df6e" fallbackText={"Bovenaanzicht voor de werfkaart"} /></label>}
      {topView && <label className="flex items-start gap-2"><input type="checkbox" name="confirmed" value="1" required /><TranslatedText textKey="siteCopy.4edefbe4e339202d" fallbackText={"Ik heb de bootidentiteit en het bovenaanzicht gecontroleerd. De boeg wijst naar rechts. Gebruik een uitgesneden PNG of WebP."} /></label>}
      <label className="grid gap-1"><TranslatedText textKey="siteCopy.5e7bcfd445d2b7c8" fallbackText={"Categorie"} /><select name="folder" className={control}>
          <option value="general"><TranslatedText textKey="siteCopy.ad4b8ce85e838b4f" fallbackText={"Algemene bootfoto"} inline={false} /></option><option value="arrival"><TranslatedText textKey="siteCopy.fa7a2fbb275e24c2" fallbackText={"Aankomst"} inline={false} /></option>
          <option value="before_move"><TranslatedText textKey="siteCopy.e5f3420b6b39c45b" fallbackText={"Voor verplaatsing"} inline={false} /></option><option value="after_move"><TranslatedText textKey="siteCopy.4b1ce60e2bfe0f30" fallbackText={"Na verplaatsing"} inline={false} /></option>
          <option value="inspection"><TranslatedText textKey="siteCopy.2840168a4ef4cf5e" fallbackText={"Conditie"} inline={false} /></option><option value="damage"><TranslatedText textKey="siteCopy.9e48f570ffb9373b" fallbackText={"Schade"} inline={false} /></option><option value="maintenance"><TranslatedText textKey="siteCopy.f82093c3c7dd2ed3" fallbackText={"Onderhoud"} inline={false} /></option>
        </select>
      </label>
      <label className="grid gap-1"><TranslatedText textKey="siteCopy.24388726608f0eee" fallbackText={"Foto"} /><input autoFocus name="file" type="file" capture={taskId ? 'environment' : undefined} accept={topView ? 'image/png,image/webp' : 'image/jpeg,image/png,image/webp'} required /></label>
      {message && <p role="status">{message}</p>}
      <div className="flex gap-2"><button className={control} disabled={busy}><TranslatedText textKey="siteCopy.6633911a431fd21e" fallbackText={"Uploaden"} /></button>
        <button type="button" className={control} disabled={busy} onClick={onClose}><TranslatedText textKey="siteCopy.3c40d65df2d56610" fallbackText={"Sluiten"} /></button></div>
    </form>
  </div>;
}
