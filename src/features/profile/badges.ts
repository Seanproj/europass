import {
  Award,
  Building2,
  Compass,
  Crown,
  Flag,
  Flower2,
  Gem,
  Globe,
  Handshake,
  Heart,
  Landmark,
  Map as MapIcon,
  MapPin,
  Medal,
  Mountain,
  Plane,
  Puzzle,
  Repeat,
  Snowflake,
  Sparkles,
  Star,
  Trophy,
  type LucideIcon,
} from 'lucide-react';
import { CITIES, COUNTRIES, getCity } from '../../data/cities';
import type { City, RegionGroup } from '../../data/types';
import type { Visit } from '../../db/types';
import { countryProgress } from '../collection/progress';

/** 배지 계산에 필요한 값들을 방문 기록에서 한 번에 만든다 */
export interface BadgeContext {
  visits: Visit[];
  /** 방문한 도시 (고유) */
  cities: City[];
  /** 도시별 방문 수 */
  visitCount: Map<string, number>;
  /** 방문한 나라 */
  countries: Set<string>;
  /** 국기 퍼즐을 완성한 나라 */
  complete: Set<string>;
}

export function buildContext(visits: Visit[]): BadgeContext {
  const visitCount = new Map<string, number>();
  for (const v of visits) visitCount.set(v.cityId, (visitCount.get(v.cityId) ?? 0) + 1);
  const cities = [...visitCount.keys()].map(getCity).filter((c): c is City => !!c);
  const progress = countryProgress(visits, getCity);
  return {
    visits,
    cities,
    visitCount,
    countries: new Set(cities.map((c) => c.country)),
    complete: new Set([...progress.values()].filter((p) => p.complete).map((p) => p.code)),
  };
}

export interface Badge {
  id: string;
  name: string;
  /** 어떻게 얻는지 */
  desc: string;
  icon: LucideIcon;
  /** 목표 값. progress가 이 값 이상이면 획득 */
  goal: number;
  progress: (ctx: BadgeContext) => number;
}

/** 봄 3–5월, 여름 6–8월, 가을 9–11월, 겨울 12–2월 */
export function season(date: string): 0 | 1 | 2 | 3 {
  const m = Number(date.slice(5, 7));
  return m >= 3 && m <= 5 ? 0 : m >= 6 && m <= 8 ? 1 : m >= 9 && m <= 11 ? 2 : 3;
}

const GROUP_NAME: Record<RegionGroup, string> = {
  west: '서유럽',
  central: '중부유럽',
  east: '동유럽',
  south: '남유럽',
  north: '북유럽',
  'british-isles': '영국·아일랜드',
  balkans: '발칸',
};

/** 독일과 국경을 맞댄 9개국 (독일 거주자 기준의 "이웃 나라") */
export const GERMANY_NEIGHBORS = ['DK', 'PL', 'CZ', 'AT', 'CH', 'FR', 'LU', 'BE', 'NL'];

const DE_TIER1 = CITIES.filter((c) => c.country === 'DE' && c.tier === 1).map((c) => c.id);

const cityCount = (goal: number, name: string, icon: LucideIcon): Badge => ({
  id: `cities-${goal}`,
  name,
  desc: goal === 1 ? '첫 도장을 찍었어요' : `서로 다른 도시 ${goal}곳`,
  icon,
  goal,
  progress: (c) => c.cities.length,
});

const countryCount = (goal: number, name: string): Badge => ({
  id: `countries-${goal}`,
  name,
  desc: `${goal}개국 방문`,
  icon: Globe,
  goal,
  progress: (c) => c.countries.size,
});

/** 권역의 모든 나라를 한 번씩 */
const groupBadge = (group: RegionGroup): Badge => {
  const codes = COUNTRIES.filter((c) => c.group === group).map((c) => c.code);
  return {
    id: `group-${group}`,
    name: `${GROUP_NAME[group]} 일주`,
    desc: `${GROUP_NAME[group]} ${codes.length}개국을 모두 방문`,
    icon: Compass,
    goal: codes.length,
    progress: (c) => codes.filter((code) => c.countries.has(code)).length,
  };
};

const flagCount = (goal: number, name: string, icon: LucideIcon): Badge => ({
  id: `flags-${goal}`,
  name,
  desc: goal === 1 ? '한 나라의 국기 퍼즐을 모두 칠했어요' : `국기 퍼즐 ${goal}개 완성`,
  icon,
  goal,
  progress: (c) => c.complete.size,
});

