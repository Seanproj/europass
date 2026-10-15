import { CITIES, getCity as defaultGetCity } from '../../data/cities';
import type { City } from '../../data/types';
import type { Visit } from '../../db/types';
import { addDays } from '../../lib/date';
import { countryProgress } from '../collection/progress';

type Lookup = (id: string) => City | undefined;

/** 한 방문을 며칠로 칠지의 상한 (날짜를 잘못 넣어 몇 년짜리가 된 기록이 점수를 망치지 않게) */
const MAX_STAY_DAYS = 90;

/**
 * 유럽에서 보낸 날: 방문 기간(도착일~떠난 날)을 모두 펼쳐 겹치는 날은 한 번만 센다.
 * 같은 날 두 도시를 들렀어도 하루
 */
export function travelDays(visits: Visit[]): number {
  const days = new Set<string>();
  for (const v of visits) {
    let d = v.date;
    const end = v.endDate && v.endDate > v.date ? v.endDate : v.date;
    for (let i = 0; i < MAX_STAY_DAYS && d <= end; i++, d = addDays(d, 1)) days.add(d);
  }
  return days.size;
}

/** 전체 국기 퍼즐 조각 수 (모든 나라의 지역 조각) */
export const TOTAL_PIECES = new Set(CITIES.map((c) => c.regionId)).size;

export interface FlagPieces {
  painted: number;
  total: number;
  /** 다 칠한 국기 수 */
  complete: number;
}

export function flagPieces(visits: Visit[], getCity: Lookup = defaultGetCity): FlagPieces {
  let painted = 0;
  let complete = 0;
  for (const p of countryProgress(visits, getCity).values()) {
    painted += p.painted;
    if (p.complete) complete++;
  }
  return { painted, total: TOTAL_PIECES, complete };
}

/** 여권 점수 규칙. 화면의 "점수 계산"과 같은 표를 쓴다 */
export const SCORE_RULES = [
  { id: 'city', label: '도시', unit: '곳', points: 10 },
  { id: 'gem', label: '숨은 명소 보너스', unit: '곳', points: 10 },
  { id: 'country', label: '나라', unit: '개', points: 50 },
  { id: 'flag', label: '국기 완성', unit: '개', points: 100 },
  { id: 'day', label: '유럽에서 보낸 날', unit: '일', points: 5 },
  { id: 'revisit', label: '다시 간 방문', unit: '번', points: 5 },
] as const;

export type ScoreRuleId = (typeof SCORE_RULES)[number]['id'];

export interface ScoreLine {
  id: ScoreRuleId;
  label: string;
  unit: string;
  points: number;
  count: number;
  subtotal: number;
}

export interface PassportScore {
  total: number;
  lines: ScoreLine[];
  days: number;
  pieces: FlagPieces;
}

/**
 * 여권 점수: 어디 사는지와 상관없이 같은 기준으로 비교할 수 있게, 무엇을 몇 개 모았는지로만 센다.
 * 도시 10 · 숨은 명소 +10 · 나라 50 · 국기 완성 100 · 보낸 날 5 · 재방문 5
 */
export function passportScore(visits: Visit[], getCity: Lookup = defaultGetCity): PassportScore {
  const cities = new Set<string>();
  const countries = new Set<string>();
  let gems = 0;
  let known = 0;
  for (const v of visits) {
    const city = getCity(v.cityId);
    if (!city) continue;
    known++;
    countries.add(city.country);
    if (cities.has(city.id)) continue;
    cities.add(city.id);
    if (city.gem) gems++;
  }
  const days = travelDays(visits.filter((v) => getCity(v.cityId)));
  const pieces = flagPieces(visits, getCity);
  const counts: Record<ScoreRuleId, number> = {
    city: cities.size,
    gem: gems,
    country: countries.size,
    flag: pieces.complete,
    day: days,
    revisit: known - cities.size,
  };
  const lines = SCORE_RULES.map((r) => ({ ...r, count: counts[r.id], subtotal: counts[r.id] * r.points }));
  return { total: lines.reduce((s, l) => s + l.subtotal, 0), lines, days, pieces };
}
