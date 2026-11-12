'use client';
import { TranslatedText } from '@/components/cms/TranslatedText';
import { useEffect, useState } from 'react';
import { api, type ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { control, yardEndpoint } from './YardHistory';

type Zone = { name: string; type: string; x: number; y: number; width: number; height: number };
export type YardGeometry = { version: number; verified: boolean; width: number; height: number; clearance_m: number; survey_reference: string | null; boundary: number[][]; zones: Zone[] };
type Calibration = { id: string; state: string; created_by: string; approved_by: string | null; geometry_version: number; image_sha256: string; evidence: { rms_error_m: number; max_error_m: number; survey_reference: string; points: Record<string, string | number>[]; transform: number[] } };
type Safety = { id: string; boat_id: string; state: string; reason: string; created_by: string; expires_at: string; proposal: unknown; assessment: unknown };
const message = (e: unknown) => (e as ApiError).message || 'Opslaan mislukt.';

export function YardMapManagement({ initial, version, prepared, onPublished, onGeometryChanged }: { initial: YardGeometry; version: number; prepared?: { file: File; outputId: string }; onPublished: () => void; onGeometryChanged: () => void }) {
  const { user } = useAuth();
  const reviewer = user?.role === 'super_admin';
  const [geometry, setGeometry] = useState(initial);
  const [boundary, setBoundary] = useState(initial.boundary.map(p => p.join(', ')).join('\n'));
  const [selectedFile, setFile] = useState<File | undefined>(prepared?.file);
  const [restoreVersion, setRestoreVersion] = useState('');
  const [reference, setReference] = useState('');
  const [points, setPoints] = useState(Array.from({ length: 4 }, () => ({ label: '', image_x: '', image_y: '', yard_x: '', yard_y: '' })));
  const [calibrations, setCalibrations] = useState<Calibration[]>([]);
  const [requests, setRequests] = useState<Safety[]>([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState('');
  async function refresh() {
    const [c, s] = await Promise.all([api<Calibration[]>(yardEndpoint + '/calibrations'), api<Safety[]>(yardEndpoint + '/safety-requests')]);
    setCalibrations(c); setRequests(s);
  }
  useEffect(() => { void refresh().catch(e => setError(message(e))); }, []);
  useEffect(() => { const url = selectedFile ? URL.createObjectURL(selectedFile) : ''; setPreview(url); return () => { if (url) URL.revokeObjectURL(url); }; }, [selectedFile]);
  async function run(action: () => Promise<unknown>) {
    setError(''); setNotice(''); setBusy(true);
    try { await action(); await refresh(); } catch (e) { setError(message(e)); } finally { setBusy(false); }
  }
  return <section aria-label="Kaartbeheer en veiligheidsbeoordeling" className="space-y-4 rounded border border-slate-600 bg-slate-900 p-3 text-sm">
    <h2 className="font-semibold"><TranslatedText textKey="siteCopy.d14bbccffdbc9c3a" fallbackText={"Gemeten werfkaart en onafhankelijke beoordeling"} /></h2>
    {error && <p role="alert" className="text-red-200">{error}</p>}{notice && <p role="status">{notice}</p>}
    <p><TranslatedText textKey="siteCopy.400b9f81cc488481" fallbackText={"Geometrieversie "} />{geometry.version} · {geometry.verified ? 'Gemeten grens vastgelegd' : 'Nog geen gemeten werfgrens'} <TranslatedText textKey="siteCopy.0a739fbc72e0369f" fallbackText={" · Vrije ruimte "} />{geometry.clearance_m} <TranslatedText textKey="siteCopy.7290de83248b262e" fallbackText={" m"} /></p>
    {reviewer && <details><summary className={control}><TranslatedText textKey="siteCopy.2bdd1be2f8f9f57a" fallbackText={"Werfgrens en zones instellen"} /></summary>
      <form className="mt-2 grid gap-2" onSubmit={e => { e.preventDefault(); void run(async () => {
        const result = await api<YardGeometry>(yardEndpoint + '/geometry', { method: 'PUT', body: { ...geometry, boundary: boundary.split('\n').filter(v => v.trim()).map(v => v.split(',').map(Number)), confirmed: true } });
        setGeometry(result); onGeometryChanged(); setNotice('Grens opgeslagen. Bestaande foto vereist een nieuwe kalibratie.');
      }); }}>
        <div className="flex flex-wrap gap-2">{(['width', 'height', 'clearance_m'] as const).map(key => <label key={key} className="grid">{{ width: 'Kaartbreedte (m)', height: 'Kaarthoogte (m)', clearance_m: 'Minimale vrije ruimte (m)' }[key]}<input className={control} type="number" min={key === 'clearance_m' ? 0 : 1} max={key === 'clearance_m' ? 20 : 1000} step="0.01" required value={geometry[key]} onChange={e => setGeometry({ ...geometry, [key]: Number(e.target.value) })} /></label>)}</div>
        <label className="grid"><TranslatedText textKey="siteCopy.17ac96254ab4e9b0" fallbackText={"Meetrapport / referentie"} /><input className={control} required minLength={3} value={geometry.survey_reference ?? ''} onChange={e => setGeometry({ ...geometry, survey_reference: e.target.value })} /></label>
        <label className="grid"><TranslatedText textKey="siteCopy.15d14b8184e4b77b" fallbackText={"Grenspunten in volgorde: x, y in meters (één punt per regel)"} /><textarea className={control} rows={5} required value={boundary} onChange={e => setBoundary(e.target.value)} /></label>
        {geometry.zones.map((zone, i) => <div key={i} className="flex flex-wrap gap-1">
          <label><TranslatedText textKey="siteCopy.210dfb67da87e7c2" fallbackText={"Zone"} /><input aria-label={`Zonenaam ${i + 1}`} className={control} required value={zone.name} onChange={e => setGeometry({ ...geometry, zones: geometry.zones.map((z, j) => i === j ? { ...z, name: e.target.value } : z) })} /></label>
          <select aria-label={`Zonetype ${i + 1}`} className={control} value={zone.type} onChange={e => setGeometry({ ...geometry, zones: geometry.zones.map((z, j) => i === j ? { ...z, type: e.target.value } : z) })}><option value="building"><TranslatedText textKey="siteCopy.b0394b19237fdf6f" fallbackText={"Gebouw"} inline={false} /></option><option value="restricted"><TranslatedText textKey="siteCopy.958da16cab1250e2" fallbackText={"Verboden zone"} inline={false} /></option><option value="route"><TranslatedText textKey="siteCopy.b8303049d694f991" fallbackText={"Rijroute"} inline={false} /></option></select>
          {(['x', 'y', 'width', 'height'] as const).map(key => <label key={key}>{key} <TranslatedText textKey="siteCopy.e7682d3519030463" fallbackText={" (m)"} /><input className={`${control} w-24`} required type="number" step="0.01" min={key === 'x' || key === 'y' ? 0 : .1} value={zone[key]} onChange={e => setGeometry({ ...geometry, zones: geometry.zones.map((z, j) => i === j ? { ...z, [key]: Number(e.target.value) } : z) })} /></label>)}
          <button type="button" className={control} onClick={() => setGeometry({ ...geometry, zones: geometry.zones.filter((_, j) => i !== j) })}><TranslatedText textKey="siteCopy.6bd16254720ffb5c" fallbackText={"Zone verwijderen"} /></button>
        </div>)}
        <button type="button" className={control} onClick={() => setGeometry({ ...geometry, zones: [...geometry.zones, { name: '', type: 'restricted', x: 0, y: 0, width: 1, height: 1 }] })}><TranslatedText textKey="siteCopy.b8b0f29aea102876" fallbackText={"Zone toevoegen"} /></button>
        <label><input type="checkbox" required /> <TranslatedText textKey="siteCopy.bebfda312b41c905" fallbackText={" Grens, zones en meetreferentie gecontroleerd."} /></label><button className={control} disabled={busy}><TranslatedText textKey="siteCopy.a197e512741d634c" fallbackText={"Geometrie opslaan"} /></button>
      </form>
    </details>}
    <form className="grid gap-2" onSubmit={e => { e.preventDefault(); void run(async () => {
      if (!selectedFile) throw new Error('Kies een luchtfoto.');
      const body = new FormData(); body.set('image', selectedFile); body.set('geometry_version', String(geometry.version)); body.set('survey_reference', reference);
      if (prepared && selectedFile === prepared.file) body.set('photo_output_id', prepared.outputId);
      points.forEach((p, i) => Object.entries(p).forEach(([key, value]) => body.set(`points[${i}][${key}]`, value)));
      await api(yardEndpoint + '/calibrations', { method: 'POST', body }); setNotice('Kalibratie ter beoordeling aangeboden. Een andere Super Admin moet de meetpunten goedkeuren.');
    }); }}>
      <h3 className="font-semibold"><TranslatedText textKey="siteCopy.5f9da522758e376e" fallbackText={"Nieuwe fotokalibratie"} /></h3>
      <label><TranslatedText textKey="siteCopy.ab4c893aa66b609d" fallbackText={"Luchtfoto"} /><input type="file" accept="image/png,image/jpeg,image/webp" required={!selectedFile} onChange={e => setFile(e.target.files?.[0])} />{selectedFile?.name}</label>
      {preview && <img src={preview} alt="Bronfoto voor meetpunten" className="max-h-72 max-w-full object-contain" />}
      <p><TranslatedText textKey="siteCopy.575c58abfdd8ab9e" fallbackText={"Gebruik minstens vier verspreide, onafhankelijk gemeten punten. Fotocoördinaten lopen van 0 tot 1; werfcoördinaten zijn meters. Maximale afwijking: 0,25 m."} /></p>
      <label className="grid"><TranslatedText textKey="siteCopy.17ac96254ab4e9b0" fallbackText={"Meetrapport / referentie"} /><input className={control} required minLength={3} value={reference} onChange={e => setReference(e.target.value)} /></label>
      <div className="overflow-x-auto"><table><thead><tr>{['Punt', 'Foto X (0–1)', 'Foto Y (0–1)', 'Werf X (m)', 'Werf Y (m)'].map(v => <th key={v}>{v}</th>)}</tr></thead><tbody>{points.map((point, i) => <tr key={i}>{(Object.keys(point) as (keyof typeof point)[]).map(key => <td key={key}><input aria-label={`Meetpunt ${i + 1} ${key}`} className={`${control} w-28`} required type={key === 'label' ? 'text' : 'number'} step="any" min={key.startsWith('image_') ? 0 : undefined} max={key.startsWith('image_') ? 1 : undefined} value={point[key]} onChange={e => setPoints(points.map((p, j) => i === j ? { ...p, [key]: e.target.value } : p))} /></td>)}</tr>)}</tbody></table></div>
      <button className={control} type="button" disabled={points.length >= 30} onClick={() => setPoints([...points, { label: '', image_x: '', image_y: '', yard_x: '', yard_y: '' }])}><TranslatedText textKey="siteCopy.c6610306a0ad3454" fallbackText={"Meetpunt toevoegen"} /></button>
      <button className={control} disabled={busy || !geometry.verified}><TranslatedText textKey="siteCopy.76c8484a94527b37" fallbackText={"Kalibratie indienen"} /></button>
    </form>
    <button className={control} disabled={busy} onClick={() => void run(refresh)}><TranslatedText textKey="siteCopy.5c1413e60d92cf11" fallbackText={"Beoordelingen vernieuwen"} /></button>
    {calibrations.map(c => <article key={c.id} className="space-y-2 border-t border-slate-600 pt-2">
      <p><TranslatedText textKey="siteCopy.db922f4608ac2965" fallbackText={"Kalibratie "} />{c.id} · {c.state} <TranslatedText textKey="siteCopy.d4986a91027a1fe6" fallbackText={" · geometrie "} />{c.geometry_version}</p>
      <p><TranslatedText textKey="siteCopy.99dc02d4d83a3fbd" fallbackText={"Meetrapport: "} />{c.evidence.survey_reference} <TranslatedText textKey="siteCopy.25c290e5859acac0" fallbackText={" · Gemiddelde afwijking "} />{Number(c.evidence.rms_error_m).toFixed(3)} <TranslatedText textKey="siteCopy.3b41f732b253d8e5" fallbackText={" m · Maximum "} />{Number(c.evidence.max_error_m).toFixed(3)} <TranslatedText textKey="siteCopy.7290de83248b262e" fallbackText={" m"} /></p>
      <details><summary><TranslatedText textKey="siteCopy.68a9bba9818381e6" fallbackText={"Controlepunten en bronbewijs"} /></summary><p className="break-all"><TranslatedText textKey="siteCopy.59a0a0d9ae890575" fallbackText={"SHA-256: "} />{c.image_sha256}</p><pre className="overflow-x-auto text-xs">{JSON.stringify(c.evidence.points, null, 2)}</pre><p><TranslatedText textKey="siteCopy.5670d00eb43a4a6c" fallbackText={"Maker: "} />{c.created_by} <TranslatedText textKey="siteCopy.52303f87111c1966" fallbackText={" · Goedkeurder: "} />{c.approved_by ?? 'Nog niet beoordeeld'}</p><button className={control} onClick={() => void run(async () => { const blob = await api<Blob>(`${yardEndpoint}/calibrations/${c.id}/image`); const url = URL.createObjectURL(blob); window.open(url, '_blank', 'noopener,noreferrer'); setTimeout(() => URL.revokeObjectURL(url), 60000); })}><TranslatedText textKey="siteCopy.46d285c424b63b0e" fallbackText={"Bronfoto bekijken"} /></button></details>
      {reviewer && c.state === 'pending' && c.created_by !== user?.id && <button className={control} disabled={busy} onClick={() => { if (window.confirm('Bronfoto, meetpunten en afwijkingen onafhankelijk gecontroleerd?')) void run(() => api(`${yardEndpoint}/calibrations/${c.id}/approve`, { method: 'POST', body: { confirmed: true } })); }}><TranslatedText textKey="siteCopy.da5ab232f9f4455a" fallbackText={"Kalibratie goedkeuren"} /></button>}
      {c.state === 'approved' && c.geometry_version === geometry.version && <button className={control} disabled={busy} onClick={() => { if (window.confirm('Deze goedgekeurde kaart publiceren? Bootposities blijven behouden.')) void run(async () => { await api(yardEndpoint + '/background', { method: 'POST', body: { version, calibration_id: c.id, calibrated: true } }); onPublished(); }); }}><TranslatedText textKey="siteCopy.af482a4099cdc3b0" fallbackText={"Goedgekeurde kaart publiceren"} /></button>}
    </article>)}
    {reviewer && version > 1 && <form className="flex flex-wrap items-end gap-2" onSubmit={event => {
      event.preventDefault();
      void run(async () => {
        await api(yardEndpoint + '/background/restore', { method: 'POST', body: { version, restore_version: Number(restoreVersion), confirmed: true } });
        onPublished();
      });
    }}>
      <label className="grid"><TranslatedText textKey="yardPhotos.previousMapVersion" inline={false} />
        <input className={control} type="number" min={1} max={version - 1} required value={restoreVersion} onChange={event => setRestoreVersion(event.target.value)} />
      </label>
      <button className={control} disabled={busy}><TranslatedText textKey="yardPhotos.restoreMap" inline={false} /></button>
    </form>}
    {reviewer && requests.filter(r => r.state === 'pending').map(r => <article key={r.id} className="space-y-2 border-t border-red-700 pt-2"><h3><TranslatedText textKey="siteCopy.6b572e91ed7afaa2" fallbackText={"Veiligheidsverzoek voor boot "} />{r.boat_id}</h3><p>{r.reason} <TranslatedText textKey="siteCopy.f27a8c5284a4ea8c" fallbackText={" · Geldig tot "} />{new Date(r.expires_at).toLocaleString('nl-NL')}</p><pre className="max-h-64 overflow-auto text-xs">{JSON.stringify({ proposal: r.proposal, assessment: r.assessment }, null, 2)}</pre><label className="grid"><TranslatedText textKey="siteCopy.2f0f1be5d582e1fa" fallbackText={"Beoordeling"} /><input className={control} value={notes[r.id] ?? ''} onChange={e => setNotes({ ...notes, [r.id]: e.target.value })} /></label><button className={control} disabled={busy || r.created_by === user?.id || (notes[r.id] ?? '').length < 5} onClick={() => { if (window.confirm('Risico en maatregel onafhankelijk beoordeeld?')) void run(() => api(`${yardEndpoint}/safety-requests/${r.id}/approve`, { method: 'POST', body: { confirmed: true, note: notes[r.id] } })); }}><TranslatedText textKey="siteCopy.700d3cc83487eeb5" fallbackText={"Veiligheidsuitzondering goedkeuren"} /></button></article>)}
  </section>;
}

export function YardSafetyProposal({ proposal, onApproved }: { proposal: { boatId: string; version: number; operation: string; reason: string; position: unknown; due_at?: string; duration_minutes?: number }; onApproved: (id: string | undefined) => void }) {
  const [request, setRequest] = useState<{ id: string; state: string }>();
  const [error, setError] = useState('');
  const [immediate, setImmediate] = useState(false);
  const effective = immediate && proposal.operation === 'plan' ? { ...proposal, operation: 'move_now', due_at: undefined, duration_minutes: undefined } : proposal;
  const key = JSON.stringify(effective);
  useEffect(() => { setRequest(undefined); onApproved(undefined); }, [key, onApproved]);
  async function check() {
    try { const rows = await api<{ id: string; state: string }[]>(yardEndpoint + '/safety-requests', { query: { boat_id: proposal.boatId } }); const row = rows.find(r => r.id === request?.id); if (row) { setRequest(row); onApproved(row.state === 'approved' ? row.id : undefined); } } catch (e) { setError(message(e)); }
  }
  return <div className="space-y-2 rounded border border-red-600 p-2 text-xs"><p><TranslatedText textKey="siteCopy.afd05083775cf270" fallbackText={"Rood conflict: een onafhankelijke Super Admin moet dit exacte voorstel goedkeuren. Goedkeuring verloopt na 15 minuten en geldt één keer."} /></p>{error && <p role="alert">{error}</p>}
    {proposal.operation === 'plan' && <label className="block"><input type="checkbox" checked={immediate} onChange={e => setImmediate(e.target.checked)} /> <TranslatedText textKey="siteCopy.6e39067e3ae56821" fallbackText={" Goedkeuring voor “Nu verplaatst” aanvragen"} /></label>}
    {!request ? <button type="button" className={control} disabled={proposal.reason.length < 5} onClick={async () => { try { setError(''); const { boatId, ...body } = effective; setRequest(await api(`${yardEndpoint}/placements/${boatId}/safety-requests`, { method: 'POST', body })); } catch (e) { setError(message(e)); } }}><TranslatedText textKey="siteCopy.27a0d61029c07ada" fallbackText={"Veiligheidsbeoordeling aanvragen"} /></button> : <><p><TranslatedText textKey="siteCopy.1a80a2f7639fac80" fallbackText={"Beoordeling: "} />{request.state}</p><button type="button" className={control} onClick={() => void check()}><TranslatedText textKey="siteCopy.1fb30399a3b37142" fallbackText={"Goedkeuring controleren"} /></button></>}
  </div>;
}

export function YardRestoreReview({ boatId, version, position, reason, onApproved }: { boatId: string; version: number; position: unknown; reason: string; onApproved: (id: string | undefined) => void }) {
  const [red, setRed] = useState(false);
  const [error, setError] = useState('');
  const key = JSON.stringify(position);
  useEffect(() => {
    let active = true; onApproved(undefined);
    api<{ requires_approval: boolean; details: { overridable: boolean }[] }>(`${yardEndpoint}/placements/${boatId}/check`, { method: 'POST', body: { position: JSON.parse(key) } })
      .then(result => { if (active) setRed(result.requires_approval && result.details.every(d => d.overridable)); })
      .catch(e => { if (active) setError(message(e)); });
    return () => { active = false; };
  }, [boatId, version, key, onApproved]);
  return <>{error && <p role="alert">{error}</p>}{red && <YardSafetyProposal proposal={{ boatId, version, position, reason, operation: 'restore' }} onApproved={onApproved} />}</>;
}
