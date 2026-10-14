export type MapTheme = 'light' | 'dark';

/** 렌즈 스냅샷 스타일을 바꾸면 올린다 (예전 캐시는 자연히 쓰이지 않음) */
export const LENS_STYLE_VERSION = 1;

/** Dexie lensCache 키: 도시 · 테마 · 스타일 버전 */
export function lensCacheKey(cityId: string, theme: MapTheme, version = LENS_STYLE_VERSION): string {
  return `${cityId}|${theme}|v${version}`;
}
