'use client';

import * as React from 'react';
import { FileUp, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useIntl } from '@/i18n/IntlProvider';
import type { ExtractionZone } from '@/lib/services';

/** Fields that can be tagged on a document. */
export const ZONE_FIELDS = [
  'invoice_number',
  'invoice_date',
  'due_date',
  'supplier',
  'subtotal',
  'vat',
  'total',
  'iban',
  'line_items',
] as const;

const ZONE_COLORS: Record<string, string> = {
  invoice_number: '#2563eb',
  invoice_date: '#0ea5e9',
  due_date: '#06b6d4',
  supplier: '#7c3aed',
  subtotal: '#d97706',
  vat: '#dc2626',
  total: '#059669',
  iban: '#475569',
  line_items: '#db2777',
};

async function renderPdfFirstPage(file: File): Promise<string> {
  return renderPdfFromData(await file.arrayBuffer());
}

// Trello #70/#81: render a PDF supplied as raw bytes (used for both picked
// files and a saved import's source PDF fetched from its signed URL).
async function renderPdfFromData(data: ArrayBuffer): Promise<string> {
  const pdfjs = await import('pdfjs-dist');
  // Worker is copied to /public so it isn't run through the app's minifier.
  pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
  const doc = await pdfjs.getDocument({ data }).promise;
  const page = await doc.getPage(1);
  const viewport = page.getViewport({ scale: 1.5 });
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');
  await page.render({ canvasContext: ctx, viewport }).promise;
  return canvas.toDataURL('image/png');
}

