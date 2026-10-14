import type { Tier } from '../../data/types';

/** 안개 구멍의 실제 반경(km) */
export const HOLE_KM: Record<Tier, number> = { 1: 18, 2: 12, 3: 8 };

/** 렌즈 반지름(px). 지름 60~76px */
const LENS_RADIUS: Record<Tier, number> = { 1: 34, 2: 32, 3: 30 };
export const LENS_MAX_RADIUS = 38;

// MapLibre 타일 크기 512 기준, 적도에서 z0의 1px = 지구 둘레 / 512
const EARTH_CIRCUMFERENCE_M = 40_075_016.686;

/** 위도·줌에서 화면 1px이 몇 m인지 */
export function metersPerPixel(lat: number, zoom: number): number {
  return (EARTH_CIRCUMFERENCE_M * Math.cos((lat * Math.PI) / 180)) / (512 * 2 ** zoom);
}

/** 재방문 보정: 자주 간 도시일수록 넓게 걷힌다 (최대 4번째 방문까지) */
export function revisitFactor(visits: number): number {
  return 1 + 0.12 * Math.min(Math.max(visits - 1, 0), 3);
}

/** 렌즈 반지름(px): 등급별 기본값 + 재방문 보정, 최대 38px */
export function lensRadius(tier: Tier, visits: number): number {
  return Math.min(LENS_MAX_RADIUS, LENS_RADIUS[tier] * revisitFactor(visits));
}

/** 안개 구멍 반경(px) = max(실제 반경을 화면 px로, 렌즈 최소 반경) */
export function holeRadiusPx(tier: Tier, visits: number, lat: number, zoom: number): number {
  const realPx = (HOLE_KM[tier] * 1000 * revisitFactor(visits)) / metersPerPixel(lat, zoom);
  return Math.max(realPx, lensRadius(tier, visits));
}

/** 새 방문 구멍이 0 → 목표 반경으로 열리는 진행도 (700ms ease-out) */
export const OPEN_MS = 700;
export function openProgress(elapsedMs: number): number {
  const t = Math.min(Math.max(elapsedMs / OPEN_MS, 0), 1);
  return 1 - (1 - t) ** 3;
}

/** z7~8에서 렌즈 → 실제 안개 구멍으로 바뀌는 렌즈 불투명도 */
export function lensOpacity(zoom: number): number {
  return Math.min(Math.max(8 - zoom, 0), 1);
}
