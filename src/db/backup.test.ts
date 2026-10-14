// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createDB, type PassportDB } from './db';
import { BackupFormatError, importV0Backup } from './backup';

let db: PassportDB;
let n = 0;

beforeEach(async () => {
  db = createDB(`test-backup-${n++}`);
  await db.open();
});

afterEach(async () => {
  db.close();
  await db.delete();
});

const backup = {
  app: 'euro-passport',
  version: 1,
  exportedAt: '2026-10-01T00:00:00Z',
  settings: { name: 'Sean', home: 'frankfurt' },
  visits: [
    {
      id: 'a',
      cityId: 'vienna',
      date: '2026-05-02',
      mood: '😊',
      rating: 4,
      title: '',
      note: '자허토르테',
      photos: [],
      updatedAt: 10,
    },
    { id: 'b', cityId: 'vienna', date: '2026-08-01', rating: 5, updatedAt: 20 },
    { broken: true },
  ],
};

describe('importV0Backup', () => {
  it('v0 백업 JSON 문자열을 가져온다 (잘못된 항목은 건너뜀)', async () => {
    const result = await importV0Backup(db, JSON.stringify(backup));
    expect(result.added).toBe(2);
    expect(await db.visits.where('cityId').equals('at-vienna').count()).toBe(2);
    expect((await db.settings.get('profile'))?.value).toEqual({ name: 'Sean', homeCityId: 'de-frankfurt' });
  });

  it('두 번 가져와도 중복되지 않는다', async () => {
    await importV0Backup(db, backup);
    const again = await importV0Backup(db, backup);
    expect(again).toEqual({ added: 0, updated: 0, skipped: 2 });
    expect(await db.visits.count()).toBe(2);
  });

  it('다른 형식은 거절한다', async () => {
    await expect(importV0Backup(db, '{not json')).rejects.toBeInstanceOf(BackupFormatError);
    await expect(importV0Backup(db, { app: 'other', visits: [] })).rejects.toBeInstanceOf(BackupFormatError);
  });
});
