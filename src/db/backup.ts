import type { PassportDB } from './db';
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
