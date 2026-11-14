'use client';
import { TranslatedText } from '@/components/cms/TranslatedText';

import { useEffect, useRef, useState } from 'react';
import { api, type ApiError } from '@/lib/api';
import { control } from './YardHistory';
import { YardPhotoMatch, type PhotoPlacement } from './YardPhotoMatch';
import { YardPhotoTiles, type YardTileMetadata } from './YardPhotoTiles';

type Point = [number, number];
type Status = 'pending' | 'approved' | 'rejected';
type Detection = { id: string; points: Point[]; confidence: number | null; status: Status; orientation?: number; parent_ids?: string[] };
export type YardAnalysis = { image_id: string; mode: 'ai' | 'manual'; revision: number; detections: Detection[] };

const colors: Record<Status, string> = { pending: '#fbbf24', approved: '#4ade80', rejected: '#f87171' };
const labels: Record<Status, string> = { pending: 'Ter review', approved: 'Goedgekeurd', rejected: 'Afgewezen' };
const stages = ['Uploaden', 'Orthofoto kiezen', 'Detecteren', 'Controleren', 'Lege werf', 'Publiceren'];

type RenderJob = { id?: string | null; metadata?: YardTileMetadata; processing?: { id: string; state: string; error?: string } };

async function renderOutput(path: string, action: string, body: object, signal: AbortSignal, onQueued: (id: string) => void) {
  let result = await api<RenderJob>(path + action, { method: 'POST', body });
  const job = result.processing?.id;
  if (job && !signal.aborted) onQueued(job);
  while (job && !result.id && !signal.aborted) {
    if (['failed', 'cancelled'].includes(result.processing?.state ?? '')) {
      throw new Error(result.processing?.error ?? 'De verwerking is geannuleerd.');
    }
    await new Promise(resolve => setTimeout(resolve, 1500));
    if (signal.aborted) break;
    result = await api<RenderJob>(path + '/jobs/' + job);
  }
  if (!result.id) throw new Error('Het resultaat is nog niet beschikbaar.');
  return { id: result.id, metadata: result.metadata };
}

function useObjectUrl(blob: Blob | undefined) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    const next = blob ? URL.createObjectURL(blob) : '';
    setUrl(next);
    return () => { if (next) URL.revokeObjectURL(next); };
  }, [blob]);
  return url;
}

function drawCutout(canvas: HTMLCanvasElement, image: HTMLImageElement, points: Point[]) {
  const pixels = points.map(([x, y]) => [x * image.naturalWidth, y * image.naturalHeight]);
  const left = Math.floor(Math.min(...pixels.map(([x]) => x)));
  const top = Math.floor(Math.min(...pixels.map(([, y]) => y)));
  const width = Math.ceil(Math.max(...pixels.map(([x]) => x))) - left;
  const height = Math.ceil(Math.max(...pixels.map(([, y]) => y))) - top;
  const scale = Math.min(1, 2048 / Math.max(width, height, 1));
  canvas.width = Math.max(1, Math.ceil(width * scale));
  canvas.height = Math.max(1, Math.ceil(height * scale));
  const context = canvas.getContext('2d');
  if (!context) return;
  context.scale(scale, scale);
  context.beginPath();
  pixels.forEach(([x, y], index) => {
    if (index === 0) context.moveTo(x - left, y - top);
    else context.lineTo(x - left, y - top);
  });
  context.closePath();
  context.clip();
  context.drawImage(image, -left, -top);
}