export function DocumentZoneEditor({
  zones,
  onChange,
  sourceUrl,
}: {
  zones: ExtractionZone[];
  onChange: (zones: ExtractionZone[]) => void;
  // Trello #70/#81: pre-load a saved import's source PDF/image for tagging.
  sourceUrl?: string | null;
}) {
  const { t } = useIntl();
  const fileRef = React.useRef<HTMLInputElement>(null);
  const surfaceRef = React.useRef<HTMLDivElement>(null);
  const [docUrl, setDocUrl] = React.useState<string | null>(null);
  const [loadingDoc, setLoadingDoc] = React.useState(false);
  const [docError, setDocError] = React.useState<string | null>(null);

  // Load the supplied source document (image rendered directly, PDF rasterised).
  React.useEffect(() => {
    if (!sourceUrl) return;
    let cancelled = false;
    (async () => {
      setDocError(null);
      setLoadingDoc(true);
      try {
        const res = await fetch(sourceUrl);
        const blob = await res.blob();
        if (blob.type.startsWith('image/')) {
          if (!cancelled) setDocUrl(URL.createObjectURL(blob));
        } else {
          const png = await renderPdfFromData(await blob.arrayBuffer());
          if (!cancelled) setDocUrl(png);
        }
      } catch {
        if (!cancelled) setDocError(t('adminNew.templates.renderError'));
      } finally {
        if (!cancelled) setLoadingDoc(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sourceUrl, t]);
  const [field, setField] = React.useState<string>('total');
  const [draft, setDraft] = React.useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const dragRef = React.useRef<{ startX: number; startY: number } | null>(null);

  const fieldLabel = (f: string) => {
    const key = `adminNew.templates.fields.${f}`;
    const label = t(key);
    return label === key ? f : label;
  };

  const onPickFile = async (file: File) => {
    setDocError(null);
    setLoadingDoc(true);
    try {
      if (file.type.startsWith('image/')) {
        setDocUrl(URL.createObjectURL(file));
      } else if (file.type === 'application/pdf') {
        setDocUrl(await renderPdfFirstPage(file));
      } else {
        setDocError(t('adminNew.templates.unsupported'));
      }
    } catch {
      setDocError(t('adminNew.templates.renderError'));
    } finally {
      setLoadingDoc(false);
    }
  };

  const relPoint = (clientX: number, clientY: number) => {
    const rect = surfaceRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return { x: 0, y: 0 };
    return {
      x: Math.min(1, Math.max(0, (clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (clientY - rect.top) / rect.height)),
    };
  };

  const onMouseDown = (e: React.MouseEvent) => {
    if (!docUrl) return;
    const p = relPoint(e.clientX, e.clientY);
    dragRef.current = { startX: p.x, startY: p.y };
    setDraft({ x: p.x, y: p.y, w: 0, h: 0 });
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragRef.current) return;
    const p = relPoint(e.clientX, e.clientY);
    const { startX, startY } = dragRef.current;
    setDraft({
      x: Math.min(startX, p.x),
      y: Math.min(startY, p.y),
      w: Math.abs(p.x - startX),
      h: Math.abs(p.y - startY),
    });
  };
  const onMouseUp = () => {
    if (draft && dragRef.current && draft.w > 0.02 && draft.h > 0.01) {
      onChange([...zones, { field, page: 1, ...draft }]);
    }
    dragRef.current = null;
    setDraft(null);
  };

  const removeZone = (idx: number) => onChange(zones.filter((_, i) => i !== idx));
  const setZoneField = (idx: number, f: string) =>
    onChange(zones.map((z, i) => (i === idx ? { ...z, field: f } : z)));

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_18rem]">
      <div>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<FileUp className="h-4 w-4" />}
            disabled={loadingDoc}
            onClick={() => fileRef.current?.click()}
          >
            {docUrl ? t('adminNew.templates.changeDoc') : t('adminNew.templates.loadDoc')}
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf,image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onPickFile(f);
              e.target.value = '';
            }}
          />
          <label className="ml-auto flex items-center gap-2 text-sm">
            <span className="text-navy-500">{t('adminNew.templates.activeField')}</span>
            <select
              className="input-base py-1 text-sm"
              value={field}
              onChange={(e) => setField(e.target.value)}
            >
              {ZONE_FIELDS.map((f) => (
                <option key={f} value={f}>
                  {fieldLabel(f)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div
          ref={surfaceRef}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={() => {
            dragRef.current = null;
            setDraft(null);
          }}
          className="relative select-none overflow-hidden rounded-xl border border-navy-100 bg-navy-50"
          style={{ minHeight: 360, cursor: docUrl ? 'crosshair' : 'default' }}
        >
          {docUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={docUrl} alt="" className="pointer-events-none block w-full" draggable={false} />
          ) : (
            <div className="flex min-h-[360px] items-center justify-center text-sm text-navy-400">
              {loadingDoc ? t('adminNew.templates.rendering') : t('adminNew.templates.loadPrompt')}
            </div>
          )}

          {zones.map((z, idx) => (
            <div
              key={idx}
              className="absolute flex items-start justify-between rounded-[3px] border-2"
              style={{
                left: `${z.x * 100}%`,
                top: `${z.y * 100}%`,
                width: `${z.w * 100}%`,
                height: `${z.h * 100}%`,
                borderColor: ZONE_COLORS[z.field] ?? '#1f93b8',
                backgroundColor: `${ZONE_COLORS[z.field] ?? '#1f93b8'}22`,
              }}
            >
              <span
                className="pointer-events-none -mt-5 truncate rounded-t px-1 text-[10px] font-semibold text-white"
                style={{ backgroundColor: ZONE_COLORS[z.field] ?? '#1f93b8' }}
              >
                {fieldLabel(z.field)}
              </span>
            </div>
          ))}

          {draft ? (
            <div
              className="absolute rounded-[3px] border-2 border-dashed border-marine-500 bg-marine-500/10"
              style={{
                left: `${draft.x * 100}%`,
                top: `${draft.y * 100}%`,
                width: `${draft.w * 100}%`,
                height: `${draft.h * 100}%`,
              }}
            />
          ) : null}
        </div>
        {docError ? <p className="mt-2 text-sm text-rose-600">{docError}</p> : null}
        <p className="mt-2 text-xs text-navy-400">{t('adminNew.templates.drawHint')}</p>
      </div>

      <div>
        <div className="mb-2 text-sm font-semibold text-navy-900">
          {t('adminNew.templates.zones')} ({zones.length})
        </div>
        {zones.length === 0 ? (
          <p className="text-sm text-navy-400">{t('adminNew.templates.noZones')}</p>
        ) : (
          <ul className="space-y-2">
            {zones.map((z, idx) => (
              <li key={idx} className="flex items-center gap-2 rounded-lg border border-navy-100 p-2">
                <span
                  className="h-3 w-3 shrink-0 rounded-sm"
                  style={{ backgroundColor: ZONE_COLORS[z.field] ?? '#1f93b8' }}
                />
                <select
                  className="input-base flex-1 py-1 text-xs"
                  value={z.field}
                  onChange={(e) => setZoneField(idx, e.target.value)}
                >
                  {ZONE_FIELDS.map((f) => (
                    <option key={f} value={f}>
                      {fieldLabel(f)}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => removeZone(idx)}
                  className="rounded p-1 text-navy-400 hover:bg-rose-50 hover:text-rose-600"
                  aria-label={t('adminNew.common.delete')}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
