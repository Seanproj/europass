import { strFromU8, strToU8, unzipSync, zipSync, type Zippable } from 'fflate';
import { removeVisits, type PassportDB } from './db';
import type { Profile, Visit } from './types';
import {
  convertV0Profile,
  convertV0Visit,
  isV0Visit,
  mergeVisits,
  type MigrationResult,
  type V0Profile,
} from './migrate-v0';

export class BackupFormatError extends Error {}

/** v0 백업 JSON인지 확인 — { app: 'euro-passport', version: 1, settings, visits[] } */
export function isV0Backup(
  x: unknown,
): x is { app: 'euro-passport'; version: 1; settings?: V0Profile; visits: unknown[] } {
  if (!x || typeof x !== 'object') return false;
  const b = x as Record<string, unknown>;
  return b.app === 'euro-passport' && b.version === 1 && Array.isArray(b.visits);
}

/** v0 백업 파일 내용(문자열 또는 파싱된 객체)을 v1 DB로 가져온다 */
export async function importV0Backup(db: PassportDB, input: string | unknown): Promise<MigrationResult> {
  let data: unknown = input;
  if (typeof input === 'string') {
    try {
      data = JSON.parse(input);
    } catch {
      throw new BackupFormatError('JSON 형식이 아니에요');
    }
  }
  if (!isV0Backup(data)) throw new BackupFormatError('Euro Passport 백업 파일이 아니에요');

  const result = await mergeVisits(db, data.visits.filter(isV0Visit).map(convertV0Visit));
  if (data.settings && !(await db.settings.get('profile'))) {
    await db.settings.put({ key: 'profile', value: convertV0Profile(data.settings) });
  }
  return result;
}

/** v1 백업 (zip 안의 backup.json). 사진은 zip 안의 photos/ 파일로 따로 둔다 */
export interface BackupV2 {
  app: 'euro-passport';
  version: 2;
  exportedAt: string;
  profile?: Profile;
  visits: (Omit<Visit, 'photos'> & { photos: string[] })[];
}

const MANIFEST = 'backup.json';
const EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};
const MIME = Object.fromEntries(Object.entries(EXT).map(([type, ext]) => [ext, type]));

/** 모든 기록을 zip 하나로: backup.json + photos/<방문 id>-<순번>.<확장자> */
export async function exportBackup(db: PassportDB, now = new Date()): Promise<Uint8Array> {
  const [visits, profile] = await Promise.all([db.visits.toArray(), db.settings.get('profile')]);
  const files: Zippable = {};
  const manifest: BackupV2 = {
    app: 'euro-passport',
    version: 2,
    exportedAt: now.toISOString(),
    ...(profile ? { profile: profile.value as Profile } : {}),
    visits: [],
  };
  for (const v of visits) {
    const names: string[] = [];
    for (const [i, blob] of v.photos.entries()) {
      const name = `photos/${v.id}-${i + 1}.${EXT[blob.type] ?? 'bin'}`;
      // 사진은 이미 압축된 형식이라 다시 압축하지 않는다
      files[name] = [new Uint8Array(await blob.arrayBuffer()), { level: 0 }];
      names.push(name);
    }
    // 동기화 표시는 이 기기에만 해당해서 백업에 넣지 않는다
    manifest.visits.push({ ...withoutSync(v), photos: names });
  }
  files[MANIFEST] = strToU8(JSON.stringify(manifest, null, 2));
  return zipSync(files);
}

/** 동기화 표시(syncedAt)는 이 기기에만 해당한다: 백업에 넣지 않고, 가져온 기록은 새로 올릴 변경으로 본다 */
function withoutSync<T extends { syncedAt?: unknown }>(v: T): Omit<T, 'syncedAt'> {
  const copy = { ...v };
  delete copy.syncedAt;
  return copy;
}

export function backupFileName(now = new Date()): string {
  const d = now.toISOString().slice(0, 10);
  return `euro-passport-${d}.zip`;
}

function isBackupV2(x: unknown): x is BackupV2 {
  if (!x || typeof x !== 'object') return false;
  const b = x as Record<string, unknown>;
  return b.app === 'euro-passport' && b.version === 2 && Array.isArray(b.visits);
}

function isVisitRow(x: unknown): x is BackupV2['visits'][number] {
  if (!x || typeof x !== 'object') return false;
  const v = x as Record<string, unknown>;
  return typeof v.id === 'string' && typeof v.cityId === 'string' && typeof v.date === 'string';
}

export interface ImportResult extends MigrationResult {
  /** 'v0' = 이전 버전 JSON, 'v1' = 이 앱의 zip */
  format: 'v0' | 'v1';
}

/**
 * 백업 가져오기: 이 앱의 zip(사진 포함) 또는 v0 JSON.
 * 지우지 않고 합친다 — 같은 기록은 더 최근에 고친 쪽을 남긴다
 */
export async function importBackup(db: PassportDB, bytes: Uint8Array): Promise<ImportResult> {
  // zip은 "PK"로 시작한다
  if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) {
    const text = strFromU8(bytes);
    return { ...(await importV0Backup(db, text)), format: 'v0' };
  }
  let files: Record<string, Uint8Array>;
  let data: unknown;
  try {
    files = unzipSync(bytes);
    const manifest = files[MANIFEST];
    if (!manifest) throw new BackupFormatError('');
    data = JSON.parse(strFromU8(manifest));
  } catch {
    throw new BackupFormatError('백업 파일을 열 수 없어요');
  }
  if (!isBackupV2(data)) throw new BackupFormatError('Euro Passport 백업 파일이 아니에요');

  const visits: Visit[] = data.visits
    .filter(isVisitRow)
    .map(withoutSync)
    .map((v) => ({
      ...v,
      note: typeof v.note === 'string' ? v.note : '',
      createdAt: typeof v.createdAt === 'number' ? v.createdAt : Date.now(),
      updatedAt: typeof v.updatedAt === 'number' ? v.updatedAt : Date.now(),
      photos: (Array.isArray(v.photos) ? v.photos : [])
        .filter((name) => typeof name === 'string' && files[name])
        .map(
          (name) =>
            new Blob([files[name] as Uint8Array<ArrayBuffer>], { type: MIME[name.split('.').pop()!] ?? '' }),
        ),
    }));
  const result = await mergeVisits(db, visits);
  if (data.profile && !(await db.settings.get('profile'))) {
    await db.settings.put({ key: 'profile', value: data.profile });
  }
  return { ...result, format: 'v1' };
}

/**
 * 모든 기록 삭제: 방문 기록(사진 포함)과 지도 캐시를 지운다.
 * 프로필(이름·홈 도시)은 남기고, v0 자동 이전 표시도 남겨 지운 기록이 v0에서 되살아나지 않게 한다
 */
export async function deleteAllData(db: PassportDB): Promise<void> {
  const ids = (await db.visits.toCollection().primaryKeys()) as string[];
  await removeVisits(db, ids);
  await db.transaction('rw', db.visits, db.lensCache, db.settings, async () => {
    await db.visits.clear();
    await db.lensCache.clear();
    // 새로 시작하면 배지와 기념도 다시 알린다
    await db.settings.put({ key: 'badgesSeen', value: [] });
    await db.settings.delete('milestonesSeen');
  });
}
