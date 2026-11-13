'use client';
import { TranslatedText } from '@/components/cms/TranslatedText';

import { useEffect, useState, type FormEvent } from 'react';
import { useIntl } from '@/i18n/IntlProvider';
import { tEnum } from '@/i18n/admin-enums';
import { api, type ApiError } from '@/lib/api';
import { control, yardEndpoint, type Page } from './YardHistory';
import { YardPhotoWorkflow, type YardAnalysis } from './YardPhotoWorkflow';
import type { PhotoPlacement } from './YardPhotoMatch';

const endpoint = yardEndpoint + '/photo-sessions';
type Processing = { id: string; state: string; progress: number; error?: string };
type Session = { id: string; name: string; captured_at: string; status: string; notes: string | null; processing?: Processing };
type Original = { id: string; filename: string; category?: string; metadata: { width: number; height: number; revision?: number;
  source_image_id?: string; detection_id?: string } };
type Detail = { session: Session; images: Original[]; outputs?: Original[]; analysis: YardAnalysis | null };

function PhotoQuality({ path, images, source }: { path: string; images: Original[]; source: string }) {
  const [comparison, setComparison] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [quality, setQuality] = useState<{ blur_variance: number; missing_regions: { missing_fraction?: number };
    pair: { overlap_fraction?: number; opposite_edge_ratio?: number; overlap_warning?: boolean; perspective_warning?: boolean } }>();
  const percent = (value?: number) => value === undefined ? 'Geen meetbare dekking' : Math.round(value * 100) + '%';

  return <details className="space-y-2 rounded border border-slate-700 p-2">
    <summary className="cursor-pointer">Fotokwaliteit</summary>
    <label className="block">Vergelijkingsfoto
      <select className={control + ' block'} value={comparison} onChange={event => { setComparison(event.target.value); setQuality(undefined); }}>
        <option value="">Alleen geselecteerde foto</option>
        {images.filter(image => image.id !== source).map(image => <option key={image.id} value={image.id}>{image.filename}</option>)}
      </select>
    </label>
    <button type="button" className={control} disabled={busy} onClick={async () => {
      setBusy(true); setError(''); setQuality(undefined);
      try {
        const result = await api<{ quality: NonNullable<typeof quality> }>(path + '/quality', {
          method: 'POST', body: { image_id: source, comparison_id: comparison || null },
        });
        setQuality(result.quality);
      } catch (reason) { setError((reason as Error).message); }
      finally { setBusy(false); }
    }}>Fotokwaliteit meten</button>
    {error && <p role="alert">{error}</p>}
    {quality && <dl className="grid grid-cols-2 gap-x-3 text-sm">
      <dt>Scherpte (variantie)</dt><dd>{quality.blur_variance}</dd>
      <dt>Ontbrekende pixels</dt><dd>{percent(quality.missing_regions.missing_fraction)}</dd>
      {comparison && <>
        <dt>Geschatte overlap</dt><dd>{percent(quality.pair.overlap_fraction)}{quality.pair.overlap_warning ? ' · Laag' : ''}</dd>
        <dt>Perspectief (randverhouding)</dt><dd>{quality.pair.opposite_edge_ratio ?? 'Onvoldoende overeenkomsten'}{quality.pair.perspective_warning ? ' · Afwijking' : ''}</dd>
      </>}
    </dl>}
  </details>;
}

function errorMessage(error: ApiError, fallback: string) {
  const payload = error.data as { errors?: Record<string, string[]> } | undefined;
  return Object.values(payload?.errors ?? {}).flat().join(' ') || error.message || fallback;
}

export function useYardPhotoCopy() {
  const intl = useIntl();
  return (key: string) => intl.t('yardPhotos.' + key);
}