/** 데이터 기반 배지 목록 (순서 = 화면 순서) */
export const BADGES: Badge[] = [
  cityCount(1, '첫 도장', MapPin),
  cityCount(10, '도시 10곳', MapIcon),
  cityCount(25, '도시 25곳', MapIcon),
  cityCount(50, '도시 50곳', Trophy),
  cityCount(100, '도시 100곳', Crown),
  countryCount(5, '5개국'),
  countryCount(10, '10개국'),
  countryCount(20, '20개국'),
  countryCount(30, '30개국'),
  {
    id: 'all-groups',
    name: '유럽 한 바퀴',
    desc: '7개 권역에 모두 한 번씩',
    icon: Plane,
    goal: 7,
    progress: (c) => new Set(COUNTRIES.filter((x) => c.countries.has(x.code)).map((x) => x.group)).size,
  },
  ...(['west', 'central', 'east', 'south', 'north', 'british-isles', 'balkans'] as const).map(groupBadge),
  {
    id: 'germany-master',
    name: '독일 마스터',
    desc: `독일의 대표 도시 ${DE_TIER1.length}곳을 모두`,
    icon: Medal,
    goal: DE_TIER1.length,
    progress: (c) => DE_TIER1.filter((id) => c.visitCount.has(id)).length,
  },
  {
    id: 'capitals',
    name: '수도 컬렉터',
    desc: '수도 10곳',
    icon: Landmark,
    goal: 10,
    progress: (c) => c.cities.filter((x) => x.capital).length,
  },
  {
    id: 'hidden-gems',
    name: '히든젬 헌터',
    desc: '히든젬(금색 도장) 도시 10곳',
    icon: Gem,
    goal: 10,
    progress: (c) => c.cities.filter((x) => x.gem).length,
  },
  {
    id: 'four-seasons',
    name: '사계절 여행자',
    desc: '봄·여름·가을·겨울에 모두 여행',
    icon: Flower2,
    goal: 4,
    progress: (c) => new Set(c.visits.map((v) => season(v.date))).size,
  },
  {
    id: 'three-in-a-month',
    name: '한 달에 3개국',
    desc: '같은 달에 세 나라',
    icon: Sparkles,
    goal: 3,
    progress: (c) => {
      const byMonth = new Map<string, Set<string>>();
      for (const v of c.visits) {
        const country = getCity(v.cityId)?.country;
        if (!country) continue;
        const key = v.date.slice(0, 7);
        byMonth.set(key, (byMonth.get(key) ?? new Set()).add(country));
      }
      return Math.max(0, ...[...byMonth.values()].map((s) => s.size));
    },
  },
  {
    id: 'arctic',
    name: '북극권',
    desc: '북위 66.5° 위의 도시',
    icon: Snowflake,
    goal: 1,
    progress: (c) => c.cities.filter((x) => x.lat >= 66.5).length,
  },
  {
    id: 'again',
    name: '또 왔어요',
    desc: '같은 도시를 두 번',
    icon: Repeat,
    goal: 2,
    progress: (c) => Math.max(0, ...c.visitCount.values()),
  },
  {
    id: 'regular',
    name: '단골',
    desc: '같은 도시를 다섯 번',
    icon: Heart,
    goal: 5,
    progress: (c) => Math.max(0, ...c.visitCount.values()),
  },
  {
    id: 'four-seasons-city',
    name: '사계절 단골',
    desc: '한 도시를 네 계절 모두',
    icon: Building2,
    goal: 4,
    progress: (c) => {
      const seasons = new Map<string, Set<number>>();
      for (const v of c.visits)
        seasons.set(v.cityId, (seasons.get(v.cityId) ?? new Set()).add(season(v.date)));
      return Math.max(0, ...[...seasons.values()].map((s) => s.size));
    },
  },
  flagCount(1, '첫 국기 완성', Flag),
  flagCount(3, '국기 3개', Puzzle),
  flagCount(5, '국기 5개', Star),
  flagCount(10, '국기 10개', Award),
  {
    id: 'neighbors',
    name: '이웃 나라',
    desc: '독일과 맞닿은 9개국의 국기를 모두 완성',
    icon: Handshake,
    goal: GERMANY_NEIGHBORS.length,
    progress: (c) => GERMANY_NEIGHBORS.filter((code) => c.complete.has(code)).length,
  },
  {
    id: 'alps',
    name: '알프스',
    desc: '스위스·오스트리아·리히텐슈타인 국기를 모두 완성',
    icon: Mountain,
    goal: 3,
    progress: (c) => ['CH', 'AT', 'LI'].filter((code) => c.complete.has(code)).length,
  },
];

export interface BadgeState {
  badge: Badge;
  /** 목표 대비 현재 값 (목표를 넘지 않게) */
  value: number;
  earned: boolean;
}

export function evaluateBadges(visits: Visit[], badges = BADGES): BadgeState[] {
  const ctx = buildContext(visits);
  return badges.map((badge) => {
    const value = Math.min(badge.goal, badge.progress(ctx));
    return { badge, value, earned: value >= badge.goal };
  });
}

/**
 * 새로 알릴 배지: 지금 획득한 것 중 아직 알리지 않은 것.
 * seen이 null이면(처음 실행, v0에서 옮겨온 직후) 지금까지 얻은 배지는 조용히 "본 것"으로 처리한다
 */
export function badgesToAnnounce(
  earned: string[],
  seen: string[] | null,
): { announce: string[]; seen: string[] } {
  if (seen === null) return { announce: [], seen: [...earned] };
  const have = new Set(seen);
  const announce = earned.filter((id) => !have.has(id));
  return { announce, seen: announce.length ? [...seen, ...announce] : seen };
}
