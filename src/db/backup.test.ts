// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createDB, type PassportDB } from './db';
import { strToU8, unzipSync } from 'fflate';
import { BackupFormatError, deleteAllData, exportBackup, importBackup, importV0Backup } from './backup';
import type { Visit } from './types';

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

const photo = (bytes: number[], type = 'image/jpeg') => new Blob([new Uint8Array(bytes)], { type });
const bytesOf = async (b: Blob) => [...new Uint8Array(await b.arrayBuffer())];

async function snapshot(d: PassportDB) {
  const visits = await d.visits.orderBy('id').toArray();
  return Promise.all(
    visits.map(async (v) => ({
      ...v,
      photos: await Promise.all(v.photos.map(async (p) => ({ type: p.type, bytes: await bytesOf(p) }))),
    })),
  );
}

describe('백업 zip', () => {
  const visits: Visit[] = [
    {
      id: 'v1',
      cityId: 'cz-prague',
      date: '2026-05-01',
      endDate: '2026-05-03',
      note: '카를교\n두 번째 줄',
      photos: [photo([0xff, 0xd8, 1, 2, 3]), photo([9, 8, 7], 'image/webp')],
      createdAt: 1,
      updatedAt: 2,
    },
    {
      id: 'v2',
      cityId: 'at-vienna',
      date: '2026-08-01',
      note: '',
      photos: [],
      createdAt: 3,
      updatedAt: 4,
      legacy: { mood: 'happy', rating: 5 },
    },
  ];

  it('백업 → 전체 삭제 → 복원 왕복 (사진 포함)', async () => {
    await db.visits.bulkPut(visits);
    await db.settings.put({ key: 'profile', value: { name: 'Sean', homeCityId: 'de-frankfurt' } });
    await db.settings.put({ key: 'migratedFromV0', value: { at: 1 } });
    await db.lensCache.put({ key: 'k', blob: photo([1]), createdAt: 1 });
    const before = await snapshot(db);

    const zip = await exportBackup(db, new Date('2026-10-14T00:00:00Z'));
    const files = unzipSync(zip);
    expect(Object.keys(files).sort()).toEqual(['backup.json', 'photos/v1-1.jpg', 'photos/v1-2.webp']);

    await deleteAllData(db);
    expect(await db.visits.count()).toBe(0);
    expect(await db.lensCache.count()).toBe(0);
    // 프로필과 v0 이전 표시는 남는다
    expect(await db.settings.get('profile')).toBeTruthy();
    expect(await db.settings.get('migratedFromV0')).toBeTruthy();

    const result = await importBackup(db, zip);
    expect(result).toEqual({ added: 2, updated: 0, skipped: 0, format: 'v1' });
    expect(await snapshot(db)).toEqual(before);
  });

  it('빈 DB의 새 기기로 복원하면 프로필도 옮겨진다', async () => {
    await db.visits.bulkPut(visits);
    await db.settings.put({ key: 'profile', value: { name: 'Sean', homeCityId: 'de-berlin' } });
    const zip = await exportBackup(db);
    const other = createDB(`test-backup-other-${n++}`);
    await other.open();
    try {
      await importBackup(other, zip);
      expect(await snapshot(other)).toEqual(await snapshot(db));
      expect((await other.settings.get('profile'))?.value).toEqual({ name: 'Sean', homeCityId: 'de-berlin' });
    } finally {
      other.close();
      await other.delete();
    }
  });

  it('같은 백업을 다시 가져와도 중복되지 않고, 이후에 고친 기록은 덮어쓰지 않는다', async () => {
    await db.visits.bulkPut(visits);
    const zip = await exportBackup(db);
    await db.visits.update('v1', { note: '고침', updatedAt: 100 });
    expect(await importBackup(db, zip)).toEqual({ added: 0, updated: 0, skipped: 2, format: 'v1' });
    expect((await db.visits.get('v1'))?.note).toBe('고침');
  });

  it('v0 JSON 파일도 같은 입구로 가져온다', async () => {
    const result = await importBackup(db, strToU8(JSON.stringify(backup)));
    expect(result.format).toBe('v0');
    expect(result.added).toBe(2);
  });

  it('깨진 파일은 거절한다', async () => {
    await expect(importBackup(db, new Uint8Array([0x50, 0x4b, 0, 0]))).rejects.toBeInstanceOf(
      BackupFormatError,
    );
    await expect(importBackup(db, strToU8('hello'))).rejects.toBeInstanceOf(BackupFormatError);
  });
});