function OriginalPreview({ path, filename, onRemove, busy }: { path: string; filename: string; onRemove: () => void; busy: boolean }) {
  const [url, setUrl] = useState('');
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    let objectUrl = '';
    setUrl('');
    setFailed(false);
    api<Blob>(path).then((blob) => {
      if (active) {
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      }
    }).catch(() => { if (active) setFailed(true); });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [path]);

  if (failed) return <p role="alert"><TranslatedText textKey="yardPhotos.error" /></p>;
  return url ? <div className="overflow-hidden rounded-lg border border-slate-700 bg-slate-950">
    <div className="flex items-center justify-between gap-2 p-2">
      <span className="min-w-0 break-words">{filename}</span>
      <button type="button" className={`${control} !text-red-300`} disabled={busy} onClick={onRemove}><TranslatedText textKey="siteCopy.b564cfe97691045d" fallbackText={"Foto verwijderen"} /></button>
    </div>
    <div className="max-h-[65vh] overflow-auto">
    {/* The original is loaded through the authenticated API as a private blob. */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={url} alt={filename} className="mx-auto max-w-full" />
    </div>
  </div> : <p role="status"><TranslatedText textKey="yardPhotos.loading" /></p>;
}

export function YardPhotoSessions({ onPublish, onPlacement }: { onPublish?: (file: File, outputId: string) => void;
  onPlacement?: (boat: string, proposal: PhotoPlacement) => Promise<void> }) {
  const intl = useIntl();
  const [sessions, setSessions] = useState<Page<Session>>();
  const [detail, setDetail] = useState<Detail>();
  const [image, setImage] = useState<Original>();
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [pending, setPending] = useState<File[]>([]);
  const [progress, setProgress] = useState<{ done: number; total: number }>();

  function report(reason: ApiError) {
    setError(errorMessage(reason, intl.t('yardPhotos.error')));
  }

  async function list(page = 1) {
    setSessions(await api<Page<Session>>(endpoint, { query: { page } }));
  }

  useEffect(() => {
    api<Page<Session>>(endpoint).then(setSessions).catch(() => setError(intl.t('yardPhotos.error')));
  }, [intl]);

  const processingSession = detail?.session.status === 'processing' ? detail.session.id : undefined;
  useEffect(() => {
    if (!processingSession) return;
    let active = true;
    let loading = false;
    const refresh = async () => {
      if (loading) return;
      loading = true;
      try {
        const next = await api<Detail>(endpoint + '/' + processingSession);
        if (active) setDetail((current) => current?.session.id === processingSession ? next : current);
      } catch { if (active) setError('De voortgang kon niet worden opgehaald. De verwerking blijft op de server beschikbaar.'); }
      finally { loading = false; }
    };
    const timer = setInterval(() => void refresh(), 3000);
    return () => { active = false; clearInterval(timer); };
  }, [processingSession]);

  async function open(id: string) {
    setBusy(true);
    setError('');
    try {
      setDetail(await api<Detail>(endpoint + '/' + id));
      setImage(undefined);
      setPending([]);
      setProgress(undefined);
    } catch (reason) {
      report(reason as ApiError);
    } finally {
      setBusy(false);
    }
  }

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    setBusy(true);
    setError('');
    try {
      const capture = new Date(String(values.get('captured_at')));
      const session = await api<Session>(endpoint, { method: 'POST', body: {
        name: values.get('name'), yard_id: values.get('yard_id'), notes: values.get('notes'),
        captured_at: capture.toISOString().replace(/\.\d{3}Z$/, '+00:00'),
      } });
      setCreating(false);
      setDetail({ session, images: [], analysis: null });
      setImage(undefined);
      setPending([]);
      setProgress(undefined);
      await list();
    } catch (reason) {
      report(reason as ApiError);
    } finally {
      setBusy(false);
    }
  }

  async function upload(files: File[]) {
    if (!detail || !files.length || busy) return;
    setBusy(true);
    setError('');
    const failed: File[] = [];
    const errors: string[] = [];
    setProgress({ done: 0, total: files.length });
    for (const [index, file] of files.entries()) {
      const body = new FormData();
      body.set('image', file);
      try {
        await api(endpoint + '/' + detail.session.id + '/images', { method: 'POST', body, timeoutMs: 120000 });
      } catch (reason) {
        const result = reason as ApiError;
        failed.push(file);
        errors.push(file.name + ' — ' + errorMessage(result, intl.t('yardPhotos.error')));
      }
      setProgress({ done: index + 1, total: files.length });
    }
    setPending(failed);
    try {
      setDetail(await api<Detail>(endpoint + '/' + detail.session.id));
      await list(sessions?.current_page);
    } catch (reason) {
      errors.push((reason as ApiError).message || intl.t('yardPhotos.error'));
    } finally {
      setError(errors.join('\n'));
      setBusy(false);
    }
  }

  async function detect(manual = false) {
    if (!detail || !image) return;
    setBusy(true);
    setError('');
    try {
      const result = await api<YardAnalysis | { processing: Processing }>(endpoint + '/' + detail.session.id + '/detect', {
        method: 'POST', body: { image_id: image.id, manual }, timeoutMs: 60000,
      });
      if ('processing' in result) setDetail({ ...detail, session: { ...detail.session, status: 'processing', processing: result.processing } });
      else setDetail({ ...detail, session: { ...detail.session, status: 'review' }, analysis: result });
    } catch (reason) {
      report(reason as ApiError);
    } finally {
      setBusy(false);
    }
  }

  async function removeImage(original: Original) {
    if (!detail || busy) return;
    const reviewed = detail.analysis?.image_id === original.id;
    if (!window.confirm(`Foto “${original.filename}” definitief verwijderen?${reviewed ? ' De bijbehorende beoordeling en maskers worden ook verwijderd.' : ''}`)) return;
    setBusy(true);
    setError('');
    try {
      const next = await api<Detail>(endpoint + '/' + detail.session.id + '/images/' + original.id, { method: 'DELETE' });
      setDetail(next);
      if (image?.id === original.id) setImage(undefined);
      await list(sessions?.current_page);
    } catch (reason) {
      report(reason as ApiError);
    } finally {
      setBusy(false);
    }
  }

  const field = 'rounded border border-slate-600 bg-[#10283d] p-2 text-white';
  return <section className="space-y-4">
    <header className="flex flex-wrap items-center justify-between gap-2">
      <h2 className="text-xl font-semibold"><TranslatedText textKey="yardPhotos.title" /></h2>
      <button className="rounded-lg bg-[#efd092] px-3 py-2 font-semibold text-slate-950" disabled={busy} onClick={() => setCreating(!creating)}><TranslatedText textKey="yardPhotos.new" /></button>
    </header>
    <p className="text-sm text-slate-300"><TranslatedText textKey="siteCopy.be8f78e9c176d51e" fallbackText={"Upload dronebeelden en selecteer een voorbereide orthofoto voor bootdetectie."} /></p>
    {error && <p role="alert" className="whitespace-pre-line rounded bg-red-950 p-3">{error}</p>}
    {creating && <form onSubmit={create} className="grid gap-3 rounded-lg border border-slate-700 p-4 sm:grid-cols-2">
      <label className="grid gap-1"><TranslatedText textKey="yardPhotos.name" /><input name="name" required maxLength={120} className={field} /></label>
      <label className="grid gap-1"><TranslatedText textKey="yardPhotos.yard" /><select name="yard_id" className={field}><option value="werf"><TranslatedText textKey="siteCopy.978e6dcd67bf36db" fallbackText={"Krekelberg"} inline={false} /></option></select></label>
      <label className="grid gap-1"><TranslatedText textKey="yardPhotos.captured" /><input name="captured_at" type="datetime-local" required className={field} /></label>
      <label className="grid gap-1"><TranslatedText textKey="yardPhotos.notes" /><textarea name="notes" maxLength={4000} className={field} /></label>
      <button className={control} disabled={busy}><TranslatedText textKey="yardPhotos.save" /></button>
    </form>}
    <div className={detail?.analysis ? 'grid gap-4' : 'grid gap-4 lg:grid-cols-[13rem_minmax(0,1fr)]'}>
      <details open={!detail?.analysis} className="space-y-2 rounded-lg border border-slate-700 p-3">
        <summary className="cursor-pointer text-sm font-semibold"><TranslatedText textKey="yardPhotos.title" /></summary>
        {sessions?.data.map((session) => <button key={session.id} disabled={busy} onClick={() => void open(session.id)} aria-pressed={detail?.session.id === session.id} className={control + ' block w-full text-left'}>
          <span className="block break-words">{session.name}</span>
          <time dateTime={session.captured_at} className="text-xs text-slate-300">{new Intl.DateTimeFormat(intl.locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(session.captured_at))}</time>
        </button>)}
        {sessions && !sessions.data.length && <p><TranslatedText textKey="yardPhotos.empty" /></p>}
        {sessions && sessions.last_page > 1 && <div className="flex gap-2">
          <button className={control} disabled={busy || sessions.current_page <= 1} onClick={() => void list(sessions.current_page - 1).catch(report)}><TranslatedText textKey="yardPhotos.previous" /></button>
          <button className={control} disabled={busy || sessions.current_page >= sessions.last_page} onClick={() => void list(sessions.current_page + 1).catch(report)}><TranslatedText textKey="yardPhotos.next" /></button>
        </div>}
      </details>
      {detail && <div className="min-w-0 space-y-3 rounded-lg border border-slate-700 p-4">
        <h3 className="break-words text-lg font-semibold">{detail.session.name}</h3>
        <p className="text-sm text-slate-300">{tEnum(intl.t, 'yardPhotos.status', detail.analysis ? 'review' : detail.session.status)}</p>
        {detail.session.processing?.error && <p role="alert" className="text-amber-300">{detail.session.processing.error}</p>}
        {!!detail.outputs?.length && <div className="flex flex-wrap gap-2">{detail.outputs.map((output) => <button className={control} key={output.id} disabled={busy} onClick={async () => {
          setBusy(true);
          try {
            const blob = await api<Blob>(endpoint + '/' + detail.session.id + '/outputs/' + output.id);
            const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = output.filename; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
          } catch (reason) { report(reason as ApiError); }
          finally { setBusy(false); }
        }}><TranslatedText textKey="siteCopy.512ee3fce30af333" fallbackText={"Download "} />{output.filename}</button>)}</div>}
        {detail.session.notes && <p className="whitespace-pre-wrap break-words">{detail.session.notes}</p>}
        <div className="flex flex-wrap gap-2">{detail.images.map((original) => <div key={original.id} className="flex max-w-full items-center gap-2 rounded-lg border border-slate-600 p-2">
          <button className={`${control} min-w-0 break-words text-left`} disabled={busy || !!detail.analysis || !!processingSession}
            aria-pressed={image?.id === original.id || detail.analysis?.image_id === original.id}
            onClick={() => setImage(original)}>{original.filename} · {original.metadata.width} × {original.metadata.height}</button>
          {(!original.category || original.category === 'original') && <button type="button" className={`${control} !text-red-300`} disabled={busy || !!processingSession}
            aria-label={`Foto ${original.filename} verwijderen`} onClick={() => void removeImage(original)}><TranslatedText textKey="siteCopy.46a92181eff2e5ac" fallbackText={"Verwijderen"} /></button>
          }
        </div>)}</div>
        {(detail.analysis?.image_id || image?.id) && !processingSession && <PhotoQuality
          key={detail.analysis?.image_id ?? image?.id} path={endpoint + '/' + detail.session.id}
          images={detail.images} source={(detail.analysis?.image_id ?? image?.id)!} />}
        {processingSession ? <div className="space-y-2" role="status">
          <p><TranslatedText textKey="siteCopy.7c6f9816f7da118c" fallbackText={"Verwerking: "} />{detail.session.processing?.state ?? 'queued'}<TranslatedText textKey="siteCopy.4aaa1287f6f5ae0d" fallbackText={". Je kunt deze pagina sluiten en later terugkomen."} /></p>
          <progress aria-label="Voortgang verwerking" max={100} value={detail.session.processing?.progress ?? 0} />
          <button className={control} disabled={busy} onClick={async () => {
            setBusy(true);
            try { await api(endpoint + '/' + processingSession + '/cancel-processing', { method: 'POST' }); setDetail(await api<Detail>(endpoint + '/' + processingSession)); }
            catch (reason) { report(reason as ApiError); }
            finally { setBusy(false); }
          }}><TranslatedText textKey="siteCopy.8be1800522be7714" fallbackText={"Verwerking annuleren"} /></button>
        </div> : detail.analysis ? <YardPhotoWorkflow key={detail.session.id} path={endpoint + '/' + detail.session.id}
          analysis={detail.analysis} images={detail.images} outputs={detail.outputs} onPublish={onPublish} onPlacement={onPlacement} deleting={busy} onRemove={() => {
            const original = detail.images.find((item) => item.id === detail.analysis?.image_id);
            if (original) void removeImage(original);
          }} /> : <>
          {detail.images.filter((image) => image.category === 'original' || !image.category).length >= 2 && <button className={control} disabled={busy} onClick={async () => {
            setBusy(true); setError('');
            try {
              const provider = await api<{ options: { name: string }[] }>(endpoint + '/provider');
              const options = provider.options.some((option) => option.name === 'orthophoto-png') ? [{ name: 'orthophoto-png', value: true }] : [];
              await api(endpoint + '/' + detail.session.id + '/stitch', { method: 'POST', body: { idempotency_key: crypto.randomUUID(), options } });
              setDetail(await api<Detail>(endpoint + '/' + detail.session.id));
            } catch (reason) { report(reason as ApiError); }
            finally { setBusy(false); }
          }}><TranslatedText textKey="siteCopy.36ded4b5940adb0a" fallbackText={"Bronfoto’s samenvoegen met NodeODX"} /></button>}
          <label className="block cursor-pointer space-y-2 rounded-lg border border-dashed border-slate-500 p-4"
            onDragOver={(event) => event.preventDefault()} onDrop={(event) => {
              event.preventDefault();
              void upload(Array.from(event.dataTransfer.files));
            }}>
            <span className="block"><TranslatedText textKey="yardPhotos.drop" /></span>
            <input type="file" multiple accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={(event) => {
              void upload(Array.from(event.currentTarget.files ?? []));
              event.currentTarget.value = '';
            }} />
          </label>
          {progress && <progress aria-label={intl.t('yardPhotos.progress')} max={progress.total} value={progress.done} />}
          {!!pending.length && <button className={control} disabled={busy} onClick={() => void upload(pending)}><TranslatedText textKey="yardPhotos.retry" /></button>}
          {image && <>
            <button className="rounded-lg bg-blue-700 px-3 py-2 font-semibold disabled:opacity-50"
              disabled={busy} onClick={() => void detect()}><TranslatedText textKey="siteCopy.f34f85e12c1e8d73" fallbackText={"AI verwerken"} /></button>
            <button className={control} disabled={busy} onClick={() => void detect(true)}><TranslatedText textKey="siteCopy.0485790864773616" fallbackText={"Handmatig maskeren"} /></button>
            {busy && <p role="status"><TranslatedText textKey="siteCopy.9297215412fac595" fallbackText={"Bezig met verwerken…"} /></p>}
            <OriginalPreview path={endpoint + '/' + detail.session.id + '/images/' + image.id} filename={image.filename}
              busy={busy} onRemove={() => void removeImage(image)} />
          </>}
        </>}
      </div>}
    </div>
  </section>;
}
