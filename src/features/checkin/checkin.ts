import { newId, removeVisits, type PassportDB } from '../../db/db';
import type { Visit } from '../../db/types';
import { todayISO } from '../../lib/date';

export type CheckInResult =
  /** 새 기록. nth = 이 도시의 몇 번째 방문인지 */
  | { kind: 'added'; visit: Visit; nth: number; previous: Visit | undefined }
  /** 같은 날 같은 도시는 새로 만들지 않고 기존 기록을 돌려준다 */
  | { kind: 'duplicate'; visit: Visit };

/** 원탭 체크인: 필수 입력 없이 오늘 날짜로 기록한다 */
export async function checkIn(db: PassportDB, cityId: string, date = todayISO()): Promise<CheckInResult> {
  return db.transaction('rw', db.visits, async () => {
    const same = await db.visits.where('[cityId+date]').equals([cityId, date]).first();
    if (same) return { kind: 'duplicate', visit: same };
    const before = await db.visits.where('cityId').equals(cityId).toArray();
    const now = Date.now();
    const visit: Visit = { id: newId(), cityId, date, note: '', photos: [], createdAt: now, updatedAt: now };
    await db.visits.add(visit);
    const previous = before.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt)[0];
    return { kind: 'added', visit, nth: before.length + 1, previous };
  });
}

/** 토스트의 "되돌리기": 방금 만든 기록만 지운다 */
export async function undoCheckIn(db: PassportDB, visitId: string): Promise<void> {
  await removeVisits(db, [visitId]);
}
