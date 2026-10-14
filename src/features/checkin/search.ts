import { getChoseong } from 'es-hangul';
import type { City } from '../../data/types';

export interface SearchHit {
  city: City;
  score: number;
}

interface Entry {
  city: City;
  /** 비교용으로 정규화한 이름들 (한글, 영어, 현지어) */
  names: string[];
  choseong: string;
}

/** 소문자 + 발음 구별 기호 제거: "Kraków" → "krakow" */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[øæœßłđ]/g, (c) => ({ ø: 'o', æ: 'ae', œ: 'oe', ß: 'ss', ł: 'l', đ: 'd' })[c] ?? c)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[\s'’-]+/g, ' ')
    .trim();
}

const CHOSEONG_ONLY = /^[ㄱ-ㅎ\s]+$/;

export function buildIndex(cities: City[]): Entry[] {
  return cities.map((city) => ({
    city,
    names: [...new Set([city.name.ko, city.name.en, city.name.local].map(normalize))],
    choseong: getChoseong(city.name.ko).replace(/\s/g, ''),
  }));
}

/** 이름 하나와 검색어의 일치도. 0이면 불일치 */
function nameScore(name: string, q: string): number {
  if (name === q) return 100;
  if (name.startsWith(q)) return 80;
  if (name.split(' ').some((w) => w.startsWith(q))) return 60;
  if (name.includes(q)) return 40;
  // 띄어쓰기 없이 친 경우 ("로텐부르크오프" ↔ "로텐부르크 오프")
  if (name.replace(/ /g, '').includes(q.replace(/ /g, ''))) return 35;
  return 0;
}

/**
 * 도시 검색: 한글·영어·현지어 이름과 한글 초성("ㅍㄹㅎ" → 프라하).
 * 정렬은 일치도 → tier → 인구
 */
export function searchCities(index: Entry[], query: string, limit = 30): SearchHit[] {
  const raw = query.trim();
  if (!raw) return [];
  const hits: SearchHit[] = [];
  if (CHOSEONG_ONLY.test(raw)) {
    const q = raw.replace(/\s/g, '');
    for (const e of index) {
      const score = e.choseong === q ? 90 : e.choseong.startsWith(q) ? 70 : e.choseong.includes(q) ? 30 : 0;
      if (score) hits.push({ city: e.city, score });
    }
  } else {
    const q = normalize(raw);
    for (const e of index) {
      const score = Math.max(...e.names.map((n) => nameScore(n, q)));
      if (score) hits.push({ city: e.city, score });
    }
  }
  return hits
    .sort((a, b) => b.score - a.score || a.city.tier - b.city.tier || b.city.population - a.city.population)
    .slice(0, limit);
}

/** 두 지점 사이 거리(km), 하버사인 */
export function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(a));
}

/** 기준점에서 가까운 도시 n곳 (exclude에 든 도시 제외) */
export function nearestCities(
  cities: City[],
  from: { lat: number; lon: number },
  n: number,
  exclude: (id: string) => boolean = () => false,
): { city: City; km: number }[] {
  return cities
    .filter((c) => !exclude(c.id))
    .map((city) => ({ city, km: distanceKm(from.lat, from.lon, city.lat, city.lon) }))
    .sort((a, b) => a.km - b.km)
    .slice(0, n);
}

/** 현재 위치에서 maxKm 안의 가장 가까운 도시 */
export function cityNear(
  cities: City[],
  lat: number,
  lon: number,
  maxKm = 30,
): { city: City; km: number } | null {
  const [best] = nearestCities(cities, { lat, lon }, 1);
  return best && best.km <= maxKm ? best : null;
}
