'use client';

import * as React from 'react';
import { FileUp, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useIntl } from '@/i18n/IntlProvider';
import type { ExtractionZone } from '@/lib/services';

/** Fields that can be tagged on a document — kept in sync with InvoiceExtractionTemplate::FIELD_TYPES. */
export const ZONE_FIELDS = [
  // Core identifiers
  'invoice_number',
  'document_number',
  'invoice_date',
  'due_date',
  // Supplier
  'supplier',
  'supplier_name',
  'supplier_address',
  'supplier_vat_number',
  // Customer
  'customer_name',
  'customer_address',
  // Line item fields
  'description',
  'quantity',
  'unit_price',
  // Amounts
  'subtotal',
  'vat',
  'vat_amount',
  'vat_rate',
  'total',
  // Payment
  'iban',
  'bank_account',
  'payment_reference',
  'currency',
  // Classification
  'vat_number',
  'cost_center',
  'notes',
  // Multi-value
  'line_items',
] as const;

const ZONE_COLORS: Record<string, string> = {
  invoice_number: '#2563eb',
  document_number: '#3b82f6',
  invoice_date: '#0ea5e9',
  due_date: '#06b6d4',
  supplier: '#7c3aed',
  supplier_name: '#7c3aed',
  supplier_address: '#8b5cf6',
  supplier_vat_number: '#a78bfa',
  customer_name: '#6366f1',
  customer_address: '#818cf8',
  description: '#f59e0b',
  quantity: '#f97316',
  unit_price: '#fb923c',
  subtotal: '#d97706',
  vat: '#dc2626',
  vat_amount: '#dc2626',
  vat_rate: '#ef4444',
  total: '#059669',
  iban: '#475569',
  bank_account: '#64748b',
  payment_reference: '#0891b2',
  currency: '#0369a1',
  vat_number: '#b45309',
  cost_center: '#92400e',
  notes: '#6b7280',
  line_items: '#db2777',
};

async function renderPdfPage(data: ArrayBuffer, pageNum: number): Promise<{ url: string; totalPages: number }> {
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
  const doc = await pdfjs.getDocument({ data }).promise;
  const totalPages = doc.numPages;
  const page = await doc.getPage(Math.min(pageNum, totalPages));
  const viewport = page.getViewport({ scale: 1.5 });
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');
  await page.render({ canvasContext: ctx, viewport }).promise;
  return { url: canvas.toDataURL('image/png'), totalPages };
}

