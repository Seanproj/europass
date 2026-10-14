import type { CloudBackend, CloudUser } from './backend';
import type { PublicProfileData, Remote } from './types';

/**
 * e2e용 모의 클라우드 (scripts/mock-cloud.ts 서버와 JSON으로 주고받는다).
 * 로그인은 메일 없이 바로 된다. VITE_CLOUD_MOCK_URL이 있을 때만 쓰인다 (배포 빌드에는 없음)
 */
export function createMockBackend(base: string): CloudBackend {
  const KEY = 'euro-passport:mock-user';
  const listeners = new Set<(u: CloudUser | null) => void>();
  const read = (): CloudUser | null => {
    try {
      return JSON.parse(localStorage.getItem(KEY) ?? 'null') as CloudUser | null;
    } catch {
      return null;
    }
  };
  const emit = (u: CloudUser | null) => listeners.forEach((cb) => cb(u));

  async function call<T>(path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${base}${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (res.status === 409) {
      const { HandleTakenError } = await import('./types');
      throw new HandleTakenError();
    }
    if (!res.ok) throw new Error(`mock cloud ${res.status}`);
    return (await res.json()) as T;
  }

  async function login(email: string) {
    const user = await call<CloudUser>('/login', { email });
    localStorage.setItem(KEY, JSON.stringify(user));
    emit(user);
  }

  const photo = async (path: string) => {
    const res = await fetch(`${base}/photo?path=${encodeURIComponent(path)}`);
    if (!res.ok) throw new Error(`photo ${res.status}`);
    return res.blob();
  };

  return {
    getUser: async () => read(),
    onAuthChange(cb) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    signInWithGoogle: () => login('google-user@example.com'),
    signInWithEmail: (email) => login(email),
    async signOut() {
      localStorage.removeItem(KEY);
      emit(null);
    },
    remote(user): Remote {
      const userId = user.id;
      return {
        userId,
        pullVisits: (cursor) => call('/pull', { userId, cursor }),
        pushVisits: (rows) => call('/push', { userId, rows }),
        async uploadPhoto(path, blob) {
          const res = await fetch(`${base}/photo?path=${encodeURIComponent(path)}`, {
            method: 'PUT',
            headers: { 'content-type': blob.type || 'application/octet-stream' },
            body: blob,
          });
          if (!res.ok) throw new Error(`upload ${res.status}`);
        },
        downloadPhoto: photo,
        getProfile: () => call('/profile/get', { userId }),
        putProfile: (p) => call('/profile/put', { userId, profile: p }),
        getPublicSettings: () => call('/public-settings/get', { userId }),
        setPublicSettings: (s) => call('/public-settings/put', { userId, settings: s }),
      };
    },
    fetchPublicProfile: (handle) => call<PublicProfileData | null>(`/public/${encodeURIComponent(handle)}`),
    fetchPublicPhoto: photo,
  };
}
