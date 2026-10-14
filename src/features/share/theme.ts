/** 공유 카드 색과 서체. 값은 tokens.css에서 읽는다 (CSS가 유일한 원본) */
export interface CardTheme {
  bg: string;
  surface: string;
  text: string;
  text2: string;
  line: string;
  accent: string;
  /** accent 위 글자 */
  onAccent: string;
  gold: string;
  land: string;
  flagBlack: string;
  font: string;
  mono: string;
}

const VARS: Record<keyof CardTheme, string> = {
  bg: '--bg',
  surface: '--surface',
  text: '--text',
  text2: '--text-2',
  line: '--line',
  accent: '--accent',
  onAccent: '--tag-text',
  gold: '--gold',
  land: '--land',
  flagBlack: '--flag-black',
  font: '--font',
  mono: '--mono',
};

export function readCardTheme(): CardTheme {
  const css = getComputedStyle(document.documentElement);
  const out = {} as CardTheme;
  for (const [k, v] of Object.entries(VARS)) out[k as keyof CardTheme] = css.getPropertyValue(v).trim();
  return out;
}
