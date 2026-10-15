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

// ── 줌 단계 ──────────────────────────────────────────
// 유럽 전체(z<5): 도시마다 작은 도장 배지 · 나라 크기(z5~7): 실제 거리만큼의 렌즈 · 도시 크기(z8~): 실제 안개 구멍
// (렌즈를 화면 px로 고정하면 줌아웃할 때 서로 겹쳐 관계없는 도시 지도 조각이 이어 붙은 것처럼 보였다)

/** 도장 배지 한 변(px) */
export const STAMP_SIZE = 36;

/** 도장 배지 → 렌즈로 바뀌는 비율: z5 이하 0(도장만), z6 이상 1(렌즈만) */
export function lensMix(zoom: number): number {
  return Math.min(Math.max(zoom - 5, 0), 1);
}

/** 렌즈가 보여 주는 실제 반경(km). 안개 구멍보다 조금 넓게 */
const LENS_KM: Record<Tier, number> = { 1: 30, 2: 22, 3: 16 };

/** 줌에 따른 렌즈 반지름(px): 실제 거리만큼, 도장 배지 크기 이상 · 기본 렌즈 크기 이하 */
export function lensRadiusAt(tier: Tier, visits: number, lat: number, zoom: number): number {
  const real = (LENS_KM[tier] * 1000 * revisitFactor(visits)) / metersPerPixel(lat, zoom);
  return Math.min(lensRadius(tier, visits), Math.max(STAMP_SIZE / 2, real));
}

/** 안개 구멍 반경(px) = max(실제 반경을 화면 px로, 지금 보이는 도장·렌즈 크기) */
export function holeRadiusPx(tier: Tier, visits: number, lat: number, zoom: number): number {
  const realPx = (HOLE_KM[tier] * 1000 * revisitFactor(visits)) / metersPerPixel(lat, zoom);
  const shown = zoom < 5 ? STAMP_SIZE * 0.45 : lensRadiusAt(tier, visits, lat, zoom);
  return Math.max(realPx, shown);
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