export function YardPhotoWorkflow({ path, analysis, images = [], outputs = [], onPublish, onPlacement, onRemove, deleting = false }: {
  path: string;
  analysis: YardAnalysis;
  images?: { id: string; filename: string }[];
  outputs?: { id: string; category?: string; metadata?: { revision?: number; source_image_id?: string; detection_id?: string } }[];
  onPublish?: (file: File, outputId: string) => void;
  onPlacement?: (boat: string, proposal: PhotoPlacement) => Promise<void>;
  onRemove?: () => void;
  deleting?: boolean;
}) {
  const [review, setReview] = useState(analysis);
  const [selected, setSelected] = useState(0);
  const [drawing, setDrawing] = useState<{ index: number; points: Point[] }>();
  const [source, setSource] = useState<Blob>();
  const [output, setOutput] = useState<{ blob?: Blob; id: string; metadata?: YardTileMetadata }>();
  const [view, setView] = useState<'source' | 'review' | 'empty'>('review');
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [renderJob, setRenderJob] = useState('');
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [ground, setGround] = useState('');
  const [groundConfirmed, setGroundConfirmed] = useState(false);
  const [cutouts, setCutouts] = useState<Record<string, string>>({});
  const photo = useRef<HTMLImageElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const cutout = useRef<HTMLCanvasElement>(null);
  const renderRequest = useRef<AbortController>();
  useEffect(() => () => renderRequest.current?.abort(), []);
  const photoUrl = useObjectUrl(source);
  const emptyUrl = useObjectUrl(output?.blob);
  const detection = review.detections[selected];

  useEffect(() => {
    let active = true;
    api<Blob>(path + '/images/' + analysis.image_id).then((blob) => {
      if (active) setSource(blob);
    }).catch(() => { if (active) setError('De orthofoto kon niet worden geladen.'); });
    return () => { active = false; };
  }, [path, analysis.image_id]);

  useEffect(() => {
    if (detection && loaded && photo.current && cutout.current) {
      drawCutout(cutout.current, photo.current, detection.points);
    }
  }, [detection, loaded]);

  function change(index: number, next: Detection) {
    const detections = [...review.detections];
    detections[index] = next;
    setReview({ ...review, detections });
    setDirty(true);
    setOutput(undefined);
    setView('review');
  }

  async function submit(generate: boolean) {
    setBusy(true);
    setError('');
    try {
      let saved = review;
      if (dirty) {
        saved = await api<YardAnalysis>(path + '/review', {
          method: 'PUT',
          body: { revision: review.revision, detections: review.detections.map(({ id, points, status, orientation, parent_ids }) => ({ id, points, status, orientation, parent_ids })) },
        });
        setReview(saved);
        setDirty(false);
      }
      if (generate) {
        const request = new AbortController();
        renderRequest.current = request;
        const result = await renderOutput(path, '/empty-yard', { revision: saved.revision, persist: true,
          ...(ground ? { ground_image_id: ground, ground_confirmed: groundConfirmed } : {}),
        }, request.signal, setRenderJob);
        const blob = result.metadata?.tile_size ? undefined : await api<Blob>(path + '/outputs/' + result.id);
        setOutput({ ...result, blob });
        setView('empty');
      }
    } catch (reason) {
      setError((reason as ApiError).message || 'De verwerking is mislukt.');
    } finally {
      setRenderJob('');
      setBusy(false);
    }
  }

  const counts = { pending: 0, approved: 0, rejected: 0 };
  review.detections.forEach(({ status }) => { counts[status]++; });

  return <section className="space-y-3">
    <ol aria-label="Verwerkingsstappen" className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
      {stages.map((stage, index) => <li key={stage} aria-current={index === (output ? 4 : 3) ? 'step' : undefined}
        className={'rounded-full border border-slate-700 px-3 py-2 text-sm ' + (index === (output ? 4 : 3) ? 'bg-blue-700' : 'bg-slate-900')}>
        <span className={index < 3 ? 'text-green-300' : 'text-slate-200'}>{index + 1}</span> {index === 2 && analysis.mode === 'manual' ? 'Handmatig' : stage}
      </li>)}
    </ol>
    {error && <p role="alert" className="rounded bg-red-950 p-2">{error}</p>}
    <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_19rem]">
      <div className="min-w-0 space-y-2">
        {onRemove && <div className="flex justify-end">
          <button type="button" className={`${control} !text-red-300`} disabled={busy || deleting} onClick={onRemove}><TranslatedText textKey="siteCopy.cf2ac9766c096588" fallbackText={"Foto verwijderen"} /></button>
        </div>}
        <div ref={viewport} className="max-h-[65vh] overflow-auto rounded-lg border border-slate-700 bg-slate-950">
          <div className="relative" style={{ width: zoom * 100 + '%' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {photoUrl && <img ref={photo} onLoad={() => setLoaded(true)} alt="Orthofoto van de werf" src={photoUrl} className="block w-full" />}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {view === 'empty' && emptyUrl && <img alt="Gegenereerde lege werf" src={emptyUrl} className="absolute inset-0 size-full" />}
            {view === 'empty' && output?.metadata?.tile_size && <YardPhotoTiles key={output.id} path={path + '/outputs/' + output.id} metadata={output.metadata} viewport={viewport} />}
            {view === 'review' && loaded && <svg className={'absolute inset-0 size-full ' + (drawing ? 'cursor-crosshair' : '')}
              viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-label="Bootmaskers op de orthofoto"
              onClick={(event) => {
                if (!drawing || drawing.points.length >= 200) return;
                const bounds = event.currentTarget.getBoundingClientRect();
                setDrawing({ ...drawing, points: [...drawing.points, [
                  Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width)),
                  Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height)),
                ]] });
              }}>
              {review.detections.map(({ points, status }, index) => index !== drawing?.index && <polygon
                key={index} points={points.map(([x, y]) => [x * 1000, y * 1000].join(',')).join(' ')}
                fill={colors[status]} fillOpacity={selected === index ? 0.3 : 0.12}
                stroke={colors[status]} strokeWidth={selected === index ? 3 : 1.5} vectorEffect="non-scaling-stroke"
                className={drawing ? 'pointer-events-none' : 'cursor-pointer'} onClick={() => setSelected(index)} />)}
              {drawing && <polyline points={drawing.points.map(([x, y]) => [x * 1000, y * 1000].join(',')).join(' ')}
                fill="none" stroke="white" strokeWidth="2" vectorEffect="non-scaling-stroke" />}
            </svg>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {([['source', 'Origineel (orthofoto)'], ['review', 'Bootmaskers'], ['empty', 'Lege werf']] as const).map(([mode, label]) =>
            <button key={mode} className={control} disabled={(mode === 'empty' && !output) || !!drawing}
              aria-pressed={view === mode} onClick={() => setView(mode)}>{label}</button>)}
          <button className={control} aria-label="Uitzoomen" disabled={zoom <= 1} onClick={() => setZoom(zoom - 0.5)}>−</button>
          <button className={control} aria-label="Inzoomen" disabled={zoom >= 3} onClick={() => setZoom(zoom + 0.5)}>+</button>
        </div>
      </div>
      <aside className="space-y-3">
        <div className="space-y-3 rounded-lg border border-slate-700 bg-slate-900 p-3">
          <h4 className="font-semibold"><TranslatedText textKey="siteCopy.8437afe2a6822c8f" fallbackText={"Bootdetecties"} /></h4>
          {detection && <>
            <select aria-label="Detectie" className={control + ' w-full'} value={selected} disabled={!!drawing}
              onChange={(event) => { setSelected(Number(event.target.value)); setView('review'); }}>
              {review.detections.map(({ status }, index) => <option key={index} value={index}><TranslatedText textKey="siteCopy.00a3512d6254f6ad" fallbackText={"Detectie #"} inline={false} />{index + 1} · {labels[status]}</option>)}
            </select>
            <canvas ref={cutout} aria-label="Transparante bootuitsnede" className="mx-auto max-h-40 max-w-full rounded bg-slate-700" />
            <p className="text-sm text-slate-300">{detection.confidence === null ? 'Handmatig masker' : 'AI-confidence ' + Math.round(detection.confidence * 100) + '%'}</p>
            <div className="flex flex-wrap gap-2">
              <button className={control + ' text-green-300'} disabled={busy || !!drawing}
                onClick={() => change(selected, { ...detection, status: 'approved' })}><TranslatedText textKey="siteCopy.32a3611bb358e472" fallbackText={"Goedkeuren"} /></button>
              <button className={control} disabled={busy || !!drawing || !loaded} onClick={() => {
                setView('review');
                setDrawing({ index: selected, points: [] });
              }}><TranslatedText textKey="siteCopy.8cc4f65db9269747" fallbackText={"Bewerken"} /></button>
              <label className="flex w-full items-center gap-2 text-sm">Boegrotatie (°)
                <input className={control + ' w-24'} type="number" min={0} max={360} disabled={busy || !!drawing}
                  value={detection.orientation ?? 0} onChange={event => {
                    const value = Number(event.target.value);
                    if (Number.isFinite(value) && value >= 0 && value <= 360) change(selected, { ...detection, orientation: value });
                  }} />
              </label>
              <button className={control + ' text-red-300'} disabled={busy || !!drawing}
                onClick={() => change(selected, { ...detection, status: 'rejected' })}><TranslatedText textKey="siteCopy.5ce3c1a4a26afdba" fallbackText={"Afwijzen"} /></button>
              <button className={control} disabled={!loaded || dirty || busy || detection.status !== 'approved'} onClick={async () => {
                setBusy(true); setError('');
                try {
                  const request = new AbortController();
                  renderRequest.current = request;
                  const { id } = await renderOutput(path, '/cutouts/' + detection.id, { revision: review.revision }, request.signal, setRenderJob);
                  if (request.signal.aborted) return;
                  setCutouts(current => ({ ...current, [review.revision + ':' + detection.id]: id }));
                  const blob = await api<Blob>(path + '/outputs/' + id);
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement('a'); link.href = url; link.download = 'boot-' + detection.id + '.png'; link.click();
                  setTimeout(() => URL.revokeObjectURL(url), 1000);
                } catch (reason) { setError((reason as ApiError).message || 'De uitsnede kon niet worden gemaakt.'); }
                finally { setRenderJob(''); setBusy(false); }
              }}><TranslatedText textKey="siteCopy.851844454ee82b41" fallbackText={"PNG downloaden"} /></button>
            </div>
            {!dirty && !busy && detection.status === 'approved' && <YardPhotoMatch
              key={review.revision + ':' + detection.id} path={path} revision={review.revision} detection={detection.id}
              onPlacement={onPlacement}
              duplicates={review.detections.map((item, index) => ({ ...item, index })).filter(item => item.status === 'approved' && item.id !== detection.id)}
              cutout={cutouts[review.revision + ':' + detection.id] ?? outputs.find(file => file.category === 'cutout'
                && file.metadata?.revision === review.revision && file.metadata.source_image_id === review.image_id
                && file.metadata.detection_id === detection.id)?.id} />}
          </>}
          {drawing ? <>
            <p className="text-sm"><TranslatedText textKey="siteCopy.765fedf0af2c3147" fallbackText={"Klik rondom de boot om het masker te tekenen."} /></p>
            <div className="flex flex-wrap gap-2">
              <button className={control} disabled={drawing.points.length < 3} onClick={() => {
                change(drawing.index, { ...review.detections[drawing.index], id: review.detections[drawing.index]?.id ?? crypto.randomUUID(), points: drawing.points, confidence: null, status: 'pending' });
                setSelected(drawing.index);
                setDrawing(undefined);
              }}><TranslatedText textKey="siteCopy.3ed3f37730819382" fallbackText={"Masker toepassen"} /></button>
              <button className={control} disabled={!drawing.points.length} onClick={() =>
                setDrawing({ ...drawing, points: drawing.points.slice(0, -1) })}><TranslatedText textKey="siteCopy.c041a6d11c73cd9b" fallbackText={"Punt wissen"} /></button>
              <button className={control} onClick={() => setDrawing(undefined)}><TranslatedText textKey="siteCopy.fd3604f2ec8ebb1a" fallbackText={"Annuleren"} /></button>
            </div>
          </> : <button className={control} disabled={busy || !loaded || review.detections.length >= 300} onClick={() => {
            setView('review');
            setDrawing({ index: review.detections.length, points: [] });
          }}><TranslatedText textKey="siteCopy.9db28007cfb58d83" fallbackText={"+ Bootmasker tekenen"} /></button>}
        </div>
        <div className="space-y-2 rounded-lg border border-slate-700 bg-slate-900 p-3">
          <h4 className="font-semibold"><TranslatedText textKey="siteCopy.a03d424cbd92f4cc" fallbackText={"Sessieresultaat ·"} />{' '}{review.detections.length}</h4>
          {(Object.keys(counts) as Status[]).map((status) => <div key={status} className="flex justify-between border-b border-slate-800 text-sm">
            <span style={{ color: colors[status] }}>{labels[status]}</span><span>{counts[status]}</span>
          </div>)}
          <button className={control} disabled={busy || !dirty || !!drawing} onClick={() => void submit(false)}><TranslatedText textKey="siteCopy.13e5170f2b105372" fallbackText={"Review opslaan"} /></button>
          {images.some(image => image.id !== analysis.image_id) && <label className="block text-sm">Bronfoto met vrije grond
            <select className={control + ' block w-full'} value={ground} disabled={busy} onChange={event => { setGround(event.target.value); setGroundConfirmed(false); }}>
              <option value="">Gebruik beeldreconstructie</option>
              {images.filter(image => image.id !== analysis.image_id).map(image => <option key={image.id} value={image.id}>{image.filename}</option>)}
            </select>
          </label>}
          {ground && <label className="block text-sm"><input type="checkbox" checked={groundConfirmed}
            onChange={event => setGroundConfirmed(event.target.checked)} /> De grond onder de maskers is vrij op deze bronfoto</label>}
          <button className="w-full rounded-lg bg-blue-700 px-3 py-2 font-semibold disabled:opacity-50"
            disabled={busy || !!drawing || !!counts.pending || (!!ground && !groundConfirmed)} onClick={() => void submit(true)}><TranslatedText textKey="siteCopy.3b185da8cd0488a3" fallbackText={"Lege werf genereren"} /></button>
          {busy && <p role="status" className="text-sm"><TranslatedText textKey="siteCopy.550306513d82dae7" fallbackText={"Bezig met verwerken…"} /></p>}
          {renderJob && <button type="button" className={control} onClick={async () => {
            try { await api(path + '/cancel-processing', { method: 'POST', body: { job_id: renderJob } }); }
            catch (reason) { setError((reason as Error).message); }
          }}>Verwerking annuleren</button>}
          {output && <div className="flex flex-wrap gap-2">
            {[false, ...(onPublish ? [true] : [])].map(publish => <button key={String(publish)} className={control} disabled={busy || !!drawing} onClick={async () => {
              setBusy(true); setError('');
              try {
                const blob = output.blob ?? await api<Blob>(path + '/outputs/' + output.id);
                if (publish && onPublish) onPublish(new File([blob], 'lege-werf.webp', { type: blob.type }), output.id);
                else {
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement('a'); link.href = url; link.download = 'lege-werf.webp'; link.click();
                  setTimeout(() => URL.revokeObjectURL(url), 1000);
                }
              } catch (reason) { setError((reason as Error).message); }
              finally { setBusy(false); }
            }}>{publish ? <TranslatedText textKey="siteCopy.67ccd1f00c1a89c1" fallbackText={"Naar uitlijning en publicatie"} />
              : <TranslatedText textKey="siteCopy.a5e6a98720928496" fallbackText={"Lege werf downloaden"} />}</button>)}
          </div>}
        </div>
      </aside>
    </div>
  </section>;
}
