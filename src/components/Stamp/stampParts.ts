import { getCountry } from '../../data/cities';
import type { City } from '../../data/types';
import { formatLat, formatLon } from '../../lib/date';
import {
  FRAMES,
  INNER_WIDTH,
  OUTER_WIDTH,
  STAMP_C as C,
  stampLayout,
  type Outline,
  type StampLine,
} from './stampGeometry';
import { fitMono, hash32, type StampShape } from './stampMath';

/** 테두리 장식 (도시마다 고정): 없음 / 톱니 가장자리 / 점 띠 / 둘레 글자(원 전용) */
export const STAMP_ORNAMENTS = ['plain', 'teeth', 'dots', 'arc'] as const;
export type StampOrnament = (typeof STAMP_ORNAMENTS)[number];

/** 장식은 도시 id 해시로 고정. 둘레 글자는 원형 도장에서만 */
export function stampOrnament(cityId: string, shape: StampShape): StampOrnament {
  const n = shape === 'circle' ? 4 : 3;
  return STAMP_ORNAMENTS[hash32(`orn:${cityId}`) % n]!;
}

/** 도장을 이루는 조각. SVG 도장과 캔버스 도장이 같은 목록을 그린다 */
export type StampPart =
  | { kind: 'outline'; outline: Outline; width: number }
  /** 가운데 정렬 글자 한 줄. fit이 있으면 그 폭에 눌러 담는다 */
  | {
      kind: 'text';
      x: number;
      y: number;
      text: string;
      size: number;
      weight: number;
      letterSpacing: number;
      fit: number | undefined;
    }
  /** 둘레를 따라 놓인 글자 하나 (rot은 도) */
  | { kind: 'glyph'; x: number; y: number; rot: number; ch: string; size: number; weight: number }
  | { kind: 'line'; x1: number; y1: number; x2: number; y2: number; width: number }
  | { kind: 'dot'; x: number; y: number; r: number }
  /** 채운 별 (수도 표식) */
  | { kind: 'star'; points: [number, number][] };

const r1 = (n: number) => Math.round(n * 10) / 10;
const pt = (x: number, y: number): [number, number] => [r1(x), r1(y)];

/** 테두리를 다각형 꼭짓점 목록으로 (둥근 모서리는 무시) */
function corners(o: Outline): [number, number][] | null {
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

interface Sample {
  x: number;
  y: number;
  /** 바깥쪽 법선 */
  nx: number;
  ny: number;
}

/** 테두리 위에 고르게 점 n개 (대략). 다각형은 꼭짓점을 포함한다 */
function sampleOutline(o: Outline, spacing: number): Sample[] {
  if (o.kind === 'circle' || o.kind === 'ellipse') {
    const rx = o.kind === 'circle' ? o.r : o.rx;
    const ry = o.kind === 'circle' ? o.r : o.ry;
    // 타원 둘레 근사 (Ramanujan)
    const per = Math.PI * (3 * (rx + ry) - Math.sqrt((3 * rx + ry) * (rx + 3 * ry)));
    const n = Math.max(8, Math.round(per / spacing / 2) * 2);
    return Array.from({ length: n }, (_, i) => {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
      const nx = Math.cos(a) / rx;
      const ny = Math.sin(a) / ry;
      const len = Math.hypot(nx, ny);
      return { x: C + rx * Math.cos(a), y: C + ry * Math.sin(a), nx: nx / len, ny: ny / len };
    });
  }
  const pts = corners(o)!;
  const out: Sample[] = [];
  pts.forEach(([x0, y0], i) => {
    const [x1, y1] = pts[(i + 1) % pts.length]!;
    const len = Math.hypot(x1 - x0, y1 - y0);
    // 모서리 법선: 가운데에서 멀어지는 쪽
    let nx = (y1 - y0) / len;
    let ny = -(x1 - x0) / len;
    if (nx * ((x0 + x1) / 2 - C) + ny * ((y0 + y1) / 2 - C) < 0) {
      nx = -nx;
      ny = -ny;
    }
    const k = Math.max(1, Math.round(len / spacing));
    for (let j = 0; j < k; j++)
      out.push({ x: x0 + ((x1 - x0) * j) / k, y: y0 + ((y1 - y0) * j) / k, nx, ny });
  });
  // 꼭짓점의 법선은 양옆 모서리의 평균
  let start = 0;
  pts.forEach(([x, y]) => {
    const i = out.findIndex((s, idx) => idx >= start && s.x === x && s.y === y);
    if (i < 0) return;
    const prev = out[(i - 1 + out.length) % out.length]!;
    const cur = out[i]!;
    const nx = prev.nx + cur.nx;
    const ny = prev.ny + cur.ny;
    const len = Math.hypot(nx, ny) || 1;
    out[i] = { ...cur, nx: nx / len, ny: ny / len };
    start = i + 1;
  });
  return out;
}

/** 톱니 가장자리: 테두리를 안팎으로 번갈아 꺾은 다각형. 꼭짓점 수가 짝수가 되게 */
function teeth(o: Outline): Outline {
  let s = sampleOutline(o, 3.4);
  if (s.length % 2) s = s.slice(0, -1);
  return {
    kind: 'poly',
    points: s.map((p, i) => {
      const d = i % 2 ? 1.7 : -1.7;
      return pt(p.x + p.nx * d, p.y + p.ny * d);
    }),
  };
}

/** 두 테두리의 한가운데 선 */
function midline(a: Outline, b: Outline): Outline {
  if (a.kind === 'circle' && b.kind === 'circle') return { kind: 'circle', r: (a.r + b.r) / 2 };
  if (a.kind === 'ellipse' && b.kind === 'ellipse')
    return { kind: 'ellipse', rx: (a.rx + b.rx) / 2, ry: (a.ry + b.ry) / 2 };
  const pa = corners(a)!;
  const pb = corners(b)!;
  return { kind: 'poly', points: pa.map(([x, y], i) => pt((x + pb[i]![0]) / 2, (y + pb[i]![1]) / 2)) };
}

/** 5각 별 (바깥 반지름 r) */
function star(x: number, y: number, r: number): [number, number][] {
  return Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.42 : r;
    return pt(x + rr * Math.cos(a), y + rr * Math.sin(a));
  });
}

