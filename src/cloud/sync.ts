import type { PassportDB } from '../db/db';
import type { Profile, Visit } from '../db/types';
import type { Remote, RemoteVisit } from './types';

/** settings 'sync'에 두는 상태 */
export interface SyncState {
  userId: string;
  /** 서버에서 어디까지 받았는지 */
  cursor: string | null;
  lastSyncAt: number;
}

export interface SyncResult {
  pushed: number;
  pulled: number;
  deleted: number;
}

const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const MIME: Record<string, string> = Object.fromEntries(Object.entries(EXT).map(([m, e]) => [e, m]));

async function sha256(blob: Blob): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** 사진 Storage 경로: 내용(해시)으로 이름을 지어 같은 사진은 한 번만 올린다 */
export async function photoPath(userId: string, blob: Blob): Promise<string> {
  return `${userId}/${await sha256(blob)}.${EXT[blob.type] ?? 'jpg'}`;
}

/** 아직 올리지 않은 변경이 있는 기록 (새로 만들었거나, 올린 뒤 고쳤거나, 가져온 기록) */
export const isDirty = (v: Visit) => v.syncedAt === undefined || v.updatedAt > v.syncedAt;

export async function readSyncState(db: PassportDB): Promise<SyncState | null> {
  return ((await db.settings.get('sync'))?.value as SyncState | undefined) ?? null;
}

/** 올리지 않은 변경 수 (기록 + 삭제 표시) */
export async function pendingCount(db: PassportDB): Promise<number> {
  const visits = await db.visits.toArray();
  return visits.filter(isDirty).length + (await db.tombstones.count());
}

/**
 * 한 번 맞추기: 올리기(삭제 표시 → 바뀐 기록·사진 → 프로필) 다음 받기.
 * 어느 단계에서 실패해도(오프라인 등) 올리지 못한 변경은 그대로 남아 다음에 다시 올라간다 (= 오프라인 큐)
 */
export async function syncOnce(db: PassportDB, remote: Remote): Promise<SyncResult> {
  let state = await readSyncState(db);
  if (state?.userId !== remote.userId) {
    // 처음 로그인했거나 다른 계정: 이 기기의 기록을 모두 새로 올리고, 서버 것은 처음부터 받는다
    await db.transaction('rw', db.visits, db.tombstones, async () => {
      await db.visits.toCollection().modify((v) => {
        delete v.syncedAt;
      });
      await db.tombstones.clear();
    });
    state = { userId: remote.userId, cursor: null, lastSyncAt: 0 };
  }

  const result: SyncResult = { pushed: 0, pulled: 0, deleted: 0 };

  // 1. 삭제 표시
  const tombs = await db.tombstones.toArray();
  if (tombs.length) {
    await remote.pushVisits(
      tombs.map((t) => ({
        id: t.id,
        cityId: null,
        date: null,
        endDate: null,
        note: '',
        photos: [],
        legacy: null,
        createdAt: t.deletedAt,
        updatedAt: t.deletedAt,
        deleted: true,
      })),
    );
    await db.tombstones.bulkDelete(tombs.map((t) => t.id));
    result.pushed += tombs.length;
  }

  // 2. 바뀐 기록 (사진 먼저)
  const dirty = (await db.visits.toArray()).filter(isDirty);
  if (dirty.length) {
    const rows: RemoteVisit[] = [];
    for (const v of dirty) {
      const paths: string[] = [];
      for (const blob of v.photos) {
        const path = await photoPath(remote.userId, blob);
        await remote.uploadPhoto(path, blob);
        paths.push(path);
      }
      rows.push({
        id: v.id,
        cityId: v.cityId,
        date: v.date,
        endDate: v.endDate ?? null,
        note: v.note,
        photos: paths,
        legacy: v.legacy ?? null,
        createdAt: v.createdAt,
        updatedAt: v.updatedAt,
        deleted: false,
      });
    }
    await remote.pushVisits(rows);
    // 올리는 사이에 또 고쳤으면 그대로 남겨 다음에 다시 올린다
    const sent = new Map(rows.map((r) => [r.id, r.updatedAt]));
    await db.visits
      .where('id')
      .anyOf([...sent.keys()])
      .modify((v) => {
        if (v.updatedAt === sent.get(v.id)) v.syncedAt = v.updatedAt;
      });
    result.pushed += rows.length;
  }

  // 3. 프로필 (이름·홈 도시): 최근에 고친 쪽
  const local = (await db.settings.get('profile'))?.value as Profile | undefined;
  const remoteProfile = await remote.getProfile();
  if (local && (!remoteProfile || (local.updatedAt ?? 0) > remoteProfile.updatedAt)) {
    await remote.putProfile({
      name: local.name,
      homeCityId: local.homeCityId,
      updatedAt: local.updatedAt ?? 0,
    });
  } else if (remoteProfile && (!local || remoteProfile.updatedAt > (local.updatedAt ?? 0))) {
    await db.settings.put({
      key: 'profile',
      value: {
        name: remoteProfile.name,
        homeCityId: remoteProfile.homeCityId,
        updatedAt: remoteProfile.updatedAt,
      },
    });
  }

  // 4. 받기
  const { rows, cursor } = await remote.pullVisits(state.cursor);
  for (const r of rows) {
    const applied = await applyRemote(db, remote, r);
    if (applied === 'pulled') result.pulled++;
    if (applied === 'deleted') result.deleted++;
  }

  await db.settings.put({ key: 'sync', value: { userId: remote.userId, cursor, lastSyncAt: Date.now() } });
  return result;
}

