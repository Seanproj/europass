// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createDB, type PassportDB } from './db';
import { dataUrlToBlob, migrateFromV0, V0_DB_NAME, type V0Visit } from './migrate-v0';

// 1x1 투명 PNG
const PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

/** v0 앱과 똑같은 구조로 v0 DB를 만든다 */
function seedV0(visits: V0Visit[], profile?: { name: string; home: string }): Promise<void> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(V0_DB_NAME, 1);
    req.onupgradeneeded = () => {
      const idb = req.result;
      idb.createObjectStore('visits', { keyPath: 'id' }).createIndex('cityId', 'cityId');
      idb.createObjectStore('settings');
    };
    req.onsuccess = () => {
      const idb = req.result;
      const tx = idb.transaction(['visits', 'settings'], 'readwrite');
      visits.forEach((v) => tx.objectStore('visits').put(v));
      if (profile) tx.objectStore('settings').put(profile, 'profile');
      tx.oncomplete = () => {
        idb.close();
        resolve();
      };
      tx.onerror = () => reject(tx.error);
    };
    req.onerror = () => reject(req.error);
  });
}

function deleteIDB(name: string): Promise<void> {
  return new Promise((resolve) => {
    const req = indexedDB.deleteDatabase(name);
    req.onsuccess = req.onerror = req.onblocked = () => resolve();
  });
}

const V0_SAMPLE: V0Visit[] = [
  {
    id: 'v1',
    cityId: 'prague',
    date: '2025-04-30',
    mood: '🤩',
    rating: 5,
    title: '카를교',
    note: '비가 왔지만 좋았다',
    photos: [PNG],
    updatedAt: 1000,
  },
  {
    id: 'v2',
    cityId: 'prague',
    date: '2025-12-20',
    mood: '😊',
    rating: 4,
    title: '',
    note: '크리스마스 마켓',
    photos: [],
    updatedAt: 2000,
  },
  { id: 'v3', cityId: 'paris', date: '2026-03-14', rating: 5, updatedAt: 3000 },
];

let db: PassportDB;
let n = 0;

beforeEach(async () => {
  db = createDB(`test-migrate-${n++}`);
  await db.open();
});

afterEach(async () => {
  db.close();
  await deleteIDB(db.name);
  await deleteIDB(V0_DB_NAME);
});

describe('migrateFromV0', () => {
  it('v0가 없으면 아무것도 하지 않고, 빈 v0 DB를 만들지도 않는다', async () => {
    expect(await migrateFromV0(db)).toBeNull();
    const names = (await indexedDB.databases()).map((d) => d.name);
    expect(names).not.toContain(V0_DB_NAME);
    expect(await db.settings.get('migratedFromV0')).toBeUndefined();
  });

  it('v0 방문 기록과 프로필을 모두 옮긴다 (같은 도시 여러 번 포함)', async () => {
    await seedV0(V0_SAMPLE, { name: 'Sean', home: 'munich' });
    const result = await migrateFromV0(db);
    expect(result).toEqual({ added: 3, updated: 0, skipped: 0 });

    const visits = await db.visits.toArray();
    expect(visits).toHaveLength(3);
    expect(await db.visits.where('cityId').equals('cz-prague').count()).toBe(2);

    const v1 = await db.visits.get('v1');
    expect(v1?.note).toBe('카를교\n비가 왔지만 좋았다');
    expect(v1?.legacy).toEqual({ mood: '🤩', rating: 5, title: '카를교' });
    expect(v1?.photos).toHaveLength(1);
    expect(v1?.photos[0]?.type).toBe('image/png');
    expect(v1?.createdAt).toBe(1000);

    expect((await db.visits.get('v2'))?.note).toBe('크리스마스 마켓');
    expect((await db.settings.get('profile'))?.value).toEqual({ name: 'Sean', homeCityId: 'de-munich' });
    expect(await db.settings.get('migratedFromV0')).toBeDefined();
  });

  it('한 번만 실행된다', async () => {
    await seedV0(V0_SAMPLE);
    await migrateFromV0(db);
    expect(await migrateFromV0(db)).toBeNull();
    expect(await db.visits.count()).toBe(3);
  });

  it('v0 DB는 지우지 않고 그대로 둔다', async () => {
    await seedV0(V0_SAMPLE);
    await migrateFromV0(db);
    const names = (await indexedDB.databases()).map((d) => d.name);
    expect(names).toContain(V0_DB_NAME);
  });

  it('v1에서 더 최근에 고친 기록은 덮어쓰지 않는다', async () => {
    await db.visits.put({
      id: 'v3',
      cityId: 'fr-paris',
      date: '2026-03-14',
      note: 'v1에서 고친 메모',
      photos: [],
      createdAt: 3000,
      updatedAt: 9999,
    });
    await seedV0(V0_SAMPLE);
    const result = await migrateFromV0(db);
    expect(result).toEqual({ added: 2, updated: 0, skipped: 1 });
    expect((await db.visits.get('v3'))?.note).toBe('v1에서 고친 메모');
  });

  it('이미 v1 프로필이 있으면 유지한다', async () => {
    await db.settings.put({ key: 'profile', value: { name: '현재', homeCityId: 'de-berlin' } });
    await seedV0([], { name: '예전', home: 'munich' });
    await migrateFromV0(db);
    expect((await db.settings.get('profile'))?.value).toEqual({ name: '현재', homeCityId: 'de-berlin' });
  });
});

describe('dataUrlToBlob', () => {
  it('base64 data URL을 Blob으로 바꾼다', async () => {
    const blob = dataUrlToBlob(PNG);
    expect(blob.type).toBe('image/png');
    expect(blob.size).toBeGreaterThan(50);
  });
});
