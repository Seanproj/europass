// @vitest-environment node
import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createDB, type PassportDB } from '../../db/db';
import { checkIn, undoCheckIn } from './checkin';

let db: PassportDB;
beforeEach(() => {
  db = createDB(`checkin-${Math.random()}`);
});
afterEach(async () => {
  db.close();
  await Dexie.delete(db.name);
});

describe('원탭 체크인', () => {
  it('오늘 날짜로 바로 기록한다 (필수 입력 없음)', async () => {
    const r = await checkIn(db, 'cz-prague', '2026-10-14');
    expect(r.kind).toBe('added');
    if (r.kind !== 'added') return;
    expect(r.nth).toBe(1);
    expect(r.first).toBe(true);
    expect(r.previous).toBeUndefined();
    expect(await db.visits.get(r.visit.id)).toMatchObject({
      cityId: 'cz-prague',
      date: '2026-10-14',
      note: '',
      photos: [],
    });
  });

  it('다른 날 다시 가면 새 기록이 쌓이고 몇 번째 방문인지 알려준다', async () => {
    await checkIn(db, 'cz-prague', '2025-04-30');
    await checkIn(db, 'cz-prague', '2025-12-20');
    const r = await checkIn(db, 'cz-prague', '2026-10-14');
    expect(r.kind === 'added' && r.nth).toBe(3);
    expect(r.kind === 'added' && r.previous?.date).toBe('2025-12-20');
    expect(await db.visits.where('cityId').equals('cz-prague').count()).toBe(3);
  });

  it('지난 날짜로 소급하면 날짜순으로 센다 (도장의 로마 숫자와 같은 기준)', async () => {
    await checkIn(db, 'cz-prague', '2026-03-08');
    await checkIn(db, 'cz-prague', '2026-09-20');
    const r = await checkIn(db, 'cz-prague', '2025-05-01');
    if (r.kind !== 'added') throw new Error('added가 아님');
    expect(r.first).toBe(false);
    expect(r.nth).toBe(1);
    // 아래 깔리는 도장은 가장 최근 기록, 순번은 3번째로 밀린다
    expect(r.previous?.date).toBe('2026-09-20');
    expect(r.previousNth).toBe(3);
  });

  it('다시 방문 기록은 머문 기간까지 함께 남긴다', async () => {
    const r = await checkIn(db, 'cz-prague', '2014-01-15', '2014-01-17');
    expect(await db.visits.get(r.visit.id)).toMatchObject({ date: '2014-01-15', endDate: '2014-01-17' });
    // 당일이면 떠난 날을 남기지 않는다
    const same = await checkIn(db, 'fr-paris', '2014-02-01', '2014-02-01');
    expect((await db.visits.get(same.visit.id))?.endDate).toBeUndefined();
  });

  it('같은 날 같은 도시는 중복 대신 기존 기록을 돌려준다', async () => {
    const first = await checkIn(db, 'cz-prague', '2026-10-14');
    const again = await checkIn(db, 'cz-prague', '2026-10-14');
    expect(again.kind).toBe('duplicate');
    expect(again.visit.id).toBe(first.visit.id);
    expect(await db.visits.count()).toBe(1);
  });

  it('되돌리기는 방금 만든 기록만 지운다', async () => {
    const old = await checkIn(db, 'cz-prague', '2025-04-30');
    const r = await checkIn(db, 'cz-prague', '2026-10-14');
    await undoCheckIn(db, r.visit.id);
    expect((await db.visits.toArray()).map((v) => v.id)).toEqual([old.visit.id]);
  });
});
