import { removeVisits, type PassportDB } from '../../db/db';
import type { Visit } from '../../db/types';
import { stayNights } from '../../db/selectors';
import { addDays } from '../../lib/date';
import { compressPhoto, MAX_PHOTOS, readPhotoHints, type PhotoHints } from './photos';

export const NOTE_MAX = 140;

export async function updateVisit(
  db: PassportDB,
  id: string,
  patch: Partial<Pick<Visit, 'date' | 'endDate' | 'note' | 'photos'>>,
) {
  const clean = { ...patch };
  if (clean.note !== undefined) clean.note = clean.note.trim().slice(0, NOTE_MAX);
  await db.visits.update(id, { ...clean, updatedAt: Date.now() });
}

/** 방문일을 옮길 때 머문 기간(박수)은 그대로 두고 떠난 날도 같이 옮긴다 */
export function moveVisitDate(visit: Pick<Visit, 'date' | 'endDate'>, date: string) {
  const nights = stayNights(visit);
  return { date, endDate: nights > 0 ? addDays(date, nights) : undefined };
}

/** 머문 기간(박수)으로 떠난 날을 정한다. 0이면 당일 */
export function withNights(date: string, nights: number) {
  return { endDate: nights > 0 ? addDays(date, nights) : undefined };
}

export interface AddPhotosResult {
  added: number;
  /** 10장 제한으로 못 넣은 수 */
  skipped: number;
  /** 첫 사진의 촬영일·위치 (EXIF) */
  hints: PhotoHints;
}

/** 사진 추가: 원본에서 EXIF를 읽고, 1600px JPEG로 줄여 저장 (방문당 최대 10장) */
export async function addPhotos(db: PassportDB, visit: Visit, files: Blob[]): Promise<AddPhotosResult> {
  const room = Math.max(0, MAX_PHOTOS - visit.photos.length);
  const take = files.slice(0, room);
  const hints = take[0] ? await readPhotoHints(take[0]) : {};
  const blobs = await Promise.all(take.map(compressPhoto));
  if (blobs.length) {
    const fresh = await db.visits.get(visit.id);
    await updateVisit(db, visit.id, {
      photos: [...(fresh?.photos ?? visit.photos), ...blobs].slice(0, MAX_PHOTOS),
    });
  }
  return { added: blobs.length, skipped: files.length - take.length, hints };
}

export async function removePhoto(db: PassportDB, visit: Visit, index: number) {
  await updateVisit(db, visit.id, { photos: visit.photos.filter((_, i) => i !== index) });
}

export async function deleteVisit(db: PassportDB, id: string) {
  await removeVisits(db, [id]);
}