// Keep raw ArrayBuffer for re-rendering on page change
let _pdfBuffer: ArrayBuffer | null = null;

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
  const [currentPage, setCurrentPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const [selectedZone, setSelectedZone] = React.useState<number | null>(null);

  const renderPage = async (buffer: ArrayBuffer, page: number, cancelled: { value: boolean }) => {
    setLoadingDoc(true);
    try {
      const { url, totalPages: tp } = await renderPdfPage(buffer, page);
      if (!cancelled.value) {
        setDocUrl(url);
        setTotalPages(tp);
      }
    } catch {
      if (!cancelled.value) setDocError(t('adminNew.templates.renderError'));
    } finally {
      if (!cancelled.value) setLoadingDoc(false);
    }
  };

  // Load the supplied source document (image rendered directly, PDF rasterised).
  React.useEffect(() => {
    if (!sourceUrl) return;
    const cancelled = { value: false };
    (async () => {
      setDocError(null);
      setLoadingDoc(true);
      try {
        const res = await fetch(sourceUrl);
        const blob = await res.blob();
        if (blob.type.startsWith('image/')) {
          if (!cancelled.value) { setDocUrl(URL.createObjectURL(blob)); setLoadingDoc(false); }
        } else {
          const buf = await blob.arrayBuffer();
          _pdfBuffer = buf;
          await renderPage(buf, 1, cancelled);
        }
      } catch {
        if (!cancelled.value) { setDocError(t('adminNew.templates.renderError')); setLoadingDoc(false); }
      }
    })();
    return () => { cancelled.value = true; };
  }, [sourceUrl, t]);

  // Re-render when page changes
  const goToPage = async (page: number) => {
    if (!_pdfBuffer || page < 1 || page > totalPages) return;
    setCurrentPage(page);
    const cancelled = { value: false };
    await renderPage(_pdfBuffer, page, cancelled);
  };

  const [field, setField] = React.useState<string>('total');
  const [draft, setDraft] = React.useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const dragRef = React.useRef<{ startX: number; startY: number } | null>(null);
  const moveDragRef = React.useRef<{ zoneIdx: number; startX: number; startY: number; origX: number; origY: number } | null>(null);

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
        setTotalPages(1);
        setCurrentPage(1);
        _pdfBuffer = null;
        setLoadingDoc(false);
      } else if (file.type === 'application/pdf') {
        const buf = await file.arrayBuffer();
        _pdfBuffer = buf;
        setCurrentPage(1);
        const cancelled = { value: false };
        await renderPage(buf, 1, cancelled);
      } else {
        setDocError(t('adminNew.templates.unsupported'));
        setLoadingDoc(false);
      }
    } catch {
      setDocError(t('adminNew.templates.renderError'));
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

  const startDraw = (clientX: number, clientY: number) => {
    if (!docUrl) return;
    const p = relPoint(clientX, clientY);
    dragRef.current = { startX: p.x, startY: p.y };
    moveDragRef.current = null;
    setSelectedZone(null);
    setDraft({ x: p.x, y: p.y, w: 0, h: 0 });
  };
  const moveDraw = (clientX: number, clientY: number) => {
    if (moveDragRef.current) {
      // Moving a zone
      const p = relPoint(clientX, clientY);
      const { zoneIdx, startX, startY, origX, origY } = moveDragRef.current;
      const dx = p.x - startX;
      const dy = p.y - startY;
      onChange(zones.map((z, i) => {
        if (i !== zoneIdx) return z;
        return {
          ...z,
          x: Math.min(1 - z.w, Math.max(0, origX + dx)),
          y: Math.min(1 - z.h, Math.max(0, origY + dy)),
        };
      }));
      return;
    }
    if (!dragRef.current) return;
    const p = relPoint(clientX, clientY);
    const { startX, startY } = dragRef.current;
    setDraft({
      x: Math.min(startX, p.x),
      y: Math.min(startY, p.y),
      w: Math.abs(p.x - startX),
      h: Math.abs(p.y - startY),
    });
  };
  const endDraw = () => {
    if (moveDragRef.current) { moveDragRef.current = null; return; }
    if (draft && dragRef.current && draft.w > 0.02 && draft.h > 0.01) {
      onChange([...zones, { field, page: currentPage, ...draft }]);
    }
    dragRef.current = null;
    setDraft(null);
  };

  const onMouseDown = (e: React.MouseEvent) => startDraw(e.clientX, e.clientY);
  const onMouseMove = (e: React.MouseEvent) => moveDraw(e.clientX, e.clientY);
  const onMouseUp = () => endDraw();

  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    if (t) startDraw(t.clientX, t.clientY);
  };
  const onTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    const t = e.touches[0];
    if (t) moveDraw(t.clientX, t.clientY);
  };
  const onTouchEnd = () => endDraw();

  const startZoneMove = (e: React.MouseEvent | React.TouchEvent, idx: number) => {
    e.stopPropagation();
    dragRef.current = null;
    setDraft(null);
    setSelectedZone(idx);
    const zone = zones[idx];
    if (!zone) return;
    const clientX = 'touches' in e ? e.touches[0]?.clientX ?? 0 : e.clientX;
    const clientY = 'touches' in e ? e.touches[0]?.clientY ?? 0 : e.clientY;
    const p = relPoint(clientX, clientY);
    moveDragRef.current = { zoneIdx: idx, startX: p.x, startY: p.y, origX: zone.x, origY: zone.y };
  };

  const removeZone = (idx: number) => { onChange(zones.filter((_, i) => i !== idx)); setSelectedZone(null); };
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

        {totalPages > 1 ? (
          <div className="mb-2 flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={currentPage <= 1 || loadingDoc} onClick={() => void goToPage(currentPage - 1)}>‹</Button>
            <span className="text-xs text-navy-600">Pagina {currentPage} / {totalPages}</span>
            <Button variant="outline" size="sm" disabled={currentPage >= totalPages || loadingDoc} onClick={() => void goToPage(currentPage + 1)}>›</Button>
          </div>
        ) : null}

        <div
          ref={surfaceRef}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={() => { dragRef.current = null; moveDragRef.current = null; setDraft(null); }}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          className="relative select-none overflow-hidden rounded-xl border border-navy-100 bg-navy-50 touch-none"
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

          {zones.map((z, idx) => {
            const selected = selectedZone === idx;
            const color = ZONE_COLORS[z.field] ?? '#1f93b8';
            return (
              <div
                key={idx}
                className="absolute flex items-start justify-between rounded-[3px] border-2"
                style={{
                  left: `${z.x * 100}%`,
                  top: `${z.y * 100}%`,
                  width: `${z.w * 100}%`,
                  height: `${z.h * 100}%`,
                  borderColor: color,
                  backgroundColor: `${color}${selected ? '44' : '22'}`,
                  cursor: 'move',
                  boxShadow: selected ? `0 0 0 2px ${color}` : undefined,
                }}
                onMouseDown={(e) => startZoneMove(e, idx)}
                onTouchStart={(e) => startZoneMove(e, idx)}
              >
                <span
                  className="pointer-events-none -mt-5 truncate rounded-t px-1 text-[10px] font-semibold text-white"
                  style={{ backgroundColor: color }}
                >
                  {fieldLabel(z.field)}
                </span>
              </div>
            );
          })}

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
