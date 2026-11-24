'use client';

// Keep camera subscribers separate from the fleet scene.

import { useLayoutEffect, useSyncExternalStore, type ReactNode, type Ref, type ButtonHTMLAttributes, type OutputHTMLAttributes } from 'react';
import { yardCameraTransform, type YardCameraState, type YardProjection } from './yardViewport';

function useCamera(store: YardCameraState) {
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
}

export function YardViewport({ store, projection, cameraRef, className, children }: {
  store: YardCameraState; projection: YardProjection; cameraRef: Ref<HTMLDivElement>; className?: string; children: ReactNode;
}) {
  const view = useCamera(store);
  useLayoutEffect(() => { store.committed.current = view; }, [store, view]);
  return <div ref={cameraRef} data-yard-camera className={className}
    style={{ transform: yardCameraTransform(view, projection), transformOrigin: '0 0', willChange: 'transform' }}>
    {children}
  </div>;
}

export function YardZoomLevel({ store, ...props }: OutputHTMLAttributes<HTMLOutputElement> & { store: YardCameraState }) {
  const view = useCamera(store);
  return <output {...props}>{Math.round(view.scale * 100)}%</output>;
}

export function YardZoomButton({ store, direction, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { store: YardCameraState; direction: 'in' | 'out' }) {
  const view = useCamera(store);
  return <button {...props} disabled={props.disabled || (direction === 'in' ? view.scale >= 12 : view.scale <= .5)} />;
}
