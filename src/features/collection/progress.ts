import { CITIES, COUNTRIES } from '../../data/cities';
import type { City } from '../../data/types';
import type { Visit } from '../../db/types';

/** 나라별 국기 퍼즐 조각 수. 조각 id = 대표 도시 id라서 도시들의 regionId 종류 수와 같다 */
const PIECES = new Map<string, Set<string>>();
for (const c of CITIES) {
  const set = PIECES.get(c.country) ?? new Set();
  set.add(c.regionId);
  PIECES.set(c.country, set);
}
const CITY_COUNT = new Map(COUNTRIES.map((c) => [c.code, c.cityCount]));

export interface CountryProgress {
  code: string;
  /** 칠한 조각 / 전체 조각 */
  painted: number;
  pieces: number;
  /** 방문한 도시 수 / 전체 */
  cities: number;
  totalCities: number;
  complete: boolean;
  /** 가장 최근 방문일 (YYYY-MM-DD), 없으면 '' */
  lastVisit: string;
}

export function piecesOf(country: string): number {
  return PIECES.get(country)?.size ?? 0;
}

/** 방문 기록 → 나라별 진행 (조각 기준) */
export function countryProgress(
  visits: Visit[],
  getCity: (id: string) => City | undefined,
): Map<string, CountryProgress> {
  const out = new Map<string, CountryProgress>();
  const paintedBy = new Map<string, Set<string>>();
  const citiesBy = new Map<string, Set<string>>();
  for (const v of visits) {
    const city = getCity(v.cityId);
    if (!city) continue;
    (paintedBy.get(city.country) ?? paintedBy.set(city.country, new Set()).get(city.country)!).add(
      city.regionId,
    );
    (citiesBy.get(city.country) ?? citiesBy.set(city.country, new Set()).get(city.country)!).add(city.id);
    const p = out.get(city.country);
    if (!p || v.date > p.lastVisit) out.set(city.country, { ...base(city.country), lastVisit: v.date });
  }
  for (const c of COUNTRIES) {
    const p = out.get(c.code) ?? base(c.code);
    p.painted = paintedBy.get(c.code)?.size ?? 0;
    p.cities = citiesBy.get(c.code)?.size ?? 0;
    p.complete = p.pieces > 0 && p.painted === p.pieces;
    out.set(c.code, p);
  }
  return out;
}

function base(code: string): CountryProgress {
  return {
    code,
    painted: 0,
    pieces: piecesOf(code),
    cities: 0,
    totalCities: CITY_COUNT.get(code) ?? 0,
    complete: false,
    lastVisit: '',
  };
}

/** 리스트 정렬: 방문한 나라(최근 방문 순) → 미방문(가나다) */
export function sortCountries(list: CountryProgress[], koName: (code: string) => string): CountryProgress[] {
  return [...list].sort((a, b) => {
    if (a.lastVisit && b.lastVisit) return b.lastVisit.localeCompare(a.lastVisit);
    if (a.lastVisit || b.lastVisit) return a.lastVisit ? -1 : 1;
    return koName(a.code).localeCompare(koName(b.code), 'ko');
  });
}

/** "유럽의 4%": 방문한 도시 / 전체 도시 */
export function europePercent(visitedCities: number): number {
  return Math.round((visitedCities / CITIES.length) * 100);
}
