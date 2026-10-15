import { getCity as defaultGetCity, getCountry } from '../../data/cities';
import type { City } from '../../data/types';
import type { Visit } from '../../db/types';
import { countryProgress } from '../collection/progress';

/** 기념할 만한 순간. id는 "한 번만" 판정에 쓰는 고정 키 */
export type Milestone =
  /** 새 나라의 첫 도장. ordinal = 몇 번째 나라인지 */
  | { id: string; kind: 'country'; country: string; ordinal: number }
  /** 도장(방문 기록) 10·25·50·100개째 */
  | { id: string; kind: 'count'; count: number }
  /** 국기 퍼즐 완성 */
  | { id: string; kind: 'flag'; country: string; pieces: number };

export const COUNT_MILESTONES = [10, 25, 50, 100] as const;

/** 같은 체크인에서 여러 개가 겹치면 이 순서로 (앞이 주인공) */
const RANK: Record<Milestone['kind'], number> = { flag: 0, count: 1, country: 2 };

type Lookup = (id: string) => City | undefined;

/** 지금 기록으로 이미 이룬 기념 전부 */
export function earnedMilestones(visits: Visit[], getCity: Lookup = defaultGetCity): Milestone[] {
  const out: Milestone[] = [];
  // 나라는 처음 간 날짜 순으로 몇 번째인지 매긴다
  const firstDate = new Map<string, string>();
  for (const v of visits) {
    const code = getCity(v.cityId)?.country;
    if (!code) continue;
    const d = firstDate.get(code);
    if (d === undefined || v.date < d) firstDate.set(code, v.date);
  }
  [...firstDate]
    .sort((a, b) => a[1].localeCompare(b[1]) || a[0].localeCompare(b[0]))
    .forEach(([country], i) =>
      out.push({ id: `country:${country}`, kind: 'country', country, ordinal: i + 1 }),
    );
  for (const count of COUNT_MILESTONES)
    if (visits.length >= count) out.push({ id: `count:${count}`, kind: 'count', count });
  for (const p of countryProgress(visits, getCity).values())
    if (p.complete) out.push({ id: `flag:${p.code}`, kind: 'flag', country: p.code, pieces: p.pieces });
  return out;
}

/**
 * 체크인 하나로 새로 이룬 기념: 체크인 뒤에는 있고, 앞에는 없고, 알린 적도 없는 것.
 * 가져오기·동기화로 이미 이룬 것은 "앞"에 들어 있어서 알리지 않는다
 */
export function newMilestones(
  before: Visit[],
  after: Visit[],
  seen: readonly string[],
  getCity: Lookup = defaultGetCity,
): Milestone[] {
  const had = new Set([...seen, ...earnedMilestones(before, getCity).map((m) => m.id)]);
  return earnedMilestones(after, getCity)
    .filter((m) => !had.has(m.id))
    .sort((a, b) => RANK[a.kind] - RANK[b.kind]);
}

export interface MilestoneText {
  /** 작은 머리글 */
  label: string;
  title: string;
  sub: string;
}

const countryName = (code: string) => getCountry(code)?.name.ko ?? code;

/** 연출과 기념 카드가 같이 쓰는 문구. cityName = 이 체크인의 도시 */
export function milestoneText(m: Milestone, cityName: string): MilestoneText {
  switch (m.kind) {
    case 'country':
      return {
        label: '새 나라',
        title: `${countryName(m.country)} 첫 도장`,
        sub: m.ordinal === 1 ? '여권의 첫 나라예요' : `${m.ordinal}번째 나라예요`,
      };
    case 'count':
      return { label: '기념 도장', title: `${m.count}번째 도장`, sub: `${cityName}에서 찍었어요` };
    case 'flag':
      return {
        label: '국기 완성',
        title: `${countryName(m.country)} 국기 완성`,
        sub: `조각 ${m.pieces}개를 모두 모았어요`,
      };
  }
}

/** 기념의 나라 (국기를 크게 보여 줄 때). 도장 개수 기념은 없음 */
export function milestoneCountry(m: Milestone): string | null {
  return m.kind === 'count' ? null : m.country;
}
