// @vitest-environment node
import Dexie from 'dexie';
import { afterEach, describe, expect, it } from 'vitest';
import { createDB, removeVisits } from './db';

const NAME = 'upgrade-test';

afterEach(async () => {
  await Dexie.delete(NAME);
});

/** Phase 1(스키마 v1) 앱이 만든 DB를 그대로 흉내 낸다 */
async function seedV1() {
  const old = new Dexie(NAME);
  old.version(1).stores({ visits: 'id, cityId, date, [cityId+date]', settings: 'key' });
  await old.table('visits').bulkPut([
    {
      id: 'a',
      cityId: 'prague',
      date: '2025-05-01',
      note: '첫 방문',
      photos: [],
      createdAt: 1,
      updatedAt: 1,
    },
    { id: 'b', cityId: 'prague', date: '2026-02-01', note: '', photos: [], createdAt: 2, updatedAt: 2 },
    { id: 'c', cityId: 'malta', date: '2026-03-01', note: '', photos: [], createdAt: 3, updatedAt: 3 },
    {
      id: 'd',
      cityId: 'unknown-place',
      date: '2026-04-01',
      note: '',
      photos: [],
      createdAt: 4,
      updatedAt: 4,
    },
  ]);
  await old.table('settings').put({ key: 'profile', value: { name: 'Sean', homeCityId: 'frankfurt' } });
  await old.table('settings').put({ key: 'migratedFromV0', value: { at: 1 } });
  old.close();
}

describe('DB v1 → v2 업그레이드', () => {
  it('v0 도시 id를 v1 id로 바꾸고 나머지 필드는 그대로 둔다', async () => {
    await seedV1();
    const db = createDB(NAME);
    const visits = await db.visits.orderBy('id').toArray();
    expect(visits.map((v) => v.cityId)).toEqual(['cz-prague', 'cz-prague', 'mt-valletta', 'unknown-place']);
    expect(visits[0]).toMatchObject({ note: '첫 방문', date: '2025-05-01', createdAt: 1, updatedAt: 1 });
    expect(await db.visits.where('cityId').equals('cz-prague').count()).toBe(2);
    expect((await db.settings.get('profile'))?.value).toEqual({ name: 'Sean', homeCityId: 'de-frankfurt' });
    expect(await db.settings.get('migratedFromV0')).toBeDefined();
    db.close();
  });

  it('새로 만든 DB는 최신 버전(v4)으로 열리고 렌즈 캐시·삭제 표시 테이블이 있다', async () => {
    const db = createDB(NAME);
    await db.open();
    expect(db.verno).toBe(4);
    await db.tombstones.put({ id: 'x', deletedAt: 1 });
    await db.lensCache.put({ key: 'cz-prague|light|v1', blob: new Blob(['x']), createdAt: 1 });
    expect(await db.lensCache.count()).toBe(1);
    db.close();
  });

  it('v2 → v3 업그레이드에서 방문 기록과 설정이 그대로 남는다', async () => {
    const v2 = new Dexie(NAME);
    v2.version(2).stores({ visits: 'id, cityId, date, [cityId+date]', settings: 'key' });
    await v2.table('visits').put({
      id: 'a',
      cityId: 'cz-prague',
      date: '2026-01-01',
      note: '메모',
      photos: [],
      createdAt: 1,
      updatedAt: 1,
    });
    await v2.table('settings').put({ key: 'profile', value: { name: 'Sean', homeCityId: 'de-frankfurt' } });
    v2.close();
    const db = createDB(NAME);
    expect(await db.visits.get('a')).toMatchObject({ cityId: 'cz-prague', note: '메모' });
    expect((await db.settings.get('profile'))?.value).toEqual({ name: 'Sean', homeCityId: 'de-frankfurt' });
    expect(await db.lensCache.count()).toBe(0);
    db.close();
  });
});

describe('DB v3 → v4 업그레이드 (Phase 9)', () => {
  it('기존 방문 기록·사진·설정은 그대로, 삭제 표시 테이블만 생긴다', async () => {
    const old = new Dexie(NAME);
    old.version(3).stores({ visits: 'id, cityId, date, [cityId+date]', settings: 'key', lensCache: 'key' });
    const photo = new Blob([new Uint8Array([1, 2, 3])], { type: 'image/jpeg' });
    await old.table('visits').put({
      id: 'v1',
      cityId: 'cz-prague',
      date: '2026-01-01',
      note: '메모',
      photos: [photo],
      createdAt: 1,
      updatedAt: 2,
    });
    await old.table('settings').put({ key: 'profile', value: { name: 'Sean', homeCityId: 'de-frankfurt' } });
    old.close();

    const db = createDB(NAME);
    await db.open();
    expect(db.verno).toBe(4);
    const v = await db.visits.get('v1');
    expect(v).toMatchObject({ cityId: 'cz-prague', note: '메모', updatedAt: 2 });
    expect(v?.photos[0]?.size).toBe(3);
    expect(v?.syncedAt).toBeUndefined();
    expect(await db.tombstones.count()).toBe(0);
    expect((await db.settings.get('profile'))?.value).toEqual({ name: 'Sean', homeCityId: 'de-frankfurt' });
    db.close();
  });
});

describe('removeVisits', () => {
  it('클라우드에 올린 기록만 삭제 표시를 남긴다', async () => {
    const db = createDB(NAME);
    const base = {
      cityId: 'cz-prague',
      date: '2026-01-01',
      note: '',
      photos: [],
      createdAt: 1,
      updatedAt: 5,
    };
    await db.visits.bulkPut([
      { id: 'local', ...base },
      { id: 'synced', ...base, syncedAt: 5 },
    ]);
    await removeVisits(db, ['local', 'synced', 'missing']);
    expect(await db.visits.count()).toBe(0);
    expect((await db.tombstones.toArray()).map((t) => t.id)).toEqual(['synced']);
    db.close();
  });
});
