import Dexie, { type EntityTable } from 'dexie';
import type { SettingRow, Visit } from './types';

export const DB_NAME = 'euro-passport-v1';

export type PassportDB = Dexie & {
  visits: EntityTable<Visit, 'id'>;
  settings: EntityTable<SettingRow, 'key'>;
};

export function createDB(name = DB_NAME): PassportDB {
  const db = new Dexie(name) as PassportDB;
  // 스키마를 바꿀 때는 버전을 올리고 upgrade()로 마이그레이션 + 테스트 필수 (CLAUDE.md)
  db.version(1).stores({
    visits: 'id, cityId, date, [cityId+date]',
    settings: 'key',
  });
  return db;
}

export const db = createDB();

export function newId(): string {
  return crypto.randomUUID();
}
