// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createDB, type PassportDB } from '../../db/db';
import { deleteAllData } from '../../db/backup';
import { checkIn, undoCheckIn } from './checkin';
import { takeNewMilestones, unseeMilestones } from './milestoneSync';

let db: PassportDB;
let n = 0;

beforeEach(async () => {
  db = createDB(`test-milestones-${n++}`);
  await db.open();
});

afterEach(async () => {
  db.close();
  await db.delete();
});

const ids = (list: { id: string }[]) => list.map((m) => m.id);

async function stamp(cityId: string, date: string): Promise<string> {
  const r = await checkIn(db, cityId, date);
  if (r.kind !== 'added') throw new Error('duplicate');
  return r.visit.id;
}

describe('milestoneSync', () => {
  it('체크인 하나로 새로 이룬 기념만, 한 번씩', async () => {
    const a = await stamp('cz-prague', '2025-05-01');
    expect(ids(await takeNewMilestones(db, a))).toEqual(['country:CZ']);
    expect(await takeNewMilestones(db, a)).toEqual([]);
    const b = await stamp('cz-brno', '2025-05-02');
    expect(await takeNewMilestones(db, b)).toEqual([]);
  });

  it('체크인 전에 있던 기록(가져오기 등)으로 이룬 것은 알리지 않는다', async () => {
    for (let i = 1; i <= 10; i++) await stamp('cz-prague', `2025-01-${String(i).padStart(2, '0')}`);
    const v = await stamp('at-vienna', '2025-02-01');
    // 10개째는 이미 지났고 체코도 이미 있었다: 오스트리아만
    expect(ids(await takeNewMilestones(db, v))).toEqual(['country:AT']);
    // 그때 함께 "알림"으로 기록돼, 지웠다가 다시 이뤄도 조용하다
    const seen = (await db.settings.get('milestonesSeen'))?.value as string[];
    expect(seen).toEqual(expect.arrayContaining(['country:CZ', 'count:10', 'country:AT']));
  });

  it('되돌리면 다시 이뤘을 때 다시 알린다', async () => {
    const a = await stamp('cz-prague', '2025-05-01');
    const got = await takeNewMilestones(db, a);
    await undoCheckIn(db, a);
    await unseeMilestones(db, ids(got));
    const again = await stamp('cz-prague', '2025-05-01');
    expect(ids(await takeNewMilestones(db, again))).toEqual(['country:CZ']);
  });

  it('이미 되돌려 없어진 방문이면 아무것도 알리지 않는다', async () => {
    const a = await stamp('cz-prague', '2025-05-01');
    await undoCheckIn(db, a);
    expect(await takeNewMilestones(db, a)).toEqual([]);
    expect(await db.settings.get('milestonesSeen')).toBeUndefined();
  });

  it('모든 기록을 지우면 처음부터 다시 기념한다', async () => {
    const a = await stamp('cz-prague', '2025-05-01');
    await takeNewMilestones(db, a);
    await deleteAllData(db);
    const b = await stamp('cz-prague', '2025-06-01');
    expect(ids(await takeNewMilestones(db, b))).toEqual(['country:CZ']);
  });
});
