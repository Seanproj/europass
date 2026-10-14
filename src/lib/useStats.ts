import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { totalVisits, uniqueCityCount, uniqueCountryCount } from '../db/selectors';
import type { Visit } from '../db/types';
import { countryOfCity } from '../data/cities';

const EMPTY: Visit[] = [];

export interface Stats {
  cities: number;
  countries: number;
  visits: number;
  countryCodes: string[];
  /** 도시별 방문 횟수 */
  counts: Map<string, number>;
}

export function computeStats(visits: Visit[]): Stats {
  const codes = new Set<string>();
  const counts = new Map<string, number>();
  for (const v of visits) {
    counts.set(v.cityId, (counts.get(v.cityId) ?? 0) + 1);
    const c = countryOfCity(v.cityId);
    if (c) codes.add(c);
  }
  return {
    cities: uniqueCityCount(visits),
    countries: uniqueCountryCount(visits, countryOfCity),
    visits: totalVisits(visits),
    countryCodes: [...codes],
    counts,
  };
}

/** 방문 기록이 바뀌면 자동으로 다시 계산되는 통계 */
export function useStats(): Stats {
  const visits = useLiveQuery(() => db.visits.toArray(), [], EMPTY);
  return computeStats(visits);
}
