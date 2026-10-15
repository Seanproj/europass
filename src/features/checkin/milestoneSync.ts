import type { PassportDB } from '../../db/db';
import { earnedMilestones, newMilestones, type Milestone } from './milestones';

async function readSeen(db: PassportDB): Promise<string[]> {
  const row = await db.settings.get('milestonesSeen');
  return Array.isArray(row?.value) ? (row.value as string[]) : [];
}

/**
 * 체크인 직후: 이 방문으로 새로 이룬 기념을 돌려주고 "알림" 기록에 더한다.
 * 체크인 전에 이미 이룬 것도 함께 기록해 두어, 기록을 지웠다가 다시 이뤄도 다시 알리지 않는다
 */
export async function takeNewMilestones(db: PassportDB, visitId: string): Promise<Milestone[]> {
  return db.transaction('rw', db.visits, db.settings, async () => {
    const after = await db.visits.toArray();
    if (!after.some((v) => v.id === visitId)) return [];
    const before = after.filter((v) => v.id !== visitId);
    const seen = await readSeen(db);
    const announce = newMilestones(before, after, seen);
    const next = new Set([
      ...seen,
      ...earnedMilestones(before).map((m) => m.id),
      ...announce.map((m) => m.id),
    ]);
    await db.settings.put({ key: 'milestonesSeen', value: [...next] });
    return announce;
  });
}

/** 체크인을 되돌리면 그때 알린 기념을 "아직 안 알림"으로 돌린다 (다시 이루면 다시 알림) */
export async function unseeMilestones(db: PassportDB, ids: string[]): Promise<void> {
  if (!ids.length) return;
  const drop = new Set(ids);
  await db.transaction('rw', db.settings, async () => {
    const seen = await readSeen(db);
    await db.settings.put({ key: 'milestonesSeen', value: seen.filter((id) => !drop.has(id)) });
  });
}
