/** 클라우드에 저장하는 방문 기록 한 건 (사진은 Storage 경로) */
export interface RemoteVisit {
  id: string;
  cityId: string | null;
  date: string | null;
  endDate: string | null;
  note: string;
  /** Storage 경로 `${userId}/${sha256}.${ext}` */
  photos: string[];
  legacy: { mood?: string; rating?: number; title?: string } | null;
  createdAt: number;
  /** 기기에서 마지막으로 고친 시각. 서버는 이 값이 더 큰 쪽만 받는다 (last-write-wins) */
  updatedAt: number;
  /** 삭제 표시 (다른 기기에도 지워지게) */
  deleted: boolean;
}

export interface RemoteProfile {
  name: string;
  homeCityId: string;
  updatedAt: number;
}

/** 공개 프로필 설정 */
export interface PublicSettings {
  /** 링크 주소 ?u=handle. 영문 소문자·숫자·밑줄 3~20자 */
  handle: string | null;
  isPublic: boolean;
  shareNotes: boolean;
  sharePhotos: boolean;
}

/** ?u=handle로 보는 공개 프로필 (공개하지 않은 메모·사진은 빠져서 온다) */
export interface PublicProfileData {
  handle: string;
  name: string;
  homeCityId: string;
  visits: {
    id: string;
    cityId: string;
    date: string;
    endDate: string | null;
    note: string | null;
    photos: string[];
  }[];
}

/**
 * 클라우드 저장소 한 사용자 몫. 실제는 Supabase(supabaseRemote.ts),
 * 테스트·e2e는 메모리(memoryCloud.ts)나 그 HTTP 래퍼(httpRemote.ts)
 */
export interface Remote {
  readonly userId: string;
  /** cursor 이후 서버에 바뀐 기록 (cursor는 서버가 정하는 불투명한 값) */
  pullVisits(cursor: string | null): Promise<{ rows: RemoteVisit[]; cursor: string | null }>;
  /** 서버가 updatedAt이 더 큰 쪽만 반영한다 */
  pushVisits(rows: RemoteVisit[]): Promise<void>;
  /** 같은 경로가 있으면 아무것도 안 한다 (내용 주소라 같은 경로 = 같은 사진) */
  uploadPhoto(path: string, blob: Blob): Promise<void>;
  downloadPhoto(path: string): Promise<Blob>;
  getProfile(): Promise<RemoteProfile | null>;
  putProfile(p: RemoteProfile): Promise<void>;
  getPublicSettings(): Promise<PublicSettings>;
  /** handle이 이미 쓰이면 HandleTakenError */
  setPublicSettings(s: PublicSettings): Promise<void>;
}

export class HandleTakenError extends Error {
  constructor() {
    super('이미 쓰는 주소예요');
  }
}

export const HANDLE_RE = /^[a-z0-9_]{3,20}$/;
