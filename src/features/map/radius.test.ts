import { describe, expect, it } from 'vitest';
import {
  STAMP_SIZE,
  holeRadiusPx,
  lensMix,
  lensOpacity,
  lensRadius,
  lensRadiusAt,
  metersPerPixel,
  openProgress,
  revisitFactor,
} from './radius';

describe('안개 구멍 반경', () => {
  it('적도 z0에서 1px은 지구 둘레 / 512', () => {
    expect(metersPerPixel(0, 0)).toBeCloseTo(78271.5, 0);
    // 줌이 1 오르면 절반, 위도 60°에서는 cos 60° = 0.5배
    expect(metersPerPixel(0, 1)).toBeCloseTo(metersPerPixel(0, 0) / 2, 6);
    expect(metersPerPixel(60, 0)).toBeCloseTo(metersPerPixel(0, 0) / 2, 6);
  });

  it('도시 줌에서는 실제 반경(km)을 px로 바꾼 값', () => {
    // 프라하(50°N) z12, tier1 18km
    const px = holeRadiusPx(1, 1, 50, 12);
    expect(px).toBeCloseTo(18_000 / metersPerPixel(50, 12), 6);
    expect(px).toBeGreaterThan(1000);
  });

  it('유럽 전체 줌에서는 도장 배지 둘레만 걷힌다 (렌즈 크기가 아니라)', () => {
    expect(holeRadiusPx(1, 1, 50, 4)).toBe(STAMP_SIZE * 0.45);
    expect(holeRadiusPx(3, 1, 50, 3)).toBe(STAMP_SIZE * 0.45);
  });

  it('줌 단계: z5 이하 도장, z6 이상 렌즈, 사이는 섞임', () => {
    expect(lensMix(3)).toBe(0);
    expect(lensMix(5)).toBe(0);
    expect(lensMix(5.5)).toBeCloseTo(0.5);
    expect(lensMix(6)).toBe(1);
    expect(lensMix(9)).toBe(1);
  });

  it('렌즈는 실제 거리만큼: 줌아웃하면 작아지고(도장 크기까지), 줌인하면 기본 크기에서 멈춘다', () => {
    const z55 = lensRadiusAt(1, 1, 50, 5.5);
    const z6 = lensRadiusAt(1, 1, 50, 6);
    const z9 = lensRadiusAt(1, 1, 50, 9);
    expect(z55).toBeGreaterThanOrEqual(STAMP_SIZE / 2);
    expect(z6).toBeGreaterThan(z55);
    expect(z9).toBe(lensRadius(1, 1));
    // z6에서 프라하–브르노(약 185km)는 화면에서 렌즈 두 개보다 멀다 → 겹치지 않는다
    const pxBetween = 185_000 / metersPerPixel(50, 6);
    expect(pxBetween).toBeGreaterThan(z6 * 2);
  });

  it('재방문 보정은 최대 3번까지 12%씩', () => {
    expect(revisitFactor(1)).toBe(1);
    expect(revisitFactor(2)).toBeCloseTo(1.12);
    expect(revisitFactor(4)).toBeCloseTo(1.36);
    expect(revisitFactor(10)).toBeCloseTo(1.36);
    expect(holeRadiusPx(2, 3, 48, 11)).toBeCloseTo(holeRadiusPx(2, 1, 48, 11) * 1.24, 6);
  });

  it('렌즈 지름은 60~76px', () => {
    for (const tier of [1, 2, 3] as const)
      for (const n of [1, 2, 5]) {
        expect(lensRadius(tier, n) * 2).toBeGreaterThanOrEqual(60);
        expect(lensRadius(tier, n) * 2).toBeLessThanOrEqual(76);
      }
  });

  it('새 구멍은 700ms ease-out으로 열린다', () => {
    expect(openProgress(0)).toBe(0);
    expect(openProgress(350)).toBeGreaterThan(0.5);
    expect(openProgress(700)).toBe(1);
    expect(openProgress(5000)).toBe(1);
  });

  it('렌즈는 z7~8에서 사라진다', () => {
    expect(lensOpacity(5)).toBe(1);
    expect(lensOpacity(7.5)).toBeCloseTo(0.5);
    expect(lensOpacity(8.5)).toBe(0);
  });
});
