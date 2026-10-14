import type { Visit } from '../../db/types';
import type { PublicProfileData } from '../../cloud/types';

/** 공개 프로필 기록 → 지도·배지 계산용 방문 기록 (사진은 따로 불러온다) */
export function toVisits(data: PublicProfileData): Visit[] {
  return data.visits.map((v) => ({
    id: v.id,
    cityId: v.cityId,
    date: v.date,
    ...(v.endDate ? { endDate: v.endDate } : {}),
    note: v.note ?? '',
    photos: [],
    createdAt: 0,
    updatedAt: 0,
  }));
}
