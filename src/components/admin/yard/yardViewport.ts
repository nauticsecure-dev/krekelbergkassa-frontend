export type YardView = { x: number; y: number; scale: number };
export type YardProjection = { pixelsPerMeter: number; x: number; y: number };

/** Keep overview allocation bounded, including Retina displays and very large viewports. */
export function yardRasterDimensions(width: number, height: number, pixelRatio: number) {
  const rasterWidth = Math.ceil(width * pixelRatio * 2);
  const rasterHeight = Math.ceil(height * pixelRatio * 2);
  if (!(rasterWidth > 0 && rasterHeight > 0) || !Number.isFinite(rasterWidth * rasterHeight)
    || rasterWidth > 8192 || rasterHeight > 8192 || rasterWidth * rasterHeight > 16_777_216) return null;
  return { width: rasterWidth, height: rasterHeight };
}

/** Keep calibrated image coordinates in yard units instead of a huge unit-image scale. */
export function yardImageGeometry(matrix: number[], width: number, height: number) {
  const [a, b, c, d, e, f] = matrix;
  return { width, height, transform: `matrix(${a / width} ${b / width} ${c / height} ${d / height} ${e} ${f})` };
}

/** Camera subscribers never require the fleet workspace to render again. */
export function createYardCamera(initial: YardView) {
  const initialSnapshot = { ...initial };
  let current = initialSnapshot;
  const listeners = new Set<() => void>();
  return {
    committed: { current: initialSnapshot },
    getSnapshot: () => current,
    getServerSnapshot: () => initialSnapshot,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    set: (next: YardView | ((previous: YardView) => YardView)) => {
      const value = typeof next === 'function' ? next(current) : next;
      if (value.x === current.x && value.y === current.y && value.scale === current.scale) return;
      current = { ...value };
      listeners.forEach(listener => listener());
    },
  };
}
export type YardCameraState = ReturnType<typeof createYardCamera>;

/** SVG's default xMidYMid/meet projection, before the camera is applied. */
export function yardProjection(width: number, height: number, yardWidth: number, yardHeight: number): YardProjection {
  const pixelsPerMeter = Math.min(width / yardWidth, height / yardHeight);
  return { pixelsPerMeter, x: (width - yardWidth * pixelsPerMeter) / 2, y: (height - yardHeight * pixelsPerMeter) / 2 };
}

/** Apply the same world-space camera as SVG, using a composited HTML box. */
export function yardCameraTransform(view: YardView, projection: YardProjection) {
  const x = view.x * projection.pixelsPerMeter + projection.x * (1 - view.scale);
  const y = view.y * projection.pixelsPerMeter + projection.y * (1 - view.scale);
  return `matrix(${view.scale}, 0, 0, ${view.scale}, ${x}, ${y})`;
}

/** Undo only the camera part of getScreenCTM's inverse for gesture deltas. */
export function yardViewportPoint(world: { x: number; y: number }, view: YardView) {
  return { x: world.x * view.scale + view.x, y: world.y * view.scale + view.y };
}
