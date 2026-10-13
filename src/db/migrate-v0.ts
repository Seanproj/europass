import type { PassportDB } from './db';
import type { Profile, Visit } from './types';
import { mapV0CityId } from './v0-city-map';

/** v0 앱이 쓰던 IndexedDB 이름 (stores: visits, settings) */
export const V0_DB_NAME = 'euro-passport';

export interface V0Visit {
  id: string;
  cityId: string;
  date: string;
  mood?: string;
  rating?: number;
  title?: string;
  note?: string;
  photos?: string[];
  updatedAt?: number;
}

export interface V0Profile {
  name?: string;
  home?: string;
}

export interface MigrationResult {
  added: number;
  updated: number;
  skipped: number;
}

/** "data:image/jpeg;base64,...." → Blob */
export function dataUrlToBlob(dataUrl: string): Blob {
  const comma = dataUrl.indexOf(',');
  const header = dataUrl.slice(5, comma);
  const type = header.split(';')[0] || 'application/octet-stream';
  const body = dataUrl.slice(comma + 1);
  if (header.endsWith(';base64')) {
    const bin = atob(body);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new Blob([bytes], { type });
  }
  return new Blob([decodeURIComponent(body)], { type });
}

export function isV0Visit(x: unknown): x is V0Visit {
  if (!x || typeof x !== 'object') return false;
  const v = x as Record<string, unknown>;
  return typeof v.id === 'string' && typeof v.cityId === 'string' && typeof v.date === 'string';
}

export function convertV0Visit(v: V0Visit): Visit {
  const ts = typeof v.updatedAt === 'number' ? v.updatedAt : Date.now();
  const legacy: Visit['legacy'] = {};
  if (v.mood) legacy.mood = v.mood;
  if (typeof v.rating === 'number') legacy.rating = v.rating;
  if (v.title) legacy.title = v.title;
  return {
    id: v.id,
    cityId: mapV0CityId(v.cityId),
    date: v.date,
    // v0의 한 줄 요약과 일기를 하나의 메모로 합쳐 내용이 사라지지 않게 함
    note: [v.title, v.note].filter((s): s is string => !!s && s.trim() !== '').join('\n'),
    photos: (v.photos ?? []).filter((p) => typeof p === 'string' && p.startsWith('data:')).map(dataUrlToBlob),
    createdAt: ts,
    updatedAt: ts,
    ...(Object.keys(legacy).length ? { legacy } : {}),
  };
}

export function convertV0Profile(p: V0Profile): Profile {
  return {
    name: p.name?.trim() || 'Traveler',
    homeCityId: mapV0CityId(p.home || 'frankfurt'),
  };
}

/**
 * 변환된 방문 기록을 v1 DB에 합친다.
 * 없으면 추가, 있으면 가져온 쪽이 더 최근에 수정된 경우에만 덮어씀 (사용자가 v1에서 고친 내용 보호)
 */
export async function mergeVisits(db: PassportDB, incoming: Visit[]): Promise<MigrationResult> {
  const result: MigrationResult = { added: 0, updated: 0, skipped: 0 };
  await db.transaction('rw', db.visits, async () => {
    const existing = await db.visits.bulkGet(incoming.map((v) => v.id));
    const toPut: Visit[] = [];
    incoming.forEach((v, i) => {
      const cur = existing[i];
      if (!cur) {
        toPut.push(v);
        result.added++;
      } else if (v.updatedAt > cur.updatedAt) {
        toPut.push({ ...v, createdAt: cur.createdAt });
        result.updated++;
      } else {
        result.skipped++;
      }
    });
    await db.visits.bulkPut(toPut);
  });
  return result;
}

/** v0 DB를 연다. 존재하지 않으면 null — 이 과정에서 빈 DB를 새로 만들지 않는다 */
function openV0(factory: IDBFactory): Promise<IDBDatabase | null> {
  return new Promise((resolve, reject) => {
    let creating = false;
    const req = factory.open(V0_DB_NAME);
    req.onupgradeneeded = (e) => {
      if (e.oldVersion === 0) {
        creating = true;
        req.transaction?.abort();
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = (e) => {
      if (creating) {
        e.preventDefault();
        resolve(null);
      } else reject(req.error);
    };
    req.onblocked = () => resolve(null);
  });
}

function readAll<T>(idb: IDBDatabase, store: string): Promise<T[]> {
  return new Promise((resolve, reject) => {
    if (!idb.objectStoreNames.contains(store)) return resolve([]);
    const req = idb.transaction(store, 'readonly').objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result as T[]);
    req.onerror = () => reject(req.error);
  });
}

function readKey<T>(idb: IDBDatabase, store: string, key: string): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    if (!idb.objectStoreNames.contains(store)) return resolve(undefined);
    const req = idb.transaction(store, 'readonly').objectStore(store).get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error);
  });
}

/**
 * v0 → v1 1회 마이그레이션. v0 DB는 지우지 않고 그대로 둔다 (백업 겸 /v0/ 페이지가 계속 사용).
 * 반환: 실행했으면 결과, 이미 했거나 v0 데이터가 없으면 null
 */
export async function migrateFromV0(
  db: PassportDB,
  factory: IDBFactory = indexedDB,
): Promise<MigrationResult | null> {
  if (await db.settings.get('migratedFromV0')) return null;

  const v0 = await openV0(factory);
  if (!v0) return null;
  try {
    const rawVisits = await readAll<unknown>(v0, 'visits');
    const profile = await readKey<V0Profile>(v0, 'settings', 'profile');

    const result = await mergeVisits(db, rawVisits.filter(isV0Visit).map(convertV0Visit));
    if (profile && !(await db.settings.get('profile'))) {
      await db.settings.put({ key: 'profile', value: convertV0Profile(profile) });
    }
    await db.settings.put({
      key: 'migratedFromV0',
      value: { at: Date.now(), ...result },
    });
    return result;
  } finally {
    v0.close();
  }
}
