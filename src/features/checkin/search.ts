import { convertHangulToQwerty, convertQwertyToHangul, getChoseong } from 'es-hangul';
import type { City, Country } from '../../data/types';

export interface SearchHit {
  city: City;
  score: number;
  /** 나라 이름으로 찾은 결과면 그 나라 코드 (도시 이름 일치가 아님) */
  country?: string;
}

interface Entry {
  city: City;
  /** 비교용으로 정규화한 이름들 (한글, 영어, 현지어) */
  names: string[];
  choseong: string;
}

interface CountryEntry {
  code: string;
  names: string[];
  choseong: string;
}

export interface SearchIndex {
  cities: Entry[];
  countries: CountryEntry[];
}

/** 나라 이름의 다른 표기 (현지어·흔한 별칭) */
const COUNTRY_ALIASES: Record<string, string[]> = {
  AT: ['Österreich', '오스트리아공화국'],
  BA: ['보스니아', 'Bosnia'],
  CH: ['Schweiz', 'Suisse', 'Svizzera'],
  CZ: ['Czech Republic', 'Czech', 'Česko', '체코공화국'],
  DE: ['Deutschland', '도이칠란트'],
  DK: ['Danmark'],
  ES: ['España', '에스파냐'],
  FI: ['Suomi'],
  GB: ['UK', 'England', 'Britain', 'Great Britain', 'Scotland', 'Wales', '잉글랜드', '스코틀랜드', '웨일스'],
  GR: ['Hellas', 'Ελλάδα'],
  HR: ['Hrvatska'],
  HU: ['Magyarország'],
  IT: ['Italia'],
  MK: ['Macedonia', '마케도니아'],
  NL: ['Holland', 'Nederland', '홀란드'],
  NO: ['Norge'],
  PL: ['Polska'],
  SE: ['Sverige'],
  CY: ['Cyprus', '사이프러스'],
};

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

export function buildIndex(cities: City[], countries: Country[] = []): SearchIndex {
  return {
    cities: cities.map((city) => ({
      city,
      names: [...new Set([city.name.ko, city.name.en, city.name.local].map(normalize))],
      choseong: getChoseong(city.name.ko).replace(/\s/g, ''),
    })),
    countries: countries.map((c) => ({
      code: c.code,
      names: [...new Set([c.name.ko, c.name.en, ...(COUNTRY_ALIASES[c.code] ?? [])].map(normalize))],
      choseong: getChoseong(c.name.ko).replace(/\s/g, ''),
    })),
  };
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

/** 한글 초성 일치도 */
function choseongScore(choseong: string, q: string): number {
  return choseong === q ? 90 : choseong.startsWith(q) ? 70 : choseong.includes(q) ? 30 : 0;
}

/** 나라 이름은 짧은 검색어로 오인되지 않게 앞부분 일치 이상만, 한글 2자·영문 3자부터 */
function countryScore(e: CountryEntry, raw: string): number {
  if (CHOSEONG_ONLY.test(raw)) {
    const q = raw.replace(/\s/g, '');
    return q.length >= 2 && choseongScore(e.choseong, q) >= 70 ? 1 : 0;
  }
  // 글자 수는 정규화 전에 센다 (NFKD는 한글 음절을 자모로 풀어 길이가 늘어난다)
  if (raw.replace(/\s/g, '').length < (/[가-힣]/.test(raw) ? 2 : 3)) return 0;
  const q = normalize(raw);
  return e.names.some((n) => n === q || n.startsWith(q)) ? 1 : 0;
}

const byRank = (a: SearchHit, b: SearchHit) =>
  b.score - a.score || a.city.tier - b.city.tier || b.city.population - a.city.population;

function match(index: SearchIndex, raw: string): SearchHit[] {
  const hits = new Map<string, SearchHit>();
  if (CHOSEONG_ONLY.test(raw)) {
    const q = raw.replace(/\s/g, '');
    for (const e of index.cities) {
      const score = choseongScore(e.choseong, q);
      if (score) hits.set(e.city.id, { city: e.city, score });
    }
  } else {
    const q = normalize(raw);
    for (const e of index.cities) {
      const score = Math.max(...e.names.map((n) => nameScore(n, q)));
      if (score) hits.set(e.city.id, { city: e.city, score });
    }
  }
  // 나라 이름이면 그 나라 도시들을 도시 이름 일치 뒤에 (큰 도시부터)
  const countries = new Set(index.countries.filter((c) => countryScore(c, raw)).map((c) => c.code));
  if (countries.size)
    for (const e of index.cities)
      if (countries.has(e.city.country) && !hits.has(e.city.id))
        hits.set(e.city.id, { city: e.city, score: 1, country: e.city.country });
  return [...hits.values()];
}

/**
 * 도시 검색: 한글·영어·현지어 이름과 한글 초성("ㅍㄹㅎ" → 프라하), 나라 이름("독일", "germany" → 독일 도시들).
 * 하나도 없으면 한/영 전환을 잊고 친 것으로 보고 바꿔서 다시 찾는다 ("vkfl" → 파리, "ㅔㅁ걋" → paris).
 * 정렬은 일치도 → tier → 인구
 */
export function searchCities(index: SearchIndex, query: string, limit = 30): SearchHit[] {
  const raw = query.trim();
  if (!raw) return [];
  let hits = match(index, raw);
  if (!hits.length) {
    const swapped = /^[a-zA-Z\s]+$/.test(raw)
      ? convertQwertyToHangul(raw)
      : /[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(raw)
        ? convertHangulToQwerty(raw)
        : '';
    if (swapped && swapped !== raw) hits = match(index, swapped);
  }
  return hits.sort(byRank).slice(0, limit);
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
