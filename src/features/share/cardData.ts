import { CITIES, getCity, getCountry } from '../../data/cities';
import type { City } from '../../data/types';
import { byNewest, visitsByCity, visitRank } from '../../db/selectors';
import type { Profile, Visit } from '../../db/types';
import { milestoneCountry, milestoneText, type Milestone, type MilestoneText } from '../checkin/milestones';
import { distanceKm } from '../checkin/search';
import { piecesOf } from '../collection/progress';
import { profileStats, type ProfileStats } from '../profile/stats';

export interface StampItem {
  city: City;
  visit: { id: string; date: string };
  /** 이 도시의 몇 번째 방문인지 (도장의 로마 숫자 표식) */
  nth?: number;
}

/**
 * 최근 방문한 도시 n곳의 가장 최근 도장 (같은 도시는 한 번만).
 * 재방문 순번은 history(기본은 visits) 전체 기준 — 한 해만 고른 목록이어도 도시 상세와 같은 숫자
 */
export function recentStamps(visits: Visit[], n: number, history: Visit[] = visits): StampItem[] {
  const out: StampItem[] = [];
  const seen = new Set<string>();
  const byCity = visitsByCity(history);
  for (const v of [...visits].sort(byNewest)) {
    if (seen.has(v.cityId)) continue;
    const city = getCity(v.cityId);
    if (!city) continue;
    seen.add(v.cityId);
    out.push({ city, visit: { id: v.id, date: v.date }, nth: visitRank(byCity.get(v.cityId) ?? [v], v) });
    if (out.length === n) break;
  }
  return out;
}

export interface SummaryCardData {
  name: string;
  /** 카드에 찍는 날짜 YYYY-MM-DD */
  date: string;
  stats: ProfileStats;
  stamps: StampItem[];
}

/** 피드·스토리 카드: 숫자 3개 + 최근 도장 6개 + 이름과 날짜 */
export function summaryCardData(visits: Visit[], profile: Profile, date: string): SummaryCardData {
  return {
    name: profile.name,
    date,
    stats: profileStats(visits, profile.homeCityId),
    stamps: recentStamps(visits, 6),
  };
}

export interface CountryCardData {
  code: string;
  name: string;
  date: string;
  owner: string;
  cities: number;
  totalCities: number;
  painted: Set<string>;
  pieces: number;
  complete: boolean;
  /** 그 나라에서 찍은 도장 (도시마다 최근 것, 최신순) */
  stamps: StampItem[];
}

export function countryCardData(code: string, visits: Visit[], owner: string, date: string): CountryCardData {
  const own = visits.filter((v) => getCity(v.cityId)?.country === code);
  const stamps = recentStamps(own, Infinity);
  const painted = new Set(stamps.map((s) => s.city.regionId));
  const pieces = piecesOf(code);
  return {
    code,
    name: getCountry(code)?.name.ko ?? code,
    date,
    owner,
    cities: stamps.length,
    totalCities: CITIES.filter((c) => c.country === code).length,
    painted,
    pieces,
    complete: pieces > 0 && painted.size === pieces,
    stamps,
  };
}

export interface CityCardData {
  city: City;
  date: string;
  owner: string;
  /** 오래된 순 */
  visits: { id: string; date: string }[];
  /** 가장 최근 방문의 첫 사진 */
  photo: Blob | undefined;
}

export function cityCardData(
  cityId: string,
  visits: Visit[],
  owner: string,
  date: string,
): CityCardData | null {
  const city = getCity(cityId);
  if (!city) return null;
  const own = visits.filter((v) => v.cityId === cityId).sort(byNewest);
  return {
    city,
    date,
    owner,
    visits: own.map((v) => ({ id: v.id, date: v.date })).reverse(),
    photo: own.find((v) => v.photos.length > 0)?.photos[0],
  };
}

