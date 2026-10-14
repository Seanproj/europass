// @vitest-environment node
import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createDB, type PassportDB } from '../../db/db';
import type { Visit } from '../../db/types';
import { addPhotos, deleteVisit, normalizeRange, removePhoto, updateVisit } from './visitEdits';

let db: PassportDB;
const base: Visit = {
  id: 'v1',
  cityId: 'cz-prague',
  date: '2025-12-20',
  note: '',
  photos: [],
  createdAt: 1,
  updatedAt: 1,
};

beforeEach(async () => {
  db = createDB(`edits-${Math.random()}`);
  await db.visits.put(base);
});
afterEach(async () => {
  db.close();
  await Dexie.delete(db.name);
});

describe('방문 기록 편집', () => {
  it('메모는 다듬어서 140자까지', async () => {
    await updateVisit(db, 'v1', { note: `  ${'가'.repeat(200)}  ` });
    const v = await db.visits.get('v1');
    expect(v!.note).toHaveLength(140);
    expect(v!.updatedAt).toBeGreaterThan(1);
  });

  it('종료일은 시작일 다음 날부터만 남긴다', () => {
    expect(normalizeRange('2025-12-20', '2025-12-23')).toEqual({ date: '2025-12-20', endDate: '2025-12-23' });
    expect(normalizeRange('2025-12-20', '2025-12-20')).toEqual({ date: '2025-12-20', endDate: undefined });
    expect(normalizeRange('2025-12-20', '2025-12-01')).toEqual({ date: '2025-12-20', endDate: undefined });
  });

  it('사진은 방문당 10장까지, 지우기도 된다', async () => {
    const files = Array.from({ length: 12 }, (_, i) => new Blob([`photo${i}`], { type: 'image/jpeg' }));
    const r = await addPhotos(db, base, files);
    expect(r).toMatchObject({ added: 10, skipped: 2 });
    const v = (await db.visits.get('v1'))!;
    expect(v.photos).toHaveLength(10);
    await removePhoto(db, v, 0);
    expect((await db.visits.get('v1'))!.photos).toHaveLength(9);
  });

  it('기록 삭제', async () => {
    await deleteVisit(db, 'v1');
    expect(await db.visits.count()).toBe(0);
  });
});
