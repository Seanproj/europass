import { getCity } from '../../data/cities';
import type { Visit } from '../../db/types';
import { passportScore, type FlagPieces } from './score';

export interface ProfileStats {
  cities: number;
  countries: number;
  /** 여권 점수 (score.ts) */
  score: number;
  /** 유럽에서 보낸 날 (겹치는 날은 한 번) */
  days: number;
  /** 국기 퍼즐 조각 */
  pieces: FlagPieces;
  visits: number;
  /** 두 번 이상 간 도시 중 많이 간 순서 3곳 */
  top: { cityId: string; count: number }[];
}

export function profileStats(visits: Visit[]): ProfileStats {
  const counts = new Map<string, number>();
  const latest = new Map<string, string>();
  const countries = new Set<string>();
  for (const v of visits) {
    counts.set(v.cityId, (counts.get(v.cityId) ?? 0) + 1);
    if ((latest.get(v.cityId) ?? '') < v.date) latest.set(v.cityId, v.date);
    const city = getCity(v.cityId);
    if (!city) continue;
    countries.add(city.country);
  }
  const top = [...counts]
    .filter(([, count]) => count >= 2)
    .sort(([a, x], [b, y]) => y - x || (latest.get(b) ?? '').localeCompare(latest.get(a) ?? ''))
    .slice(0, 3)
    .map(([cityId, count]) => ({ cityId, count }));
  const score = passportScore(visits);
  return {
    cities: counts.size,
    countries: countries.size,
    score: score.total,
    days: score.days,
    pieces: score.pieces,
    visits: visits.length,
    top,
  };
}

export interface TimelineEntry {
  visit: Visit;
  /** 그 도시의 몇 번째 방문인지 (날짜순) */
  nth: number;
}

export interface TimelineMonth {
  /** YYYY-MM */
  month: string;
  entries: TimelineEntry[];
}

/** 모든 방문을 월별로 묶는다. 최신 달, 최신 방문이 위 */
export function timelineByMonth(visits: Visit[]): TimelineMonth[] {
  const asc = [...visits].sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt);
  const seen = new Map<string, number>();
  const entries = asc.map((visit) => {
    const nth = (seen.get(visit.cityId) ?? 0) + 1;
    seen.set(visit.cityId, nth);
    return { visit, nth };
  });
  const months = new Map<string, TimelineEntry[]>();
  for (const e of entries.reverse()) {
    const key = e.visit.date.slice(0, 7);
    (months.get(key) ?? months.set(key, []).get(key)!).push(e);
  }
  return [...months].map(([month, list]) => ({ month, entries: list }));
}
