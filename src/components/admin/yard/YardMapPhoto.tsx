'use client';

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import type { YardCameraState } from './yardViewport';

/** Small overview rasters avoid repeatedly resampling full-size boat photos. */
export function YardMapPhoto({ url, length, width, pixelsPerMeter, camera }: {
  url: string; length: number; width: number; pixelsPerMeter: number; camera: YardCameraState;
}) {
  const detailSnapshot = useCallback(() => camera.getSnapshot().scale >= 2, [camera]);
  const detail = useSyncExternalStore(camera.subscribe, detailSnapshot, () => false);
  const [preview, setPreview] = useState<string>();
  const density = typeof window === 'undefined' ? 1 : window.devicePixelRatio;
  const tier = (value: number) => 2 ** Math.ceil(Math.log2(Math.max(32, value)));
  const rasterWidth = tier(length * pixelsPerMeter * 2 * density);
  const rasterHeight = tier(width * pixelsPerMeter * 2 * density);
  useEffect(() => {
    let cancelled = false;
    let owned: string | undefined;
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.decoding = 'async';
    setPreview(undefined);
    const fallback = () => { if (!cancelled) setPreview(url); };
    image.onerror = fallback;
    image.onload = async () => {
      try {
        if (image.naturalWidth <= rasterWidth && image.naturalHeight <= rasterHeight) { fallback(); return; }
        const canvas = document.createElement('canvas');
        canvas.width = Math.min(image.naturalWidth, rasterWidth);
        canvas.height = Math.min(image.naturalHeight, rasterHeight);
        const context = canvas.getContext('2d');
        if (!context) { fallback(); return; }
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/webp', .9));
        if (!blob) { fallback(); return; }
        if (!cancelled) { owned = URL.createObjectURL(blob); setPreview(owned); }
      } catch { fallback(); }
      finally { image.onload = null; image.onerror = null; image.removeAttribute('src'); }
    };
    image.src = url;
    return () => {
      cancelled = true; image.onload = null; image.onerror = null; image.removeAttribute('src');
      if (owned) URL.revokeObjectURL(owned);
    };
  }, [url, rasterWidth, rasterHeight]);
  return <image href={detail ? url : preview} data-yard-photo-source={url}
    data-yard-photo-mode={detail || preview === url ? 'original' : preview ? 'overview' : 'loading'}
    x={-length / 2} y={-width / 2} width={length} height={width} preserveAspectRatio="none" pointerEvents="none" />;
}
