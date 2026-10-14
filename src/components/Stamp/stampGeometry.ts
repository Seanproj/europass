import { getCountry } from '../../data/cities';
import type { City } from '../../data/types';
import { formatLat, formatLon, stampDate } from '../../lib/date';
import { fitMono, type StampShape } from './stampMath';

/** 도장 좌표계: viewBox 160×160, 가운데 (80, 80). SVG 도장과 캔버스 도장(공유 카드)이 같이 쓴다 */
export const STAMP_BOX = 160;
export const STAMP_C = 80;
const TEXT_W = 108;

/** 테두리 선 하나 */
export type Outline =
  | { kind: 'circle'; r: number }
  | { kind: 'ellipse'; rx: number; ry: number }
  | { kind: 'rect'; x: number; y: number; w: number; h: number; r: number }
  | { kind: 'poly'; points: [number, number][] };

const ngon = (n: number, r: number, off: number): [number, number][] =>
  Array.from({ length: n }, (_, i) => {
    const a = off + (i * 2 * Math.PI) / n;
    return [Number((STAMP_C + r * Math.cos(a)).toFixed(1)), Number((STAMP_C + r * Math.sin(a)).toFixed(1))];
  });

/** 모양별 테두리 (굵은 선 2.6 + 가는 선 0.9)와 글자 시작 위치 */
export const FRAMES: Record<StampShape, { outer: Outline; inner: Outline; top: number; gap: number }> = {
  circle: { top: 42, gap: 1, outer: { kind: 'circle', r: 72 }, inner: { kind: 'circle', r: 66 } },
  oval: {
    top: 44,
    gap: 0.93,
    outer: { kind: 'ellipse', rx: 76, ry: 58 },
    inner: { kind: 'ellipse', rx: 70, ry: 52 },
  },
  rect: {
    top: 46,
    gap: 0.97,
    outer: { kind: 'rect', x: 8, y: 26, w: 144, h: 108, r: 9 },
    inner: { kind: 'rect', x: 14, y: 32, w: 132, h: 96, r: 5 },
  },
  oct: {
    top: 42,
    gap: 1,
    outer: { kind: 'poly', points: ngon(8, 74, Math.PI / 8) },
    inner: { kind: 'poly', points: ngon(8, 67, Math.PI / 8) },
  },
  hex: {
    top: 44,
    gap: 0.97,
    outer: {
      kind: 'poly',
      points: [
        [80, 12],
        [150, 42],
        [150, 118],
        [80, 148],
        [10, 118],
        [10, 42],
      ],
    },
    inner: {
      kind: 'poly',
      points: [
        [80, 20],
        [143, 47],
        [143, 113],
        [80, 140],
        [17, 113],
        [17, 47],
      ],
    },
  },
};

export const OUTER_WIDTH = 2.6;
export const INNER_WIDTH = 0.9;

export interface StampLine {
  y: number;
  text: string;
  size: number;
  weight: number;
  letterSpacing: number;
  /** 글자 폭을 이 값에 맞춰 눌러 담는다 (넘칠 때만) */
  fit: number | undefined;
}

/** 도장 안 글자 5줄과 가로줄 위치: 나라 / 도시(현지 표기) / 날짜 / ─ / 위도 / 경도 */
export function stampLayout(city: City, date: string | null, shape: StampShape) {
  const { top, gap } = FRAMES[shape];
  const country = (getCountry(city.country)?.name.en ?? city.country).toUpperCase();
  const name = city.name.local.toUpperCase();
  const line = (y: number, text: string, sizes: number[], weight: number, spacing: number): StampLine => {
    const f = fitMono(text, sizes, spacing, TEXT_W);
    return { y, text, size: f.size, weight, letterSpacing: f.letterSpacing, fit: f.fit };
  };
  const nameLine = line(top + 20 * gap, name, [16, 13, 11, 9], 700, 0.18);
  return {
    lines: [
      line(top, country, [6.5, 5.5], 500, 0.3),
      nameLine,
      line(top + 36 * gap, date ? stampDate(date) : '· · ·', [10], 500, 0.15),
      line(top + 56 * gap, formatLat(city.lat), [7], 500, 0.14),
      line(top + 66 * gap, formatLon(city.lon), [7], 500, 0.14),
    ],
    rule: { y: top + 44 * gap, half: nameLine.size >= 16 ? 28 : 34 },
  };
}
