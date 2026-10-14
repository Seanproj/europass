import { CITIES, getCity } from '../../data/cities';
import type { City } from '../../data/types';
import { visitsByCity } from '../../db/selectors';
import type { Visit } from '../../db/types';

export interface PassportStamp {
  city: City;
  /** 가장 최근 방문 (도장에 찍히는 날짜) */
  latest: Visit;
  /** 이 도시 방문 횟수 */
  count: number;
  /** 첫 방문일 (도감 순서) */
  first: string;
}

export interface PassportTally {
  got: number;
  total: number;
}

export interface Passport {
  stamps: PassportStamp[];
  all: PassportTally;
  gold: PassportTally;
  capitals: PassportTally;
}

const TOTAL = {
  all: CITIES.length,
  gold: CITIES.filter((c) => c.gem).length,
  capitals: CITIES.filter((c) => c.capital).length,
};

/** 내 여권: 도시마다 도장 하나, 첫 방문순. 모은 수 / 전체 (전체·금색·수도) */
export function passport(visits: Visit[]): Passport {
  const stamps: PassportStamp[] = [];
  // 도시별 목록은 최신순
  for (const [id, list] of visitsByCity(visits)) {
    const city = getCity(id);
    if (!city) continue;
    stamps.push({ city, latest: list[0]!, count: list.length, first: list[list.length - 1]!.date });
  }
  stamps.sort((a, b) => a.first.localeCompare(b.first) || a.city.id.localeCompare(b.city.id));
  return {
    stamps,
    all: { got: stamps.length, total: TOTAL.all },
    gold: { got: stamps.filter((s) => s.city.gem).length, total: TOTAL.gold },
    capitals: { got: stamps.filter((s) => s.city.capital).length, total: TOTAL.capitals },
  };
}
