import { FLAG_BLACK } from '../../../data/flags';
import type { City, Region } from '../../../data/types';

export interface CountryProgress {
  painted: number;
  total: number;
  complete: boolean;
}

/** 방문한 도시들이 속한 조각 = 칠할 조각 */
export function paintedRegions(
  visitedCityIds: Iterable<string>,
  getCity: (id: string) => City | undefined,
): Set<string> {
  const out = new Set<string>();
  for (const id of visitedCityIds) {
    const regionId = getCity(id)?.regionId;
    if (regionId) out.add(regionId);
  }
  return out;
}

/** 나라별 칠한 조각 / 전체 조각 */
export function countryProgress(
  painted: Set<string>,
  regions: Pick<Region, 'id' | 'country'>[],
): Map<string, CountryProgress> {
  const map = new Map<string, CountryProgress>();
  for (const r of regions) {
    const p = map.get(r.country) ?? { painted: 0, total: 0, complete: false };
    p.total++;
    if (painted.has(r.id)) p.painted++;
    p.complete = p.painted === p.total;
    map.set(r.country, p);
  }
  return map;
}

/** 이번에 새로 완성된 나라 (이전 진행과 비교) */
export function newlyCompleted(
  prev: Map<string, CountryProgress>,
  next: Map<string, CountryProgress>,
): string[] {
  return [...next].filter(([code, p]) => p.complete && !prev.get(code)?.complete).map(([code]) => code);
}

/** 안개 톤에 맞춰 채도를 낮춘 국기 색. 검정은 테마의 --flag-black으로 바꾼다 */
export function puzzleColor(hex: string, flagBlack: string, saturation = 0.82): string {
  if (hex.toUpperCase() === FLAG_BLACK) return flagBlack;
  const [h, s, l] = hexToHsl(hex);
  return hslToHex(h, s * saturation, l);
}

function hexToHsl(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h / 6, s, l];
}

function hslToHex(h: number, s: number, l: number): string {
  const f = (n: number) => {
    const k = (n + h * 12) % 12;
    const a = s * Math.min(l, 1 - l);
    const c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(c * 255)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

export interface FlagFeature {
  type: 'Feature';
  properties: { regionId: string; country: string; color: string };
  geometry: { type: 'MultiPolygon'; coordinates: number[][][][] };
}

export interface FlagCollection {
  type: 'FeatureCollection';
  features: FlagFeature[];
}

/** regions-flag.json → 지도 소스. 색은 테마에 맞게 바꾸고 id(=배열 순서)를 붙인다 */
export interface PuzzleSource {
  type: 'FeatureCollection';
  features: (FlagFeature & { id: number })[];
}

export function puzzleSourceData(data: FlagCollection, flagBlack: string): PuzzleSource {
  return {
    type: 'FeatureCollection',
    features: data.features.map((f, id) => ({
      ...f,
      id,
      properties: { ...f.properties, color: puzzleColor(f.properties.color, flagBlack) },
    })),
  };
}
