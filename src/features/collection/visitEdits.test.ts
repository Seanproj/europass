// @vitest-environment node
import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createDB, type PassportDB } from '../../db/db';
import type { Visit } from '../../db/types';
import { addPhotos, deleteVisit, moveVisitDate, removePhoto, updateVisit, withNights } from './visitEdits';

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

  it('머문 기간(박수)으로 떠난 날을 정한다: 1월 15일 + 2박 → 1월 17일', () => {
    expect(withNights('2014-01-15', 2)).toEqual({ endDate: '2014-01-17' });
    expect(withNights('2014-01-15', 0)).toEqual({ endDate: undefined });
    // 달과 해가 바뀌어도
    expect(withNights('2025-12-30', 3)).toEqual({ endDate: '2026-01-02' });
  });

  it('방문일을 옮기면 머문 기간은 그대로 두고 떠난 날도 같이 옮긴다', () => {
    expect(moveVisitDate({ date: '2025-12-20', endDate: '2025-12-23' }, '2014-01-15')).toEqual({
      date: '2014-01-15',
      endDate: '2014-01-18',
    });
    expect(moveVisitDate({ date: '2025-12-20' }, '2014-01-15')).toEqual({
      date: '2014-01-15',
      endDate: undefined,
    });
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
