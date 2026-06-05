'use client';

import * as React from 'react';
import { Camera, X } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useIntl } from '@/i18n/IntlProvider';

interface ScannerControls {
  stop: () => void;
}

export function BarcodeScannerModal({
  open,
  onClose,
  onDetected,
}: {
  open: boolean;
  onClose: () => void;
  /** Fires once per distinct scan; return value ignored. */
  onDetected: (code: string) => void;
}) {
  const { t } = useIntl();
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const controlsRef = React.useRef<ScannerControls | null>(null);
  const lastRef = React.useRef<{ code: string; at: number }>({ code: '', at: 0 });
  const [error, setError] = React.useState<string | null>(null);
  const [starting, setStarting] = React.useState(false);

  // Keep the latest callback without restarting the camera.
  const onDetectedRef = React.useRef(onDetected);
  React.useEffect(() => {
    onDetectedRef.current = onDetected;
  }, [onDetected]);

  React.useEffect(() => {
    if (!open) return;
    let disposed = false;
    setError(null);
    setStarting(true);

    (async () => {
      try {
        const { BrowserMultiFormatReader } = await import('@zxing/browser');
        if (disposed) return;
        const reader = new BrowserMultiFormatReader();
        const controls = await reader.decodeFromVideoDevice(
          undefined,
          videoRef.current ?? undefined,
          (result) => {
            if (!result) return;
            const code = result.getText();
            // Debounce: ignore the same code within 1.5s, and require a tiny
            // gap between distinct codes to avoid accidental double-adds.
            const nowSlot = lastRef.current;
            const elapsed = approxElapsed(nowSlot.at);
            if (code === nowSlot.code && elapsed < 1500) return;
            lastRef.current = { code, at: nowMs() };
            onDetectedRef.current(code);
          },
        );
        if (disposed) {
          controls.stop();
          return;
        }
        controlsRef.current = controls as ScannerControls;
        setStarting(false);
      } catch (err) {
        if (disposed) return;
        setStarting(false);
        setError(
          err instanceof Error && /permission|denied|notallowed/i.test(err.message)
            ? t('adminNew.scanner.denied')
            : t('adminNew.scanner.error'),
        );
      }
    })();

    return () => {
      disposed = true;
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
  }, [open, t]);

  return (
    <Modal open={open} onClose={onClose} size="md">
      <div className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-base font-semibold text-navy-900">
            <Camera className="h-5 w-5 text-marine-600" />
            {t('adminNew.scanner.title')}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-navy-400 hover:bg-sand-100 hover:text-navy-700"
            aria-label={t('adminNew.common.close')}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="relative overflow-hidden rounded-xl border border-navy-100 bg-navy-950/90">
          <video
            ref={videoRef}
            className="aspect-video w-full object-cover"
            muted
            playsInline
          />
          {!error ? (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="h-28 w-3/4 rounded-lg border-2 border-marine-400/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.25)]" />
            </div>
          ) : null}
        </div>

        {error ? (
          <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">
            {error}
          </p>
        ) : (
          <p className="mt-3 text-center text-xs text-navy-500">
            {starting ? t('adminNew.scanner.starting') : t('adminNew.scanner.hint')}
          </p>
        )}

        <div className="mt-4 flex justify-end">
          <Button variant="ghost" onClick={onClose}>
            {t('adminNew.common.close')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// new Date()/Date.now() are fine in browser client code here.
function nowMs(): number {
  return new Date().getTime();
}
function approxElapsed(since: number): number {
  return nowMs() - since;
}
