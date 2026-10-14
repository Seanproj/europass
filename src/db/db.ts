import Dexie, { type EntityTable } from 'dexie';
import type { LensCacheRow, Profile, SettingRow, Visit } from './types';
import { mapV0CityId } from './v0-city-map';

export const DB_NAME = 'euro-passport-v1';

export type PassportDB = Dexie & {
  visits: EntityTable<Visit, 'id'>;
  settings: EntityTable<SettingRow, 'key'>;
  lensCache: EntityTable<LensCacheRow, 'key'>;
};

export function createDB(name = DB_NAME): PassportDB {
  const db = new Dexie(name) as PassportDB;
  // 스키마를 바꿀 때는 버전을 올리고 upgrade()로 마이그레이션 + 테스트 필수 (CLAUDE.md)
  db.version(1).stores({
    visits: 'id, cityId, date, [cityId+date]',
    settings: 'key',
  });
  // v2: Phase 1에서 v0 id("prague") 그대로 옮겨진 기록을 v1 id("cz-prague")로 바꾼다. 스키마는 그대로
  db.version(2)
    .stores({
      visits: 'id, cityId, date, [cityId+date]',
      settings: 'key',
    })
    .upgrade(async (tx) => {
      await tx
        .table<Visit, string>('visits')
        .toCollection()
        .modify((v) => {
          v.cityId = mapV0CityId(v.cityId);
        });
      const settings = tx.table<SettingRow, string>('settings');
      const profile = await settings.get('profile');
      if (profile) {
        const value = profile.value as Profile;
        await settings.put({ ...profile, value: { ...value, homeCityId: mapV0CityId(value.homeCityId) } });
      }
    });
  // v3: 렌즈(도시 상세 지도 스냅샷) 캐시 테이블 추가. 사용자 데이터가 아니라 언제 지워도 다시 만들어진다
  db.version(3).stores({
    visits: 'id, cityId, date, [cityId+date]',
    settings: 'key',
    lensCache: 'key',
  });
  return db;
}

export const db = createDB();

export function newId(): string {
  return crypto.randomUUID();
}
