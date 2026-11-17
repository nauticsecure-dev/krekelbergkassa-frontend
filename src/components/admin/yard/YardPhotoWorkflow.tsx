'use client';
import { TranslatedText } from '@/components/cms/TranslatedText';

import { useEffect, useId, useRef, useState } from 'react';
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
const panel = 'space-y-3 rounded-xl border border-navy-700 bg-navy-900 p-3 text-white';
const polygonPoints = (points: Point[]) => points.map(([x, y]) => [x * 1000, y * 1000].join(',')).join(' ');
const views = [
  ['source', <TranslatedText key="source" textKey="yardPhotos.viewOriginal" />],
  ['review', <TranslatedText key="review" textKey="yardPhotos.viewDetection" />],
  ['empty', <TranslatedText key="empty" textKey="yardPhotos.viewEmpty" />],
  ['interactive', <TranslatedText key="interactive" textKey="yardPhotos.viewInteractive" />],
] as const;

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
  outputs?: { id: string; category?: string; metadata?: YardTileMetadata & { revision?: number; source_image_id?: string; detection_id?: string } }[];
  onPublish?: (file: File, outputId: string) => void;
  onPlacement?: (boat: string, proposal: PhotoPlacement) => Promise<void>;
  onRemove?: () => void;
  deleting?: boolean;
}) {
  const [review, setReview] = useState(analysis);
  const [selected, setSelected] = useState(0);
  const [drawing, setDrawing] = useState<{ index: number; points: Point[] }>();
  const [source, setSource] = useState<Blob>();
  const [generated, setOutput] = useState<{ blob?: Blob; id: string; metadata?: YardTileMetadata }>();
  const [preview, setPreview] = useState<{ id: string; blob: Blob }>();
  const [view, setView] = useState<(typeof views)[number][0]>('review');
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
  const interactiveClip = useId();
  const renderRequest = useRef<AbortController>();
  useEffect(() => () => renderRequest.current?.abort(), []);
  const photoUrl = useObjectUrl(source);
  const output = dirty ? undefined : generated ?? outputs.find(file => file.category === 'empty_yard'
    && file.metadata?.revision === review.revision && file.metadata.source_image_id === review.image_id);
  const outputId = output?.id;
  const outputMetadata = output?.metadata;
  const outputBlob = generated?.blob;
  const emptyUrl = useObjectUrl(outputBlob ?? (preview?.id === outputId ? preview?.blob : undefined));
  const showEmpty = view === 'empty' || view === 'interactive';
  const detection = review.detections[selected];

  useEffect(() => {
    if (!outputId || outputBlob) return;
    let active = true;
    const tileSize = outputMetadata?.tile_size;
    const url = path + '/outputs/' + outputId + (tileSize
      ? '/tiles/' + Math.max(0, Math.ceil(Math.log2(Math.max(outputMetadata.width, outputMetadata.height) / tileSize))) + '/0/0'
      : '');
    api<Blob>(url).then(blob => {
      if (active) setPreview({ id: outputId, blob });
    }).catch(() => { if (active && !tileSize) setError('De lege werf kon niet worden geladen.'); });
    return () => { active = false; };
  }, [path, outputId, outputMetadata, outputBlob]);

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
  const currentStage = output ? 4 : 3;

  return <section className="space-y-3">
    <ol aria-label="Verwerkingsstappen" className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
      {stages.map((stage, index) => <li key={stage} aria-current={index === currentStage ? 'step' : undefined}
        className={'flex items-center gap-2 rounded-full border px-2 py-1.5 text-xs font-medium sm:text-sm ' + (index === currentStage ? 'border-blue-600 bg-navy-900 text-white' : 'border-navy-200 bg-white text-navy-900')}>
        <span className={'grid size-7 shrink-0 place-items-center rounded-full text-white ' + (index < currentStage ? 'bg-green-700' : index === currentStage ? 'bg-blue-700' : 'bg-slate-600')}>{index + 1}</span>
        {index === 2 && analysis.mode === 'manual' ? 'Handmatig' : stage}
        {index < currentStage && <span className="text-green-700" aria-hidden="true">✓</span>}
      </li>)}
    </ol>
    {error && <p role="alert" className="rounded bg-red-950 p-2 text-white">{error}</p>}
    <div className="grid gap-3 lg:grid-cols-[minmax(0,2.15fr)_minmax(17rem,1fr)]">
      <div className="min-w-0">
        <div className="relative overflow-hidden rounded-xl border border-navy-200">
        <div ref={viewport} className="max-h-[68vh] min-h-32 overflow-auto bg-navy-100">
          <div className="relative" style={{ width: zoom * 100 + '%' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {photoUrl && <img ref={photo} onLoad={() => setLoaded(true)} alt="Orthofoto van de werf" src={photoUrl} className="block w-full" />}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {showEmpty && emptyUrl && !outputMetadata?.tile_size && <img alt="Gegenereerde lege werf" src={emptyUrl} className="absolute inset-0 size-full" />}
            {showEmpty && outputMetadata?.tile_size && <YardPhotoTiles key={outputId} path={path + '/outputs/' + outputId} metadata={outputMetadata} viewport={viewport} />}
            {(view === 'review' || view === 'interactive') && loaded && <svg className={'absolute inset-0 size-full ' + (drawing ? 'cursor-crosshair' : '')}
              viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-label="Bootmaskers op de orthofoto"
              onClick={(event) => {
                if (!drawing || drawing.points.length >= 200) return;
                const bounds = event.currentTarget.getBoundingClientRect();
                setDrawing({ ...drawing, points: [...drawing.points, [
                  Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width)),
                  Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height)),
                ]] });
              }}>
              {view === 'interactive' && <>
                <defs><clipPath id={interactiveClip}>{review.detections.filter(item => item.status === 'approved').map(item =>
                  <polygon key={item.id} points={polygonPoints(item.points)} />)}</clipPath></defs>
                <image href={photoUrl} width={1000} height={1000} preserveAspectRatio="none" clipPath={`url(#${interactiveClip})`} />
              </>}
              {review.detections.map(({ id, points, status }, index) => {
                if (index === drawing?.index || (view === 'interactive' && status !== 'approved')) return null;
                const [x, y] = points.reduce(([left, top], point) => [Math.min(left, point[0]), Math.min(top, point[1])], [1, 1]);
                return <g key={id} className={drawing ? 'pointer-events-none' : 'cursor-pointer'} onClick={() => setSelected(index)}>
                  <polygon points={polygonPoints(points)} fill={colors[status]} fillOpacity={selected === index ? 0.3 : 0.12}
                    stroke={colors[status]} strokeWidth={selected === index ? 3 : 1.5} vectorEffect="non-scaling-stroke" />
                  <text x={x * 1000 + 4} y={y * 1000 + 21} fill="white" stroke="#07192b" strokeWidth="7" strokeLinejoin="round"
                    paintOrder="stroke" fontSize="20" fontWeight="600">{index + 1}</text>
                </g>;
              })}
              {drawing && <polyline points={drawing.points.map(([x, y]) => [x * 1000, y * 1000].join(',')).join(' ')}
                fill="none" stroke="white" strokeWidth="2" vectorEffect="non-scaling-stroke" />}
            </svg>}
          </div>
        </div>
        <div className="absolute left-2 top-2 grid gap-1">
          <button className={control} aria-label="Inzoomen" disabled={zoom >= 3} onClick={() => setZoom(zoom + 0.5)}>+</button>
          <button className={control} aria-label="Uitzoomen" disabled={zoom <= 1} onClick={() => setZoom(zoom - 0.5)}>−</button>
        </div>
        {view === 'review' && <ul className="pointer-events-none absolute bottom-0 right-0 flex flex-wrap gap-x-3 gap-y-1 rounded-tl-lg bg-navy-950/90 px-3 py-2 text-xs text-white">
          {(['approved', 'pending', 'rejected'] as const).map(status => <li key={status} className="flex items-center gap-1.5">
            <span className="size-3 rounded-sm border-2" style={{ borderColor: colors[status] }} />{labels[status]} ({counts[status]})
          </li>)}
        </ul>}
        </div>
        {onRemove && <button type="button" className={`${control} mt-2 !text-red-300`} disabled={busy || deleting} onClick={onRemove}><TranslatedText textKey="siteCopy.cf2ac9766c096588" fallbackText={"Foto verwijderen"} /></button>}
      </div>
      <aside className="space-y-3">
        <div className={panel}>
          <h4 className="text-lg font-semibold">{detection ? <><TranslatedText textKey="siteCopy.00a3512d6254f6ad" fallbackText="Detectie #" />{selected + 1}</> : <TranslatedText textKey="siteCopy.8437afe2a6822c8f" fallbackText={"Bootdetecties"} />}</h4>
          {detection && <>
            <select aria-label="Detectie" className={control + ' w-full'} value={selected} disabled={!!drawing}
              onChange={(event) => { setSelected(Number(event.target.value)); setView('review'); }}>
              {review.detections.map(({ status }, index) => <option key={index} value={index}><TranslatedText textKey="siteCopy.00a3512d6254f6ad" fallbackText={"Detectie #"} inline={false} />{index + 1} · {labels[status]}</option>)}
            </select>
            <div className="grid grid-cols-2 items-center gap-3">
              <div className="grid min-h-24 place-items-center overflow-hidden rounded bg-slate-100 [background-image:conic-gradient(#cbd5e1_25%,transparent_0_50%,#cbd5e1_0_75%,transparent_0)] [background-size:16px_16px]">
                <canvas ref={cutout} aria-label="Transparante bootuitsnede" className="max-h-40 max-w-full" />
              </div>
              <p className="text-sm text-slate-200">{detection.confidence === null ? 'Handmatig masker' : 'AI-confidence ' + Math.round(detection.confidence * 100) + '%'}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className={control + ' !bg-green-700'} disabled={busy || !!drawing}
                onClick={() => change(selected, { ...detection, status: 'approved' })}><TranslatedText textKey="siteCopy.32a3611bb358e472" fallbackText={"Goedkeuren"} /></button>
              <button className={control} disabled={busy || !!drawing || !loaded} onClick={() => {
                setView('review');
                setDrawing({ index: selected, points: [] });
              }}><TranslatedText textKey="siteCopy.8cc4f65db9269747" fallbackText={"Bewerken"} /></button>
              <button className={control + ' !bg-red-700'} disabled={busy || !!drawing}
                onClick={() => change(selected, { ...detection, status: 'rejected' })}><TranslatedText textKey="siteCopy.5ce3c1a4a26afdba" fallbackText={"Afwijzen"} /></button>
              <label className="flex w-full items-center gap-2 text-sm"><TranslatedText textKey="siteCopy.a67ba06f9c5a5f0f" fallbackText={"Boegrotatie (°)"} /><input className={control + ' w-24'} type="number" min={0} max={360} disabled={busy || !!drawing}
                  value={detection.orientation ?? 0} onChange={event => {
                    const value = Number(event.target.value);
                    if (Number.isFinite(value) && value >= 0 && value <= 360) change(selected, { ...detection, orientation: value });
                  }} />
              </label>
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
        <div className={panel}>
          <h4 className="font-semibold"><TranslatedText textKey="siteCopy.a03d424cbd92f4cc" fallbackText={"Sessieresultaat ·"} />{' '}{review.detections.length}</h4>
          {(['approved', 'pending', 'rejected'] as const).map((status) => <div key={status} className="flex justify-between border-b border-white/10 pb-1.5 text-sm">
            <span className="flex items-center gap-2"><span className="size-2.5 rounded-full" style={{ backgroundColor: colors[status] }} />{labels[status]}</span>
            <span>{counts[status]}</span>
          </div>)}
          <button className={control} disabled={busy || !dirty || !!drawing} onClick={() => void submit(false)}><TranslatedText textKey="siteCopy.13e5170f2b105372" fallbackText={"Review opslaan"} /></button>
          {images.some(image => image.id !== analysis.image_id) && <label className="block text-sm"><TranslatedText textKey="siteCopy.4fb4202e6bc8f6c2" fallbackText={"Bronfoto met vrije grond"} /><select className={control + ' block w-full'} value={ground} disabled={busy} onChange={event => { setGround(event.target.value); setGroundConfirmed(false); }}>
              <option value=""><TranslatedText textKey="siteCopy.b89b9309d5db06a1" fallbackText={"Gebruik beeldreconstructie"} inline={false} /></option>
              {images.filter(image => image.id !== analysis.image_id).map(image => <option key={image.id} value={image.id}>{image.filename}</option>)}
            </select>
          </label>}
          {ground && <label className="block text-sm"><input type="checkbox" checked={groundConfirmed}
            onChange={event => setGroundConfirmed(event.target.checked)} /> <TranslatedText textKey="siteCopy.66ad58dc027a307c" fallbackText={" De grond onder de maskers is vrij op deze bronfoto"} /></label>}
          <button className="w-full rounded-lg bg-blue-700 px-3 py-2 font-semibold disabled:opacity-50"
              disabled={busy || !!drawing || !!counts.pending || (!!ground && !groundConfirmed)} onClick={() => void submit(true)}><TranslatedText textKey="siteCopy.3b185da8cd0488a3" fallbackText={"Lege werf genereren"} /><span aria-hidden="true" className="ml-2">→</span></button>
          {busy && <p role="status" className="text-sm"><TranslatedText textKey="siteCopy.550306513d82dae7" fallbackText={"Bezig met verwerken…"} /></p>}
          {renderJob && <button type="button" className={control} onClick={async () => {
            try { await api(path + '/cancel-processing', { method: 'POST', body: { job_id: renderJob } }); }
            catch (reason) { setError((reason as Error).message); }
          }}><TranslatedText textKey="siteCopy.2704bf7a281dd15c" fallbackText={"Verwerking annuleren"} /></button>}
          {output && <div className="flex flex-wrap gap-2">
            {[false, ...(onPublish ? [true] : [])].map(publish => <button key={String(publish)} className={control} disabled={busy || !!drawing} onClick={async () => {
              setBusy(true); setError('');
              try {
                const blob = outputBlob ?? await api<Blob>(path + '/outputs/' + output.id);
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
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {views.map(([mode, label]) => {
        const processed = mode === 'empty' || mode === 'interactive';
        const thumbnail = processed ? emptyUrl : photoUrl;
        return <button key={mode} type="button"
          className={`overflow-hidden rounded-xl border bg-navy-900 text-left text-sm text-white disabled:opacity-55 ${view === mode ? 'border-blue-400 ring-2 ring-blue-600' : 'border-navy-700'}`}
          disabled={!!drawing || (processed ? !output : !photoUrl)} aria-pressed={view === mode} onClick={() => setView(mode)}>
          <span className="relative block aspect-[2.5] overflow-hidden bg-navy-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {thumbnail && <img alt="" src={thumbnail} className="size-full object-fill" />}
            {thumbnail && (mode === 'review' || mode === 'interactive') &&
              <svg aria-hidden="true" viewBox="0 0 1000 1000" preserveAspectRatio="none" className="absolute inset-0 size-full">
                {review.detections.filter(item => mode === 'review' || item.status === 'approved').map(item =>
                  <polygon key={item.id} points={polygonPoints(item.points)} fill={colors[item.status]} fillOpacity=".15" stroke={colors[item.status]} vectorEffect="non-scaling-stroke" />)}
              </svg>}
          </span>
          <span className="block px-3 py-1.5">{label}</span>
        </button>;
      })}
    </div>
  </section>;
}