export interface MilestoneCardData {
  text: MilestoneText;
  /** 국기를 크게 보여 줄 나라 (도장 개수 기념이면 null) */
  country: string | null;
  /** 도장 개수 기념의 숫자 */
  count: number | null;
  /** 이 기념을 만든 도장 */
  stamp: StampItem;
  /** 같은 체크인에서 함께 이룬 기념 (제목만) */
  also: string[];
  owner: string;
  date: string;
}

/** 기념 카드: 주인공 기념(첫 번째) + 그 순간의 도장 */
export function milestoneCardData(
  milestones: Milestone[],
  stamp: { cityId: string; visit: { id: string; date: string }; nth: number },
  owner: string,
  date: string,
): MilestoneCardData | null {
  const [main, ...rest] = milestones;
  const city = getCity(stamp.cityId);
  if (!main || !city) return null;
  return {
    text: milestoneText(main, city.name.ko),
    country: milestoneCountry(main),
    count: main.kind === 'count' ? main.count : null,
    stamp: { city, visit: stamp.visit, nth: stamp.nth },
    also: rest.map((m) => milestoneText(m, city.name.ko).title),
    owner,
    date,
  };
}

/** 연말 결산 "My Euro Year" */
export interface WrapData {
  year: number;
  name: string;
  visits: number;
  cities: number;
  countries: number;
  km: number;
  /** 홈에서 가장 먼 곳 */
  farthest: (StampItem & { km: number }) | null;
  home: City | undefined;
  /** 가장 많이 방문한 나라 */
  topCountry: { code: string; name: string; visits: number; cities: number; stamps: StampItem[] } | null;
  /** 1~12월 방문 수 */
  months: number[];
  /** 올해 찍은 도장 (도시마다 첫 도장, 날짜순) */
  collection: StampItem[];
}

export function wrapData(all: Visit[], year: number, profile: Profile): WrapData {
  const visits = all.filter((v) => v.date.startsWith(`${year}-`));
  const home = getCity(profile.homeCityId);
  const stats = profileStats(visits, profile.homeCityId);

  let farthest: WrapData['farthest'] = null;
  const months = Array.from({ length: 12 }, () => 0);
  const byCountry = new Map<string, Visit[]>();
  const firstByCity = new Map<string, Visit>();
  for (const v of [...visits].sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt)) {
    const city = getCity(v.cityId);
    if (!city) continue;
    months[Number(v.date.slice(5, 7)) - 1]!++;
    byCountry.set(city.country, [...(byCountry.get(city.country) ?? []), v]);
    if (!firstByCity.has(city.id)) firstByCity.set(city.id, v);
    const km = home ? distanceKm(home.lat, home.lon, city.lat, city.lon) : 0;
    if (!farthest || km > farthest.km)
      farthest = { city, visit: { id: v.id, date: v.date }, km: Math.round(km) };
  }

  let topCountry: WrapData['topCountry'] = null;
  for (const [code, list] of byCountry) {
    const cities = new Set(list.map((v) => v.cityId)).size;
    if (
      !topCountry ||
      list.length > topCountry.visits ||
      (list.length === topCountry.visits && cities > topCountry.cities)
    ) {
      topCountry = {
        code,
        name: getCountry(code)?.name.ko ?? code,
        visits: list.length,
        cities,
        stamps: recentStamps(list, 6, all),
      };
    }
  }

  return {
    year,
    name: profile.name,
    visits: stats.visits,
    cities: stats.cities,
    countries: stats.countries,
    km: stats.km,
    farthest,
    home,
    topCountry,
    months,
    collection: [...firstByCity.values()].map((v) => ({
      city: getCity(v.cityId)!,
      visit: { id: v.id, date: v.date },
    })),
  };
}

/** 결산 배너를 보여줄 해: 12월이면 올해, 1월이면 작년, 그 밖에는 없음 */
export function wrapYearFor(today: string): number | null {
  const y = Number(today.slice(0, 4));
  const m = Number(today.slice(5, 7));
  if (m === 12) return y;
  if (m === 1) return y - 1;
  return null;
}
