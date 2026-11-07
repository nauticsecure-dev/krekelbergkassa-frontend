'use client';

import { useEffect, useRef, useState } from 'react';
import { api, type ApiError } from '@/lib/api';
import { control } from './YardHistory';

type Point = [number, number];
type Status = 'pending' | 'approved' | 'rejected';
type Detection = { points: Point[]; confidence: number | null; status: Status };
export type YardAnalysis = { image_id: string; mode: 'ai' | 'manual'; revision: number; detections: Detection[] };

const colors: Record<Status, string> = { pending: '#fbbf24', approved: '#4ade80', rejected: '#f87171' };
const labels: Record<Status, string> = { pending: 'Ter review', approved: 'Goedgekeurd', rejected: 'Afgewezen' };
const stages = ['Uploaden', 'Orthofoto kiezen', 'Detecteren', 'Controleren', 'Lege werf', 'Publiceren'];

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

export function YardPhotoWorkflow({ path, analysis, onPublish }: {
  path: string;
  analysis: YardAnalysis;
  onPublish?: (file: File) => void;
}) {
  const [review, setReview] = useState(analysis);
  const [selected, setSelected] = useState(0);
  const [drawing, setDrawing] = useState<{ index: number; points: Point[] }>();
  const [source, setSource] = useState<Blob>();
  const [empty, setEmpty] = useState<Blob>();
  const [view, setView] = useState<'source' | 'review' | 'empty'>('review');
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [zoom, setZoom] = useState(1);
  const photo = useRef<HTMLImageElement>(null);
  const cutout = useRef<HTMLCanvasElement>(null);
  const photoUrl = useObjectUrl(source);
  const emptyUrl = useObjectUrl(empty);
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
    setEmpty(undefined);
  }

  async function submit(generate: boolean) {
    setBusy(true);
    setError('');
    try {
      let saved = review;
      if (dirty) {
        saved = await api<YardAnalysis>(path + '/review', {
          method: 'PUT',
          body: { revision: review.revision, detections: review.detections.map(({ points, status }) => ({ points, status })) },
        });
        setReview(saved);
        setDirty(false);
      }
      if (generate) {
        setEmpty(await api<Blob>(path + '/empty-yard', {
          method: 'POST', body: { revision: saved.revision }, timeoutMs: 60000,
        }));
        setView('empty');
      }
    } catch (reason) {
      setError((reason as ApiError).message || 'De verwerking is mislukt.');
    } finally {
      setBusy(false);
    }
  }

  const counts = { pending: 0, approved: 0, rejected: 0 };
  review.detections.forEach(({ status }) => { counts[status]++; });

  return <section className="space-y-3">
    <ol aria-label="Verwerkingsstappen" className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
      {stages.map((stage, index) => <li key={stage} aria-current={index === (empty ? 4 : 3) ? 'step' : undefined}
        className={'rounded-full border border-slate-700 px-3 py-2 text-sm ' + (index === (empty ? 4 : 3) ? 'bg-blue-700' : 'bg-slate-900')}>
        <span className={index < 3 ? 'text-green-300' : 'text-slate-200'}>{index + 1}</span> {index === 2 && analysis.mode === 'manual' ? 'Handmatig' : stage}
      </li>)}
    </ol>
    {error && <p role="alert" className="rounded bg-red-950 p-2">{error}</p>}
    <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_19rem]">
      <div className="min-w-0 space-y-2">
        <div className="max-h-[65vh] overflow-auto rounded-lg border border-slate-700 bg-slate-950">
          <div className="relative" style={{ width: zoom * 100 + '%' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {photoUrl && <img ref={photo} onLoad={() => setLoaded(true)} alt="Orthofoto van de werf" src={photoUrl} className="block w-full" />}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {view === 'empty' && emptyUrl && <img alt="Gegenereerde lege werf" src={emptyUrl} className="absolute inset-0 size-full" />}
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
            <button key={mode} className={control} disabled={(mode === 'empty' && !empty) || !!drawing}
              aria-pressed={view === mode} onClick={() => setView(mode)}>{label}</button>)}
          <button className={control} aria-label="Uitzoomen" disabled={zoom <= 1} onClick={() => setZoom(zoom - 0.5)}>−</button>
          <button className={control} aria-label="Inzoomen" disabled={zoom >= 3} onClick={() => setZoom(zoom + 0.5)}>+</button>
        </div>
      </div>
      <aside className="space-y-3">
        <div className="space-y-3 rounded-lg border border-slate-700 bg-slate-900 p-3">
          <h4 className="font-semibold">Bootdetecties</h4>
          {detection && <>
            <select aria-label="Detectie" className={control + ' w-full'} value={selected} disabled={!!drawing}
              onChange={(event) => { setSelected(Number(event.target.value)); setView('review'); }}>
              {review.detections.map(({ status }, index) => <option key={index} value={index}>Detectie #{index + 1} · {labels[status]}</option>)}
            </select>
            <canvas ref={cutout} aria-label="Transparante bootuitsnede" className="mx-auto max-h-40 max-w-full rounded bg-slate-700" />
            <p className="text-sm text-slate-300">{detection.confidence === null ? 'Handmatig masker' : 'AI-confidence ' + Math.round(detection.confidence * 100) + '%'}</p>
            <div className="flex flex-wrap gap-2">
              <button className={control + ' text-green-300'} disabled={busy || !!drawing}
                onClick={() => change(selected, { ...detection, status: 'approved' })}>Goedkeuren</button>
              <button className={control} disabled={busy || !!drawing || !loaded} onClick={() => {
                setView('review');
                setDrawing({ index: selected, points: [] });
              }}>Bewerken</button>
              <button className={control + ' text-red-300'} disabled={busy || !!drawing}
                onClick={() => change(selected, { ...detection, status: 'rejected' })}>Afwijzen</button>
              <button className={control} disabled={!loaded || detection.status !== 'approved'} onClick={() => {
                const link = document.createElement('a');
                link.href = cutout.current!.toDataURL('image/png');
                link.download = 'boot-' + (selected + 1) + '.png';
                link.click();
              }}>PNG downloaden</button>
            </div>
          </>}
          {drawing ? <>
            <p className="text-sm">Klik rondom de boot om het masker te tekenen.</p>
            <div className="flex flex-wrap gap-2">
              <button className={control} disabled={drawing.points.length < 3} onClick={() => {
                change(drawing.index, { points: drawing.points, confidence: null, status: 'pending' });
                setSelected(drawing.index);
                setDrawing(undefined);
              }}>Masker toepassen</button>
              <button className={control} disabled={!drawing.points.length} onClick={() =>
                setDrawing({ ...drawing, points: drawing.points.slice(0, -1) })}>Punt wissen</button>
              <button className={control} onClick={() => setDrawing(undefined)}>Annuleren</button>
            </div>
          </> : <button className={control} disabled={busy || !loaded || review.detections.length >= 300} onClick={() => {
            setView('review');
            setDrawing({ index: review.detections.length, points: [] });
          }}>+ Bootmasker tekenen</button>}
        </div>
        <div className="space-y-2 rounded-lg border border-slate-700 bg-slate-900 p-3">
          <h4 className="font-semibold">Sessieresultaat · {review.detections.length}</h4>
          {(Object.keys(counts) as Status[]).map((status) => <div key={status} className="flex justify-between border-b border-slate-800 text-sm">
            <span style={{ color: colors[status] }}>{labels[status]}</span><span>{counts[status]}</span>
          </div>)}
          <button className={control} disabled={busy || !dirty || !!drawing} onClick={() => void submit(false)}>Review opslaan</button>
          <button className="w-full rounded-lg bg-blue-700 px-3 py-2 font-semibold disabled:opacity-50"
            disabled={busy || !!drawing || !!counts.pending} onClick={() => void submit(true)}>Lege werf genereren</button>
          {busy && <p role="status" className="text-sm">Bezig met verwerken…</p>}
          {empty && emptyUrl && <div className="flex flex-wrap gap-2">
            <a className={control} href={emptyUrl} download="lege-werf.webp">Lege werf downloaden</a>
            {onPublish && <button className={control} disabled={busy || !!drawing} onClick={() =>
              onPublish(new File([empty], 'lege-werf.webp', { type: empty.type }))}>Naar uitlijning en publicatie</button>}
          </div>}
        </div>
      </aside>
    </div>
  </section>;
}
