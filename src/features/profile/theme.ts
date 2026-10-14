/** 테마 설정: 자동(시스템) · 라이트 · 다크. 기기마다 다를 수 있어 DB가 아니라 localStorage에 둔다 */
export type ThemePref = 'auto' | 'light' | 'dark';

const KEY = 'euro-passport:theme';
/** 테마가 바뀌면 window에 보내는 이벤트 (지도처럼 CSS 변수를 읽어 그리는 쪽이 다시 그리도록) */
export const THEME_EVENT = 'themechange';

export function loadTheme(): ThemePref {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : 'auto';
  } catch {
    return 'auto';
  }
}

export function applyTheme(pref: ThemePref) {
  const root = document.documentElement;
  if (pref === 'auto') delete root.dataset.theme;
  else root.dataset.theme = pref;
}

export function setTheme(pref: ThemePref) {
  try {
    if (pref === 'auto') localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, pref);
  } catch {
    // 저장이 막혀도 이번 세션에는 적용
  }
  applyTheme(pref);
  window.dispatchEvent(new Event(THEME_EVENT));
}
