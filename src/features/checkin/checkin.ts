import { newId, removeVisits, type PassportDB } from '../../db/db';
import type { Visit } from '../../db/types';
import { todayISO } from '../../lib/date';
import { byNewest, visitRank } from '../../db/selectors';

export type CheckInResult =
  /**
   * 새 기록. first = 이 도시의 첫 기록, nth = 날짜순으로 몇 번째 방문인지 (소급 기록이면 첫 기록이 아니어도 1일 수 있다).
   * previous = 그 아래 깔릴 가장 최근 기록과 그 순번
   */
  | {
      kind: 'added';
      visit: Visit;
      first: boolean;
      nth: number;
      previous: Visit | undefined;
      previousNth: number;
    }
  /** 같은 날 같은 도시는 새로 만들지 않고 기존 기록을 돌려준다 */
  | { kind: 'duplicate'; visit: Visit };

/** 원탭 체크인: 필수 입력 없이 오늘 날짜로 기록한다 */
/** endDate를 주면 머문 기간까지 함께 기록한다 (다시 방문 기록) */
export async function checkIn(
  db: PassportDB,
  cityId: string,
  date = todayISO(),
  endDate?: string,
): Promise<CheckInResult> {
  return db.transaction('rw', db.visits, async () => {
    const same = await db.visits.where('[cityId+date]').equals([cityId, date]).first();
    if (same) return { kind: 'duplicate', visit: same };
    const before = await db.visits.where('cityId').equals(cityId).toArray();
    const now = Date.now();
    const visit: Visit = { id: newId(), cityId, date, note: '', photos: [], createdAt: now, updatedAt: now };
    if (endDate && endDate > date) visit.endDate = endDate;
    await db.visits.add(visit);
    const all = [...before, visit];
    const previous = before.sort(byNewest)[0];
    return {
      kind: 'added',
      visit,
      first: before.length === 0,
      nth: visitRank(all, visit),
      previous,
      previousNth: previous ? visitRank(all, previous) : 0,
    };
  });
}

/** 토스트의 "되돌리기": 방금 만든 기록만 지운다 */
export async function undoCheckIn(db: PassportDB, visitId: string): Promise<void> {
  await removeVisits(db, [visitId]);
}
