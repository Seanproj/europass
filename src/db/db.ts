import Dexie, { type EntityTable } from 'dexie';
import type { LensCacheRow, Profile, SettingRow, TombstoneRow, Visit } from './types';
import { mapV0CityId } from './v0-city-map';

export const DB_NAME = 'euro-passport-v1';

export type PassportDB = Dexie & {
  visits: EntityTable<Visit, 'id'>;
  settings: EntityTable<SettingRow, 'key'>;
  lensCache: EntityTable<LensCacheRow, 'key'>;
  tombstones: EntityTable<TombstoneRow, 'id'>;
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
  // v4 (Phase 9): 기기 간 동기화용 삭제 표시 테이블. 방문 기록 자체는 그대로 (syncedAt은 인덱스 없는 필드)
  db.version(4).stores({
    visits: 'id, cityId, date, [cityId+date]',
    settings: 'key',
    lensCache: 'key',
    tombstones: 'id',
  });
  return db;
}

/**
 * 방문 기록 지우기 (되돌리기, 기록 삭제, 모두 삭제가 모두 여기로).
 * 클라우드에 올린 적 있는 기록이면 삭제 표시를 남겨 다른 기기에서도 지워지게 한다
 */
export async function removeVisits(db: PassportDB, ids: string[]): Promise<void> {
  await db.transaction('rw', db.visits, db.tombstones, async () => {
    const rows = await db.visits.bulkGet(ids);
    const now = Date.now();
    const marks = rows.filter((v): v is Visit => !!v?.syncedAt).map((v) => ({ id: v.id, deletedAt: now }));
    if (marks.length) await db.tombstones.bulkPut(marks);
    await db.visits.bulkDelete(ids);
  });
}

export const db = createDB();

export function newId(): string {
  return crypto.randomUUID();
}
