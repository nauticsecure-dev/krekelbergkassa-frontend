'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useIntl } from '@/i18n/IntlProvider';
import { api, type ApiError } from '@/lib/api';
import { control, yardEndpoint, type Page } from './YardHistory';
import { YardPhotoWorkflow, type YardAnalysis } from './YardPhotoWorkflow';

const endpoint = yardEndpoint + '/photo-sessions';
type Session = { id: string; name: string; captured_at: string; status: string; notes: string | null };
type Original = { id: string; filename: string; metadata: { width: number; height: number } };
type Detail = { session: Session; images: Original[]; analysis: YardAnalysis | null };

function errorMessage(error: ApiError, fallback: string) {
  const payload = error.data as { errors?: Record<string, string[]> } | undefined;
  return Object.values(payload?.errors ?? {}).flat().join(' ') || error.message || fallback;
}

export function useYardPhotoCopy() {
  const intl = useIntl();
  return (key: string) => intl.t('yardPhotos.' + key);
}

function OriginalPreview({ path, filename }: { path: string; filename: string }) {
  const [url, setUrl] = useState('');
  const [failed, setFailed] = useState(false);
  const t = useYardPhotoCopy();
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

  if (failed) return <p role="alert">{t('error')}</p>;
  return url ? <div className="max-h-[65vh] overflow-auto rounded-lg bg-slate-950">
    {/* The original is loaded through the authenticated API as a private blob. */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={url} alt={filename} className="mx-auto max-w-full" />
  </div> : <p role="status">{t('loading')}</p>;
}

export function YardPhotoSessions({ onPublish }: { onPublish?: (file: File) => void }) {
  const t = useYardPhotoCopy();
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
    setError(errorMessage(reason, t('error')));
  }

  async function list(page = 1) {
    setSessions(await api<Page<Session>>(endpoint, { query: { page } }));
  }

  useEffect(() => {
    api<Page<Session>>(endpoint).then(setSessions).catch(() => setError(intl.t('yardPhotos.error')));
  }, [intl]);

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
        errors.push(file.name + ' — ' + errorMessage(result, t('error')));
      }
      setProgress({ done: index + 1, total: files.length });
    }
    setPending(failed);
    try {
      setDetail(await api<Detail>(endpoint + '/' + detail.session.id));
      await list(sessions?.current_page);
    } catch (reason) {
      errors.push((reason as ApiError).message || t('error'));
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
      const analysis = await api<YardAnalysis>(endpoint + '/' + detail.session.id + '/detect', {
        method: 'POST', body: { image_id: image.id, manual }, timeoutMs: 60000,
      });
      setDetail({ ...detail, session: { ...detail.session, status: 'review' }, analysis });
    } catch (reason) {
      report(reason as ApiError);
    } finally {
      setBusy(false);
    }
  }

  const field = 'rounded border border-slate-600 bg-[#10283d] p-2 text-white';
  return <section className="space-y-4">
    <header className="flex flex-wrap items-center justify-between gap-2">
      <h2 className="text-xl font-semibold">{t('title')}</h2>
      <button className="rounded-lg bg-[#efd092] px-3 py-2 font-semibold text-slate-950" disabled={busy} onClick={() => setCreating(!creating)}>{t('new')}</button>
    </header>
    <p className="text-sm text-slate-300">Upload dronebeelden en selecteer een voorbereide orthofoto voor bootdetectie.</p>
    {error && <p role="alert" className="whitespace-pre-line rounded bg-red-950 p-3">{error}</p>}
    {creating && <form onSubmit={create} className="grid gap-3 rounded-lg border border-slate-700 p-4 sm:grid-cols-2">
      <label className="grid gap-1">{t('name')}<input name="name" required maxLength={120} className={field} /></label>
      <label className="grid gap-1">{t('yard')}<select name="yard_id" className={field}><option value="werf">Krekelberg</option></select></label>
      <label className="grid gap-1">{t('captured')}<input name="captured_at" type="datetime-local" required className={field} /></label>
      <label className="grid gap-1">{t('notes')}<textarea name="notes" maxLength={4000} className={field} /></label>
      <button className={control} disabled={busy}>{t('save')}</button>
    </form>}
    <div className={detail?.analysis ? 'grid gap-4' : 'grid gap-4 lg:grid-cols-[13rem_minmax(0,1fr)]'}>
      <details open={!detail?.analysis} className="space-y-2 rounded-lg border border-slate-700 p-3">
        <summary className="cursor-pointer text-sm font-semibold">{t('title')}</summary>
        {sessions?.data.map((session) => <button key={session.id} disabled={busy} onClick={() => void open(session.id)} aria-pressed={detail?.session.id === session.id} className={control + ' block w-full text-left'}>
          <span className="block break-words">{session.name}</span>
          <time dateTime={session.captured_at} className="text-xs text-slate-300">{new Intl.DateTimeFormat(intl.locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(session.captured_at))}</time>
        </button>)}
        {sessions && !sessions.data.length && <p>{t('empty')}</p>}
        {sessions && sessions.last_page > 1 && <div className="flex gap-2">
          <button className={control} disabled={busy || sessions.current_page <= 1} onClick={() => void list(sessions.current_page - 1).catch(report)}>{t('previous')}</button>
          <button className={control} disabled={busy || sessions.current_page >= sessions.last_page} onClick={() => void list(sessions.current_page + 1).catch(report)}>{t('next')}</button>
        </div>}
      </details>
      {detail && <div className="min-w-0 space-y-3 rounded-lg border border-slate-700 p-4">
        <h3 className="break-words text-lg font-semibold">{detail.session.name}</h3>
        <p className="text-sm text-slate-300">{detail.analysis ? 'Ter controle' : t(detail.session.status)}</p>
        {detail.session.notes && <p className="whitespace-pre-wrap break-words">{detail.session.notes}</p>}
        {detail.analysis ? <YardPhotoWorkflow key={detail.session.id} path={endpoint + '/' + detail.session.id}
          analysis={detail.analysis} onPublish={onPublish} /> : <>
          <label className="block cursor-pointer space-y-2 rounded-lg border border-dashed border-slate-500 p-4"
            onDragOver={(event) => event.preventDefault()} onDrop={(event) => {
              event.preventDefault();
              void upload(Array.from(event.dataTransfer.files));
            }}>
            <span className="block">{t('drop')}</span>
            <input type="file" multiple accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={(event) => {
              void upload(Array.from(event.currentTarget.files ?? []));
              event.currentTarget.value = '';
            }} />
          </label>
          {progress && <progress aria-label={t('progress')} max={progress.total} value={progress.done} />}
          {!!pending.length && <button className={control} disabled={busy} onClick={() => void upload(pending)}>{t('retry')}</button>}
          <div className="flex flex-wrap gap-2">{detail.images.map((original) => <button key={original.id} className={control}
            disabled={busy} aria-pressed={image?.id === original.id} onClick={() => setImage(original)}>{original.filename} · {original.metadata.width} × {original.metadata.height}</button>)}</div>
          {image && <>
            <button className="rounded-lg bg-blue-700 px-3 py-2 font-semibold disabled:opacity-50"
              disabled={busy} onClick={() => void detect()}>AI verwerken</button>
            <button className={control} disabled={busy} onClick={() => void detect(true)}>Handmatig maskeren</button>
            {busy && <p role="status">Bezig met verwerken…</p>}
            <OriginalPreview path={endpoint + '/' + detail.session.id + '/images/' + image.id} filename={image.filename} />
          </>}
        </>}
      </div>}
    </div>
  </section>;
}