/** 로마 숫자 (재방문 표식). 40 이상은 아라비아 숫자 */
export function roman(n: number): string {
  if (n >= 40) return String(n);
  const table: [number, string][] = [
    [10, 'X'],
    [9, 'IX'],
    [5, 'V'],
    [4, 'IV'],
    [1, 'I'],
  ];
  let out = '';
  for (const [v, s] of table)
    while (n >= v) {
      out += s;
      n -= v;
    }
  return out;
}

/** 고정폭 글자 폭 (stampMath.fitMono와 같은 계산) */
const monoWidth = (text: string, size: number, spacing: number) =>
  text.length * (size * 0.6 + size * spacing);

const ARC_R = 57;
const ARC_MAX = 2.6; // 둘레 글자가 차지할 최대 각도 (라디안)

/** 원 둘레를 따라 글자를 놓는다. top이면 위쪽(바깥으로 서서), 아니면 아래쪽(똑바로 서서) */
function arcText(text: string, top: boolean, sizes: number[], spacing: number, weight: number) {
  const fit = (size: number) => monoWidth(text, size, spacing) / ARC_R;
  const size = sizes.find((s) => fit(s) <= ARC_MAX) ?? sizes[sizes.length - 1]!;
  const advance = size * 0.6 + size * spacing;
  const step = Math.min(advance / ARC_R, ARC_MAX / text.length);
  const total = step * text.length;
  // 위쪽은 기준선이 안쪽, 아래쪽은 기준선이 바깥쪽이라 반지름을 글자 높이만큼 조정
  const r = top ? ARC_R : ARC_R + size * 0.72;
  const glyphs: StampPart[] = [...text].map((ch, i) => {
    const a = -total / 2 + step * (i + 0.5);
    return top
      ? {
          kind: 'glyph',
          ch,
          size,
          weight,
          x: r1(C + r * Math.sin(a)),
          y: r1(C - r * Math.cos(a)),
          rot: r1((a * 180) / Math.PI),
        }
      : {
          kind: 'glyph',
          ch,
          size,
          weight,
          x: r1(C + r * Math.sin(a)),
          y: r1(C + r * Math.cos(a)),
          rot: r1((-a * 180) / Math.PI),
        };
  });
  return { glyphs, total, size };
}

