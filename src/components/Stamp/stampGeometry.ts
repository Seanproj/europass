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

/** 테두리를 다각형 꼭짓점 목록으로 (사각의 둥근 모서리는 무시). 원·타원은 null */
export function corners(o: Outline): [number, number][] | null {
  if (o.kind === 'poly') return o.points;
  if (o.kind === 'rect')
    return [
      [o.x, o.y],
      [o.x + o.w, o.y],
      [o.x + o.w, o.y + o.h],
      [o.x, o.y + o.h],
    ];
  return null;
}

/** 높이 y에서 테두리 안쪽의 가운데로부터 반폭 (테두리 밖이면 0) */
export function halfWidthAt(o: Outline, y: number): number {
  const dy = y - STAMP_C;
  if (o.kind === 'circle') return Math.sqrt(Math.max(0, o.r * o.r - dy * dy));
  if (o.kind === 'ellipse') return o.rx * Math.sqrt(Math.max(0, 1 - (dy * dy) / (o.ry * o.ry)));
  const pts = corners(o)!;
  const xs: number[] = [];
  pts.forEach(([x0, y0], i) => {
    const [x1, y1] = pts[(i + 1) % pts.length]!;
    if ((y < Math.min(y0, y1) || y > Math.max(y0, y1)) && y0 !== y1) return;
    if (y0 === y1) {
      if (y === y0) xs.push(x0, x1);
      return;
    }
    xs.push(x0 + ((y - y0) * (x1 - x0)) / (y1 - y0));
  });
  if (xs.length < 2) return 0;
  return Math.min(STAMP_C - Math.min(...xs), Math.max(...xs) - STAMP_C);
}

/** 수도 별: 나라 이름 끝에서 별 가운데까지, 별 반지름 */
export const STAR_GAP = 6;
export const STAR_R = 2.8;

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

/**
 * 나라 이름 줄의 최대 폭: 그 높이에서 안쪽 테두리 폭에 맞춘다 (육각·팔각은 위쪽이 좁다).
 * 수도는 양옆에 별이 들어갈 자리를 남긴다
 */
function countryWidth(city: City, inner: Outline, y: number): number {
  // 글자 윗부분(대문자 높이)까지 고려해 두 높이 중 좁은 쪽
  const half = Math.min(halfWidthAt(inner, y), halfWidthAt(inner, y - 5));
  const reserve = city.capital ? STAR_GAP + STAR_R + 1 : 0;
  return Math.min(TEXT_W, Math.floor(2 * (half - 3 - reserve)));
}

/** 도장 안 글자 5줄과 가로줄 위치: 나라 / 도시(현지 표기) / 날짜 / ─ / 위도 / 경도 */
export function stampLayout(city: City, date: string | null, shape: StampShape) {
  const { top, gap, inner } = FRAMES[shape];
  const country = (getCountry(city.country)?.name.en ?? city.country).toUpperCase();
  const name = city.name.local.toUpperCase();
  const line = (
    y: number,
    text: string,
    sizes: number[],
    weight: number,
    spacing: number,
    maxW = TEXT_W,
  ): StampLine => {
    const f = fitMono(text, sizes, spacing, maxW);
    return { y, text, size: f.size, weight, letterSpacing: f.letterSpacing, fit: f.fit };
  };
  const nameLine = line(top + 20 * gap, name, [16, 13, 11, 9], 700, 0.18);
  return {
    lines: [
      line(top, country, [6.5, 5.5], 500, 0.3, countryWidth(city, inner, top)),
      nameLine,
      line(top + 36 * gap, date ? stampDate(date) : '· · ·', [10], 500, 0.15),
      line(top + 56 * gap, formatLat(city.lat), [7], 500, 0.14),
      line(top + 66 * gap, formatLon(city.lon), [7], 500, 0.14),
    ],
    rule: { y: top + 44 * gap, half: nameLine.size >= 16 ? 28 : 34 },
  };
}
