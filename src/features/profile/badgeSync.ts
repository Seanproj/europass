import type { PassportDB } from '../../db/db';
import { BADGES, badgesToAnnounce, evaluateBadges, type Badge } from './badges';

async function earnedIds(db: PassportDB): Promise<string[]> {
  return evaluateBadges(await db.visits.toArray())
    .filter((s) => s.earned)
    .map((s) => s.badge.id);
}

async function readSeen(db: PassportDB): Promise<string[] | null> {
  const row = await db.settings.get('badgesSeen');
  return Array.isArray(row?.value) ? (row.value as string[]) : null;
}

/**
 * 체크인 직후: 새로 얻은 배지를 돌려주고 "알림" 기록에 더한다.
 * 알림 기록이 아직 없으면(처음) 지금까지 얻은 것은 조용히 기록만 한다
 */
export async function takeNewBadges(db: PassportDB): Promise<Badge[]> {
  return db.transaction('rw', db.visits, db.settings, async () => {
    const { announce, seen } = badgesToAnnounce(await earnedIds(db), await readSeen(db));
    await db.settings.put({ key: 'badgesSeen', value: seen });
    return announce.map((id) => BADGES.find((b) => b.id === id)!);
  });
}

/** 가져오기·옮기기처럼 체크인이 아닌 길로 얻은 배지는 알리지 않고 기록만 한다 */
export async function markBadgesSeen(db: PassportDB): Promise<void> {
  await db.transaction('rw', db.visits, db.settings, async () => {
    const seen = new Set([...((await readSeen(db)) ?? []), ...(await earnedIds(db))]);
    await db.settings.put({ key: 'badgesSeen', value: [...seen] });
  });
}

/** 체크인을 되돌리면 그때 알리려던 배지를 "아직 안 알림"으로 돌린다 (다시 얻으면 다시 알림) */
export async function unseeBadges(db: PassportDB, ids: string[]): Promise<void> {
  if (!ids.length) return;
  const drop = new Set(ids);
  await db.transaction('rw', db.settings, async () => {
    const seen = await readSeen(db);
    if (seen) await db.settings.put({ key: 'badgesSeen', value: seen.filter((id) => !drop.has(id)) });
  });
}
