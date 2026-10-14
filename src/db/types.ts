/** 방문 한 번 = 기록 한 건. 같은 도시에 여러 건이 쌓여 재방문 히스토리가 된다. */
export interface Visit {
  id: string;
  cityId: string;
  /** 방문(도착)일 YYYY-MM-DD */
  date: string;
  /** 떠난 날 YYYY-MM-DD. 없으면 당일 */
  endDate?: string;
  note: string;
  photos: Blob[];
  createdAt: number;
  updatedAt: number;
  /** v0에서 옮겨온 기록의 원래 필드 (기분, 별점, 한 줄 요약) — 버리지 않고 보관 */
  legacy?: { mood?: string; rating?: number; title?: string };
}

export interface Profile {
  name: string;
  homeCityId: string;
}

export type SettingKey = 'profile' | 'migratedFromV0';

export interface SettingRow<T = unknown> {
  key: SettingKey;
  value: T;
}

/** 렌즈 스냅샷 캐시. key = lensCacheKey(도시, 테마, 스타일 버전) */
export interface LensCacheRow {
  key: string;
  blob: Blob;
  createdAt: number;
}
