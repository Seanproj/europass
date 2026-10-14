// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createDB, type PassportDB } from '../../db/db';
import { checkIn, undoCheckIn } from '../checkin/checkin';
import { markBadgesSeen, takeNewBadges, unseeBadges } from './badgeSync';

let db: PassportDB;
let n = 0;

beforeEach(async () => {
  db = createDB(`test-badges-${n++}`);
  await db.open();
});

afterEach(async () => {
  db.close();
  await db.delete();
});

const ids = (list: { id: string }[]) => list.map((b) => b.id);

describe('badgeSync', () => {
  it('앱 시작 때 표시해 두면 첫 도장부터 알린다', async () => {
    await markBadgesSeen(db);
    await checkIn(db, 'cz-prague', '2025-05-01');
    expect(ids(await takeNewBadges(db))).toEqual(['cities-1']);
    // 같은 배지를 두 번 알리지 않는다
    expect(await takeNewBadges(db)).toEqual([]);
    await checkIn(db, 'cz-prague', '2025-06-01');
    expect(ids(await takeNewBadges(db))).toEqual(['again']);
  });

  it('알림 기록이 없으면 이미 얻은 배지는 조용히 넘어간다 (v0에서 옮겨온 직후)', async () => {
    await checkIn(db, 'cz-prague', '2025-05-01');
    await checkIn(db, 'cz-prague', '2025-06-01');
    expect(await takeNewBadges(db)).toEqual([]);
    await checkIn(db, 'no-tromso', '2025-06-02');
    expect(ids(await takeNewBadges(db))).toEqual(['arctic']);
  });

  it('가져오기로 얻은 배지는 알리지 않는다', async () => {
    await markBadgesSeen(db);
    await checkIn(db, 'cz-prague', '2025-05-01');
    await markBadgesSeen(db);
    expect(await takeNewBadges(db)).toEqual([]);
  });

  it('되돌리기 후 다시 얻으면 다시 알린다', async () => {
    await markBadgesSeen(db);
    const r = await checkIn(db, 'cz-prague', '2025-05-01');
    const got = ids(await takeNewBadges(db));
    expect(got).toEqual(['cities-1']);
    if (r.kind === 'added') await undoCheckIn(db, r.visit.id);
    await unseeBadges(db, got);
    await checkIn(db, 'cz-prague', '2025-05-02');
    expect(ids(await takeNewBadges(db))).toEqual(['cities-1']);
  });
});
