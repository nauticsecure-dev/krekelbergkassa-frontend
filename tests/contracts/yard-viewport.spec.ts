import { test, expect } from '@playwright/test';
import { yardCameraTransform, yardImageGeometry, yardProjection, yardRasterDimensions, yardViewportPoint } from '../../src/components/admin/yard/yardViewport';

test('overview raster resolution follows display density', () => {
  expect(yardRasterDimensions(800, 500, 1)).toEqual({ width: 1600, height: 1000 });
  expect(yardRasterDimensions(800, 500, 2)).toEqual({ width: 3200, height: 2000 });
});

test('oversized or invalid raster allocations fall back to the live SVG', () => {
  for (const [width, height, density] of [[4000, 2400, 2], [9000, 1, 1], [0, 500, 1], [800, 500, NaN]])
    expect(yardRasterDimensions(width, height, density)).toBeNull();
});

test('normalized aerial geometry preserves calibrated corners, rotation and shear', () => {
  for (const original of [[120, 0, 0, 90, 0, 0], [75, 20, -30, 55, -12, 8]]) {
    const image = yardImageGeometry(original, 120, 90);
    const normalized = image.transform.slice(7, -1).split(' ').map(Number);
    for (const [x, y] of [[0, 0], [1, 0], [0, 1], [1, 1], [.3, .7]]) {
      expect(normalized[0] * x * image.width + normalized[2] * y * image.height + normalized[4])
        .toBeCloseTo(original[0] * x + original[2] * y + original[4], 10);
      expect(normalized[1] * x * image.width + normalized[3] * y * image.height + normalized[5])
        .toBeCloseTo(original[1] * x + original[3] * y + original[5], 10);
    }
  }
});

test('HTML camera preserves SVG world positions with letterboxing, zoom and pan', () => {
  for (const [width, height] of [[800, 500], [350, 800], [1200, 600]]) {
    const p = yardProjection(width, height, 200, 100);
    for (const view of [{ x: 0, y: 0, scale: 1 }, { x: -50, y: 17, scale: 2.5 }, { x: 12, y: -6, scale: .5 }, { x: -100, y: -30, scale: 12 }]) {
      const css = yardCameraTransform(view, p).slice(7, -1).split(',').map(Number);
      for (const [x, y] of [[0, 0], [200, 100], [60, 45]]) {
        expect((x * p.pixelsPerMeter + p.x) * css[0] + css[4]).toBeCloseTo((x * view.scale + view.x) * p.pixelsPerMeter + p.x, 10);
        expect((y * p.pixelsPerMeter + p.y) * css[3] + css[5]).toBeCloseTo((y * view.scale + view.y) * p.pixelsPerMeter + p.y, 10);
      }
    }
  }
});

test('pointer deltas stay in stationary viewport coordinates as the camera moves', () => {
  const base = { x: 80, y: 40 };
  for (const view of [{ x: -50, y: 17, scale: 2.5 }, { x: 12, y: -6, scale: .5 }]) {
    expect(yardViewportPoint({ x: (base.x - view.x) / view.scale, y: (base.y - view.y) / view.scale }, view)).toEqual(base);
  }
});
