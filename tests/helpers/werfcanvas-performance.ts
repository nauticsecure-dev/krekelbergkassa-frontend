import assert from 'node:assert/strict';

export type YardPerformance = {
  readyMs: number; inventory: { durationMs: number }[]; background: { durationMs: number };
  boatImages: { durationMs: number }[]; zoomClickToObservedFrameMs: number[];
  sustainedZoom: { fps: number; p95FrameMs: number; updates: number };
};

/** Initial regression ceilings, overridable for an explicitly documented deployment. */
export function yardPerformanceBudgets(mobile: boolean, env: Record<string, string | undefined> = process.env) {
  const defaults = { readyMs: mobile ? 25000 : 15000, apiMs: 3000, imageMs: 10000,
    zoomMs: 250, p95FrameMs: mobile ? 50 : 34, minFps: 30 };
  return Object.fromEntries(Object.entries(defaults).map(([key, fallback]) => {
    const name = 'WERFCANVAS_PERF_' + key.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toUpperCase();
    const value = env[name] === undefined ? fallback : Number(env[name]);
    assert.ok(Number.isFinite(value) && value > 0, name + ' must be a positive number');
    return [key, value];
  })) as typeof defaults;
}

export function assertYardPerformance(result: YardPerformance, limits: ReturnType<typeof yardPerformanceBudgets>) {
  const below = (value: number, ceiling: number, label: string) => {
    assert.ok(Number.isFinite(value) && value >= 0 && value <= ceiling, `${label}: ${value} exceeds ${ceiling}ms`);
  };
  assert.ok(result.inventory.length && result.boatImages.length && result.zoomClickToObservedFrameMs.length,
    'API, image and zoom measurements are required');
  below(result.readyMs, limits.readyMs, 'map readiness');
  for (const timing of result.inventory) below(timing.durationMs, limits.apiMs, 'inventory API');
  for (const timing of [result.background, ...result.boatImages]) below(timing.durationMs, limits.imageMs, 'image delivery');
  for (const sample of result.zoomClickToObservedFrameMs) below(sample, limits.zoomMs, 'zoom response');
  below(result.sustainedZoom.p95FrameMs, limits.p95FrameMs, 'sustained zoom p95 frame');
  assert.ok(Number.isFinite(result.sustainedZoom.fps) && result.sustainedZoom.fps >= limits.minFps, `sustained zoom FPS below ${limits.minFps} or invalid`);
  assert.ok(Number.isInteger(result.sustainedZoom.updates) && result.sustainedZoom.updates >= 10, 'sustained zoom must actually update the map');
}
