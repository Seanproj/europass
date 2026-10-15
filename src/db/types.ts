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
  /** 클라우드와 맞춘 때의 updatedAt. updatedAt이 더 크거나 없으면 아직 올리지 않은 변경 (Phase 9) */
  syncedAt?: number;
}

export interface Profile {
  name: string;
  homeCityId: string;
  /** 마지막으로 고친 시각 (기기 간 동기화에서 최신 쪽을 고를 때) */
  updatedAt?: number;
}

/** settings는 키-값 테이블이라 키를 늘려도 스키마 버전을 올릴 필요가 없다 */
/** memoryDismissed: 회상 카드를 닫은 날 (YYYY-MM-DD) — 그날은 다시 띄우지 않는다 */
export type SettingKey =
  'profile' | 'migratedFromV0' | 'badgesSeen' | 'sync' | 'memoryDismissed' | 'milestonesSeen' | 'lastOpened';

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

/** 지운 방문 기록 표시 (클라우드에 올린 적 있는 기록만). 다른 기기에도 지워졌다고 알리고 나면 없앤다 */
export interface TombstoneRow {
  id: string;
  deletedAt: number;
}