/** 서버 기록 한 건을 이 기기에 반영 (더 최근 쪽이 이긴다) */
async function applyRemote(
  db: PassportDB,
  remote: Remote,
  r: RemoteVisit,
): Promise<'pulled' | 'deleted' | 'skipped'> {
  const local = await db.visits.get(r.id);
  const tomb = await db.tombstones.get(r.id);
  if (tomb && tomb.deletedAt >= r.updatedAt) return 'skipped';

  if (r.deleted) {
    if (!local || local.updatedAt > r.updatedAt) return 'skipped';
    await db.visits.delete(r.id);
    return 'deleted';
  }
  if (local && local.updatedAt > r.updatedAt) return 'skipped';
  if (local && local.updatedAt === r.updatedAt) {
    if (local.syncedAt !== r.updatedAt) await db.visits.update(r.id, { syncedAt: r.updatedAt });
    return 'skipped';
  }
  if (!r.cityId || !r.date) return 'skipped';

  // 이미 가진 사진은 다시 받지 않는다
  const have = new Map<string, Blob>();
  for (const b of local?.photos ?? []) have.set(await photoPath(remote.userId, b), b);
  const photos: Blob[] = [];
  for (const path of r.photos) {
    const cached = have.get(path);
    if (cached) photos.push(cached);
    else {
      const blob = await remote.downloadPhoto(path);
      const ext = path.split('.').pop() ?? 'jpg';
      photos.push(blob.type ? blob : new Blob([blob], { type: MIME[ext] ?? 'image/jpeg' }));
    }
  }

  const next: Visit = {
    id: r.id,
    cityId: r.cityId,
    date: r.date,
    ...(r.endDate ? { endDate: r.endDate } : {}),
    note: r.note,
    photos,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    ...(r.legacy ? { legacy: r.legacy } : {}),
    syncedAt: r.updatedAt,
  };
  // 사진을 받는 사이에 이 기기에서 고쳤으면 덮어쓰지 않는다
  await db.transaction('rw', db.visits, async () => {
    const now = await db.visits.get(r.id);
    if (now && now.updatedAt >= r.updatedAt) return;
    await db.visits.put(next);
  });
  return 'pulled';
}

/** 로그아웃: 동기화 상태만 지운다 (이 기기의 기록은 그대로) */
export async function forgetSync(db: PassportDB): Promise<void> {
  await db.settings.delete('sync');
}
