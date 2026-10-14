// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createDB, removeVisits, type PassportDB } from '../db/db';
import type { Visit } from '../db/types';
import { checkIn } from '../features/checkin/checkin';
import { updateVisit } from '../features/collection/visitEdits';
import { MemoryCloud, memoryRemote } from './memoryCloud';
import { pendingCount, syncOnce } from './sync';

let n = 0;
let a: PassportDB;
let b: PassportDB;
let cloud: MemoryCloud;

beforeEach(async () => {
  a = createDB(`sync-a-${n}`);
  b = createDB(`sync-b-${n++}`);
  await Promise.all([a.open(), b.open()]);
  cloud = new MemoryCloud();
});

afterEach(async () => {
  for (const d of [a, b]) {
    d.close();
    await d.delete();
  }
});

const remoteA = () => memoryRemote(cloud, 'user-1');
const remoteB = () => memoryRemote(cloud, 'user-1');
const jpeg = (bytes: number[]) => new Blob([new Uint8Array(bytes)], { type: 'image/jpeg' });
const strip = (v: Visit | undefined) => v && { ...v, photos: v.photos.length, syncedAt: undefined };

describe('기기 간 동기화', () => {
  it('첫 로그인: 이 기기 기록을 올리고, 다른 기기에서 받는다 (사진 포함)', async () => {
    const r = await checkIn(a, 'cz-prague', '2026-03-01');
    if (r.kind !== 'added') throw new Error();
    await updateVisit(a, r.visit.id, { note: '카를교', photos: [jpeg([1, 2, 3]), jpeg([9])] });
    expect(await pendingCount(a)).toBe(1);

    expect(await syncOnce(a, remoteA())).toMatchObject({ pushed: 1 });
    expect(await pendingCount(a)).toBe(0);
    expect(cloud.photos.size).toBe(2);

    expect(await syncOnce(b, remoteB())).toMatchObject({ pulled: 1 });
    const got = await b.visits.get(r.visit.id);
    expect(strip(got)).toEqual(strip(await a.visits.get(r.visit.id)));
    expect(got?.note).toBe('카를교');
    expect(await got?.photos[0]?.arrayBuffer()).toEqual(new Uint8Array([1, 2, 3]).buffer);
    expect(got?.photos[0]?.type).toBe('image/jpeg');
    // 받은 기록은 다시 올릴 필요가 없다
    expect(await pendingCount(b)).toBe(0);
  });

  it('양방향: 나중에 고친 쪽이 이긴다 (last-write-wins)', async () => {
    const r = await checkIn(a, 'cz-prague', '2026-03-01');
    if (r.kind !== 'added') throw new Error();
    await syncOnce(a, remoteA());
    await syncOnce(b, remoteB());

    await a.visits.update(r.visit.id, { note: 'A의 메모', updatedAt: Date.now() + 1000 });
    await b.visits.update(r.visit.id, { note: 'B의 메모 (나중)', updatedAt: Date.now() + 2000 });
    await syncOnce(a, remoteA());
    await syncOnce(b, remoteB());
    await syncOnce(a, remoteA());
    expect((await a.visits.get(r.visit.id))?.note).toBe('B의 메모 (나중)');
    expect((await b.visits.get(r.visit.id))?.note).toBe('B의 메모 (나중)');
  });

  it('삭제도 다른 기기로 전해진다', async () => {
    const r = await checkIn(a, 'fr-paris', '2026-04-01');
    if (r.kind !== 'added') throw new Error();
    await syncOnce(a, remoteA());
    await syncOnce(b, remoteB());
    expect(await b.visits.count()).toBe(1);

    await removeVisits(a, [r.visit.id]);
    expect(await a.tombstones.count()).toBe(1);
    await syncOnce(a, remoteA());
    expect(await a.tombstones.count()).toBe(0);
    expect(await syncOnce(b, remoteB())).toMatchObject({ deleted: 1 });
    expect(await b.visits.count()).toBe(0);
  });

  it('오프라인 큐: 실패하면 올리지 못한 변경이 남고, 다음에 올라간다', async () => {
    await checkIn(a, 'at-vienna', '2026-05-01');
    const failing = { ...remoteA(), pushVisits: () => Promise.reject(new Error('offline')) };
    await expect(syncOnce(a, failing)).rejects.toThrow('offline');
    expect(await pendingCount(a)).toBe(1);
    await syncOnce(a, remoteA());
    expect(await pendingCount(a)).toBe(0);
    await syncOnce(b, remoteB());
    expect(await b.visits.where('cityId').equals('at-vienna').count()).toBe(1);
  });

  it('같은 사진은 한 번만 올린다 (내용 주소)', async () => {
    const r1 = await checkIn(a, 'cz-prague', '2026-03-01');
    const r2 = await checkIn(a, 'cz-brno', '2026-03-02');
    if (r1.kind !== 'added' || r2.kind !== 'added') throw new Error();
    await updateVisit(a, r1.visit.id, { photos: [jpeg([7, 7])] });
    await updateVisit(a, r2.visit.id, { photos: [jpeg([7, 7])] });
    await syncOnce(a, remoteA());
    expect(cloud.photos.size).toBe(1);
  });

  it('프로필(이름·홈 도시)도 최근에 고친 쪽으로 맞춘다', async () => {
    await a.settings.put({ key: 'profile', value: { name: 'Sean', homeCityId: 'de-berlin', updatedAt: 10 } });
    await syncOnce(a, remoteA());
    await syncOnce(b, remoteB());
    expect((await b.settings.get('profile'))?.value).toEqual({
      name: 'Sean',
      homeCityId: 'de-berlin',
      updatedAt: 10,
    });
  });

  it('다른 계정으로 로그인하면 이 기기 기록을 그 계정에 새로 올린다', async () => {
    await checkIn(a, 'it-rome', '2026-06-01');
    await syncOnce(a, remoteA());
    expect(await syncOnce(a, memoryRemote(cloud, 'user-2'))).toMatchObject({ pushed: 1 });
    expect(cloud.pull('user-2', null).rows).toHaveLength(1);
  });
});

describe('공개 프로필 (서버 필터)', () => {
  it('공개를 켠 사람만, 메모·사진은 각각 고른 것만', async () => {
    const r = await checkIn(a, 'cz-prague', '2026-03-01');
    if (r.kind !== 'added') throw new Error();
    await a.settings.put({
      key: 'profile',
      value: { name: 'Sean', homeCityId: 'de-frankfurt', updatedAt: 1 },
    });
    await updateVisit(a, r.visit.id, { note: '비밀 메모', photos: [jpeg([1])] });
    await syncOnce(a, remoteA());
    const remote = remoteA();

    await remote.setPublicSettings({ handle: 'sean', isPublic: false, shareNotes: true, sharePhotos: true });
    expect(cloud.publicProfile('sean')).toBeNull();

    await remote.setPublicSettings({ handle: 'sean', isPublic: true, shareNotes: false, sharePhotos: true });
    const pub = cloud.publicProfile('sean')!;
    expect(pub.name).toBe('Sean');
    expect(pub.visits[0]).toMatchObject({ cityId: 'cz-prague', note: null });
    expect(pub.visits[0]!.photos).toHaveLength(1);

    await expect(
      memoryRemote(cloud, 'user-2').setPublicSettings({
        handle: 'sean',
        isPublic: true,
        shareNotes: false,
        sharePhotos: false,
      }),
    ).rejects.toThrow('이미 쓰는 주소예요');
  });
});
