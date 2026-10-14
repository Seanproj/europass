import exifr from 'exifr';

/** 방문 한 건에 붙일 수 있는 사진 수 */
export const MAX_PHOTOS = 10;
/** 긴 변 최대 길이 */
const MAX_EDGE = 1600;

/** 사진을 긴 변 1600px JPEG로 줄인다 (회전 정보는 반영). 실패하면 원본 그대로 */
export async function compressPhoto(file: Blob): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.85));
    return blob ?? file;
  } catch {
    return file;
  }
}

export interface PhotoHints {
  /** 촬영일 YYYY-MM-DD */
  date?: string;
  lat?: number;
  lon?: number;
}

/** EXIF에서 촬영일과 GPS를 읽는다 (압축하면 EXIF가 사라지므로 원본에서) */
export async function readPhotoHints(file: Blob): Promise<PhotoHints> {
  try {
    const data = (await exifr.parse(file, { pick: ['DateTimeOriginal', 'CreateDate'], gps: true })) as
      { DateTimeOriginal?: Date; CreateDate?: Date; latitude?: number; longitude?: number } | undefined;
    if (!data) return {};
    const taken = data.DateTimeOriginal ?? data.CreateDate;
    return {
      date: taken instanceof Date && !Number.isNaN(taken.getTime()) ? localISO(taken) : undefined,
      lat: typeof data.latitude === 'number' ? data.latitude : undefined,
      lon: typeof data.longitude === 'number' ? data.longitude : undefined,
    };
  } catch {
    return {};
  }
}

// EXIF 시각은 시간대 없는 현지 시각이라 exifr가 기기 시간대로 해석한다. 그대로 현지 날짜로 읽는다
function localISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
