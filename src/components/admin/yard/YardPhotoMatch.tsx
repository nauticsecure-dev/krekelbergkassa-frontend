'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { control } from './YardHistory';

type MatchState = 'confirmed' | 'unknown' | 'duplicate';
type Position = { x: number; y: number; rotation: number; scale: number };
export type PhotoPlacement = { position: Position; placement_version: number; current: boolean; calibration_id: string;
  assessment: { severity: string; warnings: string[]; geometry_version: number } };
type Match = { state: MatchState; boat_id: string | null; duplicate_of: string | null; cutout_id: string | null;
  proposal: PhotoPlacement | null };
type Evidence = { match: Match | null; candidates: { id: string; name: string; distance_m?: number }[];
  calibration_ids: string[]; projection: Position | null };

export function YardPhotoMatch({ path, revision, detection, duplicates, cutout, onPlacement }: {
  path: string; revision: number; detection: string; duplicates: { id: string; index: number }[]; cutout?: string;
  onPlacement?: (boat: string, proposal: PhotoPlacement) => Promise<void>;
}) {
  const endpoint = path + '/matches/' + detection;
  const [state, setState] = useState<MatchState>('unknown');
  const [boat, setBoat] = useState('');
  const [duplicate, setDuplicate] = useState('');
  const [query, setQuery] = useState('');
  const [calibration, setCalibration] = useState('');
  const [link, setLink] = useState(false);
  const [evidence, setEvidence] = useState<Evidence>();
  const [saved, setSaved] = useState<Match | null>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    api<Evidence>(endpoint + '?revision=' + revision).then(result => {
      if (!active) return;
      setEvidence(result);
      setSaved(result.match);
      setState(result.match?.state ?? 'unknown');
      setBoat(result.match?.boat_id ?? '');
      setDuplicate(result.match?.duplicate_of ?? '');
      setLink(!!result.match?.cutout_id);
      setCalibration(result.match?.proposal?.calibration_id ?? '');
    }).catch(reason => { if (active) setError(reason.message); });
    return () => { active = false; };
  }, [endpoint, revision]);

  async function request(save: boolean) {
    setBusy(true);
    setError('');
    try {
      if (save) {
        const match = await api<Match>(endpoint, { method: 'PUT', body: { revision, state,
          ...(state === 'confirmed' ? { boat_id: boat, ...(link && cutout ? { cutout_id: cutout } : {}),
            ...(calibration ? { calibration_id: calibration } : {}) } : {}),
          ...(state === 'duplicate' ? { duplicate_of: duplicate } : {}),
        } });
        setSaved(match);
      } else {
        const params = new URLSearchParams({ revision: String(revision), q: query });
        if (calibration) params.set('calibration_id', calibration);
        setEvidence(await api<Evidence>(endpoint + '?' + params));
      }
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return <details className="space-y-2 rounded border border-slate-700 p-2">
    <summary className="cursor-pointer">Bootkoppeling en plaatsingsvoorstel</summary>
    {error && <p role="alert">{error}</p>}
    {evidence && <div className="space-y-2">
      <label className="block">Koppelstatus
        <select className={control + ' block w-full'} value={state} onChange={event => setState(event.target.value as MatchState)}>
          <option value="unknown">Onbekend</option><option value="confirmed">Bevestigd</option><option value="duplicate">Duplicaat</option>
        </select>
      </label>
      {state === 'duplicate' && <label className="block">Hoofddetectie
        <select className={control + ' block w-full'} value={duplicate} onChange={event => setDuplicate(event.target.value)}>
          <option value="">Kies de bevestigde detectie</option>
          {duplicates.map(item => <option key={item.id} value={item.id}>Detectie #{item.index + 1}</option>)}
        </select>
      </label>}
      {state === 'confirmed' && <>
        {evidence.calibration_ids.length > 0 && <label className="block">Kalibratie
          <select className={control + ' block w-full'} value={calibration} onChange={event => setCalibration(event.target.value)}>
            <option value="">Koppel alleen de boot</option>
            {evidence.calibration_ids.map(id => <option key={id} value={id}>{id}</option>)}
          </select>
        </label>}
        <label className="block">Bootnaam<input className={control + ' block w-full'} value={query} onChange={event => setQuery(event.target.value)} /></label>
        <button type="button" className={control} disabled={busy || (!query.trim() && !calibration)} onClick={() => void request(false)}>Zoek kandidaten</button>
        <label className="block">Kandidaat
          <select className={control + ' block w-full'} value={boat} onChange={event => setBoat(event.target.value)}>
            <option value="">Kies een boot</option>
            {boat && !evidence.candidates.some(candidate => candidate.id === boat) && <option value={boat}>{boat}</option>}
            {evidence.candidates.map(candidate => <option key={candidate.id} value={candidate.id}>{candidate.name}{candidate.distance_m !== undefined ? ' · ' + candidate.distance_m + ' m' : ''}</option>)}
          </select>
        </label>
        {cutout && <label className="block"><input type="checkbox" checked={link} onChange={event => setLink(event.target.checked)} /> Goedgekeurde PNG koppelen</label>}
      </>}
      <button type="button" className={control} disabled={busy || (state === 'confirmed' && !boat) || (state === 'duplicate' && !duplicate)}
        onClick={() => void request(true)}>Koppeling opslaan</button>
      {saved && <p role="status">Opgeslagen · {({ unknown: 'Onbekend', confirmed: 'Bevestigd', duplicate: 'Duplicaat' })[saved.state]}</p>}
      {saved?.proposal && <div>
        <p>Voorstel · {saved.proposal.position.x} m, {saved.proposal.position.y} m · {saved.proposal.position.rotation}°</p>
        {saved.proposal.assessment.warnings.map(warning => <p key={warning}>{warning}</p>)}
        {onPlacement && saved.proposal.current && <button type="button" className={control} disabled={busy} onClick={async () => {
          setBusy(true); setError('');
          try {
            const { match } = await api<Evidence>(endpoint + '?revision=' + revision);
            if (!match?.boat_id || !match.proposal?.current) throw new Error('Dit plaatsingsvoorstel is verlopen.');
            await onPlacement(match.boat_id, match.proposal);
          } catch (reason) { setError((reason as Error).message); }
          finally { setBusy(false); }
        }}>Open als kaartconcept</button>}
      </div>}
    </div>}
  </details>;
}
