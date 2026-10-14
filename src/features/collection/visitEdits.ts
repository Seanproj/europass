import type { PassportDB } from '../../db/db';
import type { Visit } from '../../db/types';
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

/** 날짜를 바꿀 때 종료일이 시작일보다 앞서지 않게 */
export function normalizeRange(
  date: string,
  endDate: string | undefined,
): { date: string; endDate?: string } {
  if (!endDate || endDate <= date) return { date, endDate: undefined };
  return { date, endDate };
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
  await db.visits.delete(id);
}