export interface StampPartsOptions {
  city: City;
  /** 없으면 고스트 도장 (날짜 자리에 점) */
  date: string | null;
  shape: StampShape;
  ornament: StampOrnament;
  /** 이 도시의 몇 번째 방문인지. 2 이상이면 구분선 가운데에 로마 숫자 */
  nth?: number;
}

/** 도장 v3: 이중선 테두리 + 장식 + 타이포 + 표식(수도 별, 재방문 숫자) */
export function stampParts({ city, date, shape, ornament: orn, nth }: StampPartsOptions): StampPart[] {
  const { outer, inner } = FRAMES[shape];
  // 둘레 글자는 원에서만. 점선 고스트 도장의 톱니는 어지러워서 평범한 테두리로
  const ornament: StampOrnament =
    (orn === 'arc' && shape !== 'circle') || (orn === 'teeth' && date === null) ? 'plain' : orn;
  const parts: StampPart[] = [];

  // 테두리
  if (ornament === 'teeth') parts.push({ kind: 'outline', outline: teeth(outer), width: 1.9 });
  else parts.push({ kind: 'outline', outline: outer, width: OUTER_WIDTH });
  parts.push({ kind: 'outline', outline: inner, width: INNER_WIDTH });
  if (ornament === 'dots')
    for (const s of sampleOutline(midline(outer, inner), 5.2))
      parts.push({ kind: 'dot', x: r1(s.x), y: r1(s.y), r: 0.95 });

  const layout = stampLayout(city, date, shape);
  const [countryLine, nameLine, dateLine, latLine, lonLine] = layout.lines as [
    StampLine,
    StampLine,
    StampLine,
    StampLine,
    StampLine,
  ];
  let rule = layout.rule;
  const text = (l: StampLine, y = l.y): StampPart => ({ kind: 'text', x: C, ...l, y });

  if (ornament === 'arc') {
    // 위 둘레: 나라 / 아래 둘레: 좌표 / 가운데: 도시 · 구분선 · 날짜
    const country = (getCountry(city.country)?.name.en ?? city.country).toUpperCase();
    const top = arcText(country, true, [7.5, 6.5, 5.5], 0.3, 500);
    const bottom = arcText(
      `${formatLat(city.lat)} · ${formatLon(city.lon)}`,
      false,
      [6.5, 5.5, 5],
      0.12,
      500,
    );
    parts.push(...top.glyphs, ...bottom.glyphs);
    parts.push(text(nameLine, 75), text(dateLine, 101));
    rule = { y: 86, half: rule.half };
    if (city.capital) {
      const a = top.total / 2 + 0.16;
      const r = ARC_R + top.size * 0.36;
      for (const s of [-1, 1])
        parts.push({ kind: 'star', points: star(C + s * r * Math.sin(a), C - r * Math.cos(a), 3) });
    }
  } else {
    parts.push(text(countryLine), text(nameLine), text(dateLine), text(latLine), text(lonLine));
    if (city.capital) {
      const w = countryLine.fit ?? monoWidth(countryLine.text, countryLine.size, 0.3);
      const y = countryLine.y - countryLine.size * 0.36;
      for (const s of [-1, 1]) parts.push({ kind: 'star', points: star(C + s * (w / 2 + 6), y, 2.8) });
    }
  }

  // 구분선. 재방문이면 가운데를 비우고 로마 숫자
  if (nth && nth >= 2) {
    const label = roman(nth);
    const f = fitMono(label, [7.5], 0.1, 40);
    const gap = monoWidth(label, f.size, 0.1) / 2 + 3;
    parts.push(
      { kind: 'line', x1: C - rule.half, y1: rule.y, x2: C - gap, y2: rule.y, width: 0.8 },
      { kind: 'line', x1: C + gap, y1: rule.y, x2: C + rule.half, y2: rule.y, width: 0.8 },
      {
        kind: 'text',
        x: C,
        y: r1(rule.y + f.size * 0.36),
        text: label,
        size: f.size,
        weight: 700,
        letterSpacing: f.letterSpacing,
        fit: undefined,
      },
    );
  } else
    parts.push({ kind: 'line', x1: C - rule.half, y1: rule.y, x2: C + rule.half, y2: rule.y, width: 0.8 });
  return parts;
}
