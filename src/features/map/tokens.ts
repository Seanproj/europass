import type { MapTheme } from './lens/cacheKey';

/** 지도·캔버스 코드가 쓰는 토큰. 값은 tokens.css에서 읽는다 (CSS가 유일한 원본) */
export interface MapTokens {
  theme: MapTheme;
  land: string;
  water: string;
  fog: string;
  fogCloud: string;
  text: string;
  text2: string;
  line: string;
  surface: string;
  accent: string;
  /** 히든젬 도장 잉크 */
  gold: string;
  flagBlack: string;
  tagBg: string;
  tagText: string;
  tagBadge: string;
  dBg: string;
  dStreet: string;
  dRoad: string;
  dWater: string;
  dPark: string;
  dRoof: string;
  font: string;
  /** 도장 글자 */
  mono: string;
}

const VARS: Record<Exclude<keyof MapTokens, 'theme'>, string> = {
  land: '--land',
  water: '--map-water',
  fog: '--fog',
  fogCloud: '--fog-cloud',
  text: '--text',
  text2: '--text-2',
  line: '--line',
  surface: '--surface',
  accent: '--accent',
  gold: '--gold',
  flagBlack: '--flag-black',
  tagBg: '--tag-bg',
  tagText: '--tag-text',
  tagBadge: '--tag-badge',
  dBg: '--d-bg',
  dStreet: '--d-street',
  dRoad: '--d-road',
  dWater: '--d-water',
  dPark: '--d-park',
  dRoof: '--d-roof',
  font: '--font',
  mono: '--mono',
};

export function currentTheme(): MapTheme {
  const forced = document.documentElement.dataset.theme;
  if (forced === 'light' || forced === 'dark') return forced;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function readMapTokens(): MapTokens {
  const css = getComputedStyle(document.documentElement);
  const out = { theme: currentTheme() } as MapTokens;
  for (const [key, name] of Object.entries(VARS)) {
    (out as unknown as Record<string, string>)[key] = css.getPropertyValue(name).trim();
  }
  return out;
}
