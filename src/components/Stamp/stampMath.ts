export const STAMP_SHAPES = ['circle', 'oval', 'rect', 'oct', 'hex'] as const;
export type StampShape = (typeof STAMP_SHAPES)[number];

/** FNV-1a 32비트 해시 (도시·방문 id → 도장 모양·각도를 늘 같게) */
export function hash32(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** 도장 모양은 도시마다 고정 */
export function stampShape(cityId: string): StampShape {
  return STAMP_SHAPES[hash32(cityId) % STAMP_SHAPES.length]!;
}

/** 찍힌 각도 -9° ~ +9°, 방문마다 고정 (0.1° 단위) */
export function stampAngle(visitId: string): number {
  return (hash32(visitId) % 181) / 10 - 9;
}

/** 잉크 결(feTurbulence) seed, 도시마다 고정 */
export function inkSeed(cityId: string): number {
  return (hash32(`ink:${cityId}`) % 997) + 1;
}

/**
 * 고정폭 서체 기준으로 글자가 maxW 안에 들어가는 크기를 고른다.
 * 그래도 넘치면 textLength로 눌러 담는다 (반환 fit)
 */
/** 고정폭 서체 글자 폭 근사 (글자 폭 0.6em + 자간) */
export function monoWidth(text: string, size: number, spacing: number): number {
  return text.length * (size * 0.6 + size * spacing);
}

export function fitMono(text: string, sizes: number[], spacing: number, maxW: number) {
  const width = (size: number) => monoWidth(text, size, spacing);
  const size = sizes.find((s) => width(s) <= maxW) ?? sizes[sizes.length - 1]!;
  return { size, letterSpacing: size * spacing, fit: width(size) > maxW ? maxW : undefined };
}
