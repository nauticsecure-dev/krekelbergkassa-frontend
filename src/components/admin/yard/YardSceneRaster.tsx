'use client';

import { useEffect, useRef, type RefObject } from 'react';
import { yardRasterDimensions, type YardCameraState, type YardProjection } from './yardViewport';

/** Cache the unchanged SVG artwork at overview scale; the SVG retains all hit targets. */
export function YardSceneRaster({ scene, camera, projection }: {
  scene: RefObject<SVGSVGElement>; camera: YardCameraState; projection: YardProjection;
}) {
  const raster = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const svg = scene.current;
    const canvas = raster.current;
    if (!svg || !canvas) return;
    let generation = 0;
    let ready = false;
    let disposed = false;
    let scheduled = 0;
    let pending: AbortController | undefined;
    const activePointers = new Set<number>();
    let keyboardFocus = document.activeElement?.matches(':focus-visible') ?? false;
    const visibility = () => {
      const focused = keyboardFocus && svg.contains(document.activeElement);
      const useRaster = ready && camera.getSnapshot().scale < 2 && !focused;
      canvas.hidden = !useRaster;
      svg.style.opacity = useRaster ? '0' : '';
    };
    const rebuild = async () => {
      const version = ++generation;
      ready = false; visibility();
      pending?.abort();
      const controller = new AbortController();
      pending = controller;
      canvas.dataset.state = 'building';
      const width = svg.clientWidth;
      const height = svg.clientHeight;
      const images = Array.from(svg.querySelectorAll('image'));
      if (!width || !height || images.some(image => !image.getAttribute('href'))) return;
      const dimensions = yardRasterDimensions(width, height, window.devicePixelRatio);
      if (!dimensions) { canvas.dataset.state = 'fallback'; return; }
      let objectUrl: string | undefined;
      try {
        const clone = svg.cloneNode(true) as SVGSVGElement;
        clone.removeAttribute('class'); clone.removeAttribute('style');
        clone.setAttribute('width', String(width)); clone.setAttribute('height', String(height));
        await Promise.all(Array.from(clone.querySelectorAll('image')).map(async image => {
          const response = await fetch(image.getAttribute('href')!, { signal: controller.signal });
          if (!response.ok) throw new Error('Map image is unavailable');
          const blob = await response.blob();
          const embedded = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result)); reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
          image.setAttribute('href', embedded);
        }));
        if (disposed || version !== generation) return;
        objectUrl = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml' }));
        const image = new Image();
        image.src = objectUrl;
        await image.decode();
        if (disposed || version !== generation) return;
        canvas.width = dimensions.width; canvas.height = dimensions.height;
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Raster drawing is unavailable');
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        ready = true; canvas.dataset.state = 'ready'; visibility();
      } catch {
        if (!disposed && version === generation) { canvas.dataset.state = 'fallback'; visibility(); }
      } finally {
        if (objectUrl) URL.revokeObjectURL(objectUrl);
      }
    };
    const invalidate = () => {
      generation++; pending?.abort();
      ready = false; visibility();
      cancelAnimationFrame(scheduled);
      if (activePointers.size) return;
      scheduled = requestAnimationFrame(() => { void rebuild(); });
    };
    const observer = new MutationObserver(records => {
      if (records.some(record => record.type !== 'attributes' ||
        (!record.attributeName?.startsWith('data-') && !(record.target === svg && record.attributeName === 'style')))) invalidate();
    });
    observer.observe(svg, { attributes: true, childList: true, characterData: true, subtree: true });
    const unsubscribe = camera.subscribe(visibility);
    const focus = () => queueMicrotask(visibility);
    const pointer = (event: PointerEvent) => {
      keyboardFocus = false;
      if (event.target instanceof Node && svg.contains(event.target)) activePointers.add(event.pointerId);
      visibility();
    };
    const release = (event: PointerEvent) => {
      if (activePointers.delete(event.pointerId) && !activePointers.size && !ready) invalidate();
    };
    const keyboard = (event: KeyboardEvent) => {
      if (['Shift', 'Control', 'Alt', 'Meta'].includes(event.key)) return;
      keyboardFocus = true; visibility();
    };
    document.addEventListener('pointerdown', pointer, true);
    document.addEventListener('pointerup', release, true);
    document.addEventListener('pointercancel', release, true);
    document.addEventListener('keydown', keyboard, true);
    svg.addEventListener('focusin', focus); svg.addEventListener('focusout', focus);
    invalidate();
    return () => {
      disposed = true; generation++; pending?.abort(); cancelAnimationFrame(scheduled);
      observer.disconnect(); unsubscribe(); svg.style.opacity = '';
      canvas.hidden = true; canvas.width = 0; canvas.height = 0;
      svg.removeEventListener('focusin', focus); svg.removeEventListener('focusout', focus);
      document.removeEventListener('pointerdown', pointer, true);
      document.removeEventListener('pointerup', release, true);
      document.removeEventListener('pointercancel', release, true);
      document.removeEventListener('keydown', keyboard, true);
    };
  }, [scene, camera, projection]);
  return <canvas ref={raster} hidden aria-hidden="true" data-yard-scene-raster
    className="pointer-events-none absolute inset-0 h-full w-full" />;
}
