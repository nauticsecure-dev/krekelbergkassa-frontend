import { test, expect } from '@playwright/test';
import { assertYardPerformance, yardPerformanceBudgets } from '../helpers/werfcanvas-performance';

const fast = () => ({ readyMs: 1000, inventory: [{ durationMs: 100 }], background: { durationMs: 100 },
  boatImages: [{ durationMs: 100 }], zoomClickToObservedFrameMs: [20],
  sustainedZoom: { fps: 60, p95FrameMs: 17, updates: 20 } });

test('yard budgets fail slow responses and sustained rendering, rather than just reporting them', () => {
  const limits = yardPerformanceBudgets(false, {});
  expect(() => assertYardPerformance(fast(), limits)).not.toThrow();
  for (const change of [
    { readyMs: 20000 }, { inventory: [{ durationMs: 4000 }] }, { background: { durationMs: 11000 } },
    { boatImages: [{ durationMs: 11000 }] }, { zoomClickToObservedFrameMs: [500] },
    { sustainedZoom: { fps: 20, p95FrameMs: 17, updates: 20 } },
    { sustainedZoom: { fps: 60, p95FrameMs: 70, updates: 20 } },
    { sustainedZoom: { fps: 60, p95FrameMs: 17, updates: 0 } }, { inventory: [] },
    { sustainedZoom: { fps: Infinity, p95FrameMs: 17, updates: 20 } },
    { sustainedZoom: { fps: 60, p95FrameMs: NaN, updates: 20 } },
    { sustainedZoom: { fps: 60, p95FrameMs: 17, updates: Infinity } },
    { sustainedZoom: { fps: 60, p95FrameMs: 17, updates: 10.5 } },
  ]) expect(() => assertYardPerformance({ ...fast(), ...change }, limits)).toThrow();
});

test('yard budgets support explicit overrides and reject invalid configuration', () => {
  expect(yardPerformanceBudgets(true, {}).readyMs).toBe(25000);
  expect(yardPerformanceBudgets(false, { WERFCANVAS_PERF_API_MS: '1200' }).apiMs).toBe(1200);
  expect(yardPerformanceBudgets(false, { WERFCANVAS_PERF_P95_FRAME_MS: '25' }).p95FrameMs).toBe(25);
  for (const value of ['', '0', '-1', 'NaN']) {
    expect(() => yardPerformanceBudgets(false, { WERFCANVAS_PERF_API_MS: value })).toThrow();
  }
});
