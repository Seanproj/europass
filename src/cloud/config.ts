/**
 * 클라우드 동기화 설정 (빌드 때 환경 변수로 주입, docs/CLOUD_SETUP.md).
 * 키가 없으면 동기화 UI를 숨기고 앱은 기기 안에서만 동작한다
 */
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
/** e2e용 모의 클라우드 서버 주소 (scripts/mock-cloud.ts). 배포 빌드에는 없다 */
export const CLOUD_MOCK_URL = import.meta.env.VITE_CLOUD_MOCK_URL as string | undefined;

export const cloudEnabled = !!CLOUD_MOCK_URL || (!!SUPABASE_URL && !!SUPABASE_ANON_KEY);
