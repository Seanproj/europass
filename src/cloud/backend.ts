import { CLOUD_MOCK_URL, cloudEnabled } from './config';
import type { PublicProfileData, Remote } from './types';

export interface CloudUser {
  id: string;
  email: string | null;
}

/** 로그인과 원격 저장소 (Supabase 또는 e2e 모의 서버) */
export interface CloudBackend {
  getUser(): Promise<CloudUser | null>;
  /** 로그인 상태가 바뀔 때 (반환: 구독 해제) */
  onAuthChange(cb: (user: CloudUser | null) => void): () => void;
  signInWithGoogle(): Promise<void>;
  /** 이메일로 로그인 링크 보내기 */
  signInWithEmail(email: string): Promise<void>;
  signOut(): Promise<void>;
  remote(user: CloudUser): Remote;
  /** 로그인하지 않아도 읽을 수 있다. 없거나 공개하지 않았으면 null */
  fetchPublicProfile(handle: string): Promise<PublicProfileData | null>;
  /** 공개 프로필의 사진 (공개한 사람 것만 읽힌다) */
  fetchPublicPhoto(path: string): Promise<Blob>;
}

let backend: Promise<CloudBackend> | null = null;

/** 필요할 때만 불러온다 (supabase-js는 첫 화면 번들에 넣지 않는다) */
export function loadBackend(): Promise<CloudBackend> | null {
  if (!cloudEnabled) return null;
  const mock = CLOUD_MOCK_URL;
  backend ??= mock
    ? import('./mockBackend').then((m) => m.createMockBackend(mock))
    : import('./supabaseBackend').then((m) => m.createSupabaseBackend());
  return backend;
}

/** 로그인 후 돌아온 주소(?code=, #access_token=)인지 */
export function isAuthRedirect(url: Location = location): boolean {
  return /[?&](code|error_description)=/.test(url.search) || /access_token=/.test(url.hash);
}
