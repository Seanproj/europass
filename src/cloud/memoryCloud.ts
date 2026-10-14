import {
  HandleTakenError,
  type PublicProfileData,
  type PublicSettings,
  type Remote,
  type RemoteProfile,
  type RemoteVisit,
} from './types';

interface UserData {
  visits: Map<string, RemoteVisit & { seq: number }>;
  profile: RemoteProfile | null;
  publicSettings: PublicSettings;
}

/**
 * 메모리 클라우드: Supabase 서버 동작(LWW, 증가 커서, 내용 주소 사진, 공개 프로필 필터)을 흉내 낸다.
 * 단위 테스트와 e2e 모의 서버(scripts/mock-cloud.ts)가 같이 쓴다
 */
export class MemoryCloud {
  private seq = 0;
  private users = new Map<string, UserData>();
  readonly photos = new Map<string, { bytes: Uint8Array; type: string }>();

  private user(id: string): UserData {
    let u = this.users.get(id);
    if (!u) {
      u = {
        visits: new Map(),
        profile: null,
        publicSettings: { handle: null, isPublic: false, shareNotes: false, sharePhotos: false },
      };
      this.users.set(id, u);
    }
    return u;
  }

  pull(userId: string, cursor: string | null) {
    const after = cursor ? Number(cursor) : 0;
    const rows = [...this.user(userId).visits.values()]
      .filter((v) => v.seq > after)
      .sort((a, b) => a.seq - b.seq);
    const last = rows.at(-1)?.seq;
    return {
      rows: rows.map(({ seq: _seq, ...r }) => (void _seq, r)),
      cursor: last !== undefined ? String(last) : cursor,
    };
  }

  push(userId: string, rows: RemoteVisit[]) {
    const u = this.user(userId);
    for (const r of rows) {
      const cur = u.visits.get(r.id);
      if (cur && cur.updatedAt >= r.updatedAt) continue;
      u.visits.set(r.id, { ...r, seq: ++this.seq });
    }
  }

  upload(path: string, bytes: Uint8Array, type: string) {
    if (!this.photos.has(path)) this.photos.set(path, { bytes, type });
  }

  download(path: string) {
    const p = this.photos.get(path);
    if (!p) throw new Error(`사진 없음: ${path}`);
    return p;
  }

  getProfile(userId: string) {
    return this.user(userId).profile;
  }

  putProfile(userId: string, p: RemoteProfile) {
    const u = this.user(userId);
    if (!u.profile || p.updatedAt >= u.profile.updatedAt) u.profile = p;
  }

  getPublicSettings(userId: string) {
    return this.user(userId).publicSettings;
  }

  setPublicSettings(userId: string, s: PublicSettings) {
    for (const [id, u] of this.users)
      if (id !== userId && s.handle && u.publicSettings.handle === s.handle) throw new HandleTakenError();
    this.user(userId).publicSettings = s;
  }

  publicProfile(handle: string): PublicProfileData | null {
    for (const u of this.users.values()) {
      const s = u.publicSettings;
      if (s.handle !== handle || !s.isPublic || !u.profile) continue;
      return {
        handle,
        name: u.profile.name,
        homeCityId: u.profile.homeCityId,
        visits: [...u.visits.values()]
          .filter((v) => !v.deleted && v.cityId && v.date)
          .map((v) => ({
            id: v.id,
            cityId: v.cityId!,
            date: v.date!,
            endDate: v.endDate,
            note: s.shareNotes ? v.note : null,
            photos: s.sharePhotos ? v.photos : [],
          })),
      };
    }
    return null;
  }
}

/** MemoryCloud의 한 사용자 몫을 Remote로 */
export function memoryRemote(cloud: MemoryCloud, userId: string): Remote {
  return {
    userId,
    pullVisits: async (cursor) => cloud.pull(userId, cursor),
    pushVisits: async (rows) => cloud.push(userId, rows),
    uploadPhoto: async (path, blob) =>
      cloud.upload(path, new Uint8Array(await blob.arrayBuffer()), blob.type),
    downloadPhoto: async (path) => {
      const p = cloud.download(path);
      return new Blob([p.bytes as Uint8Array<ArrayBuffer>], { type: p.type });
    },
    getProfile: async () => cloud.getProfile(userId),
    putProfile: async (p) => cloud.putProfile(userId, p),
    getPublicSettings: async () => cloud.getPublicSettings(userId),
    setPublicSettings: async (s) => cloud.setPublicSettings(userId, s),
  };
}
