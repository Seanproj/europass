import { getCity, getCountry } from './cities';
import type { City } from './types';

/** 출발지(거주지)를 정하지 않음 */
export const HOME_NONE = '';
/** 한국 (나라 단위 거주지. 거리는 서울 기준) */
export const HOME_KOREA = 'kr';

/** 출발지: 유럽 도시 하나, 또는 한국 */
export interface HomePlace {
  id: string;
  /** "프랑크푸르트", "한국" */
  name: string;
  /** 국기 코드 */
  country: string;
  lat: number;
  lon: number;
  /** 유럽 도시면 그 도시 (가까운 도시 추천, 지도 표시에 쓴다) */
  city?: City;
}

const KOREA: HomePlace = { id: HOME_KOREA, name: '한국', country: 'KR', lat: 37.5665, lon: 126.978 };

/** 저장된 homeCityId → 출발지. 비었거나 모르는 값이면 null */
export function homePlace(id: string | undefined): HomePlace | null {
  if (!id) return null;
  if (id === HOME_KOREA) return KOREA;
  const city = getCity(id);
  if (!city) return null;
  return { id, name: city.name.ko, country: city.country, lat: city.lat, lon: city.lon, city };
}

/** 설정 화면 등에 쓰는 이름 ("프랑크푸르트 · 독일", "한국", "정하지 않음") */
export function homeLabel(id: string | undefined): string {
  const home = homePlace(id);
  if (!home) return '정하지 않음';
  if (!home.city) return home.name;
  return `${home.name} · ${getCountry(home.country)?.name.ko ?? home.country}`;
}
