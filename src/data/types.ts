export type Tier = 1 | 2 | 3;

export interface City {
  /** "국가코드-영문슬러그" (예: "cz-prague") */
  id: string;
  name: { ko: string; en: string; local: string };
  /** ISO 3166-1 alpha-2 (코소보는 XK) */
  country: string;
  lat: number;
  lon: number;
  population: number;
  /** 1 = 상징 도시, 2 = 인구 10만 이상 또는 큐레이션, 3 = 나머지 */
  tier: Tier;
  capital: boolean;
  /** 국기 퍼즐 조각 id (= 조각 대표 도시의 id) */
  regionId: string;
  /** GeoNames ID. 큐레이션으로 좌표를 직접 넣은 곳은 없음 */
  geonameid?: number;
}

export type RegionGroup = 'west' | 'central' | 'east' | 'south' | 'north' | 'british-isles' | 'balkans';

export interface Country {
  code: string;
  name: { ko: string; en: string };
  group: RegionGroup;
  groupName: string;
  /** 라벨 위치 [lon, lat] */
  center: [number, number];
  cityCount: number;
}

export type Bbox = [minLon: number, minLat: number, maxLon: number, maxLat: number];

export interface Region {
  id: string;
  country: string;
  name: { ko: string; en: string };
  anchorCityId: string;
  /** GeoJSON MultiPolygon 좌표 (단순화) */
  polygon: number[][][][];
}

export interface RegionsData {
  /** 나라별 bbox */
  bboxes: Record<string, Bbox>;
  regions: Region[];
}
