import type { Visit } from './types';

/** 최신 방문이 먼저 오도록 (날짜 → 생성 시각) */
export function byNewest(a: Visit, b: Visit): number {
  return b.date.localeCompare(a.date) || b.createdAt - a.createdAt;
}

export function uniqueCityCount(visits: Visit[]): number {
  return new Set(visits.map((v) => v.cityId)).size;
}

export function totalVisits(visits: Visit[]): number {
  return visits.length;
}

/** 도시별 방문 목록 (각 목록은 최신순) */
export function visitsByCity(visits: Visit[]): Map<string, Visit[]> {
  const map = new Map<string, Visit[]>();
  for (const v of visits) {
    const list = map.get(v.cityId);
    if (list) list.push(v);
    else map.set(v.cityId, [v]);
  }
  for (const list of map.values()) list.sort(byNewest);
  return map;
}

function dayNumber(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  return Date.UTC(y ?? 0, (m ?? 1) - 1, d ?? 1) / 86_400_000;
}

/** 머문 일수 — 당일치기는 1일, 12.20~12.23은 4일 */
export function stayDays(visit: Pick<Visit, 'date' | 'endDate'>): number {
  if (!visit.endDate) return 1;
  return Math.max(1, dayNumber(visit.endDate) - dayNumber(visit.date) + 1);
}

/** 머문 박수 — 당일치기 0박 */
export function stayNights(visit: Pick<Visit, 'date' | 'endDate'>): number {
  return stayDays(visit) - 1;
}

export function totalStayDays(visits: Visit[]): number {
  return visits.reduce((sum, v) => sum + stayDays(v), 0);
}

/** 방문한 나라 수 — cityId → 국가코드 조회 함수를 받음 (도시 데이터는 Phase 2에서 확정) */
export function uniqueCountryCount(
  visits: Visit[],
  countryOf: (cityId: string) => string | undefined,
): number {
  const set = new Set<string>();
  for (const v of visits) {
    const c = countryOf(v.cityId);
    if (c) set.add(c);
  }
  return set.size;
}
