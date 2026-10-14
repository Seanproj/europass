/**
 * 국기 퍼즐용 국기 도형 (줄무늬, 십자, 삼각형만. 문장과 엠블럼은 생략)
 * 좌표는 국기 안의 비율: x 0(왼쪽)→1(오른쪽), y 0(위)→1(아래)
 * 아래 hex는 각 나라 국기의 공식 색으로 UI 색이 아닌 데이터라 토큰을 쓰지 않는다.
 * 다크 모드에서는 FLAG_BLACK을 --flag-black으로 바꿔 칠한다 (Phase 3 지도 스타일).
 */

export type Point = [x: number, y: number];

export interface FlagShape {
  color: string;
  polygon: Point[];
}

export interface FlagDef {
  /** 가로:세로 비율 (참고용. 퍼즐에서는 나라 범위에 맞춰 늘린다) */
  ratio: number;
  /** 아래에서 위로 쌓는 순서. 첫 도형은 국기 전체 바탕 */
  shapes: FlagShape[];
}

export const FLAG_BLACK = '#000000';

const rect = (color: string, x0: number, y0: number, x1: number, y1: number): FlagShape => ({
  color,
  polygon: [
    [x0, y0],
    [x1, y0],
    [x1, y1],
    [x0, y1],
  ],
});

const poly = (color: string, ...polygon: Point[]): FlagShape => ({ color, polygon });

/** 가로 줄무늬. weights로 두께 비율 지정 */
function hStripes(colors: string[], weights = colors.map(() => 1)): FlagShape[] {
  const total = weights.reduce((a, b) => a + b, 0);
  let y = 0;
  return colors.map((c, i) => {
    const y0 = y;
    y += weights[i]! / total;
    return rect(c, 0, y0, 1, i === colors.length - 1 ? 1 : y);
  });
}

/** 세로 줄무늬 */
function vStripes(colors: string[], weights = colors.map(() => 1)): FlagShape[] {
  const total = weights.reduce((a, b) => a + b, 0);
  let x = 0;
  return colors.map((c, i) => {
    const x0 = x;
    x += weights[i]! / total;
    return rect(c, x0, 0, i === colors.length - 1 ? 1 : x, 1);
  });
}

/**
 * 북유럽 십자. 치수는 국기 규격의 단위(가로 w, 세로 h)로 받는다
 * cross: [세로 막대 시작, 끝, 가로 막대 시작, 끝]
 */
function nordicCross(
  w: number,
  h: number,
  bg: string,
  outer: { color: string; cross: [number, number, number, number] },
  inner?: { color: string; cross: [number, number, number, number] },
): FlagDef {
  const bars = ({ color, cross: [vx0, vx1, hy0, hy1] }: NonNullable<typeof inner>) => [
    rect(color, vx0 / w, 0, vx1 / w, 1),
    rect(color, 0, hy0 / h, 1, hy1 / h),
  ];
  return { ratio: w / h, shapes: [rect(bg, 0, 0, 1, 1), ...bars(outer), ...(inner ? bars(inner) : [])] };
}

/** (x0,y0)→(x1,y1) 선분을 두께 t(세로 비율 기준)로 감싼 띠 */
function band(
  color: string,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  t: number,
  ratio: number,
): FlagShape {
  const dx = (x1 - x0) * ratio;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy);
  const nx = (-dy / len) * (t / 2);
  const ny = (dx / len) * (t / 2);
  return poly(
    color,
    [x0 + nx / ratio, y0 + ny],
    [x1 + nx / ratio, y1 + ny],
    [x1 - nx / ratio, y1 - ny],
    [x0 - nx / ratio, y0 - ny],
  );
}

/** 원을 근사한 다각형 (y 기준 반지름 r, 가로는 비율 보정) */
function disc(color: string, cx: number, cy: number, r: number, ratio: number, steps = 24): FlagShape {
  const pts: Point[] = [];
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    pts.push([cx + (Math.cos(a) * r) / ratio, cy + Math.sin(a) * r]);
  }
  return poly(color, ...pts);
}

function full(color: string, ratio: number, ...overlays: FlagShape[]): FlagDef {
  return { ratio, shapes: [rect(color, 0, 0, 1, 1), ...overlays] };
}

const WHITE = '#FFFFFF';

function unionJack(): FlagDef {
  const r = 2;
  const blue = '#012169';
  const red = '#C8102E';
  return full(
    blue,
    r,
    band(WHITE, 0, 0, 1, 1, 0.2, r),
    band(WHITE, 0, 1, 1, 0, 0.2, r),
    band(red, 0, 0, 1, 1, 0.067, r),
    band(red, 0, 1, 1, 0, 0.067, r),
    rect(WHITE, 0.4167, 0, 0.5833, 1),
    rect(WHITE, 0, 0.3333, 1, 0.6667),
    rect(red, 0.45, 0, 0.55, 1),
    rect(red, 0, 0.4, 1, 0.6),
  );
}

function greece(): FlagDef {
  const blue = '#0D5EAF';
  const stripes = hStripes(Array.from({ length: 9 }, (_, i) => (i % 2 === 0 ? blue : WHITE)));
  // 캔턴: 세로 5/9, 가로는 정사각형 (국기 비율 3:2)
  const cw = (5 / 9) * (2 / 3);
  return {
    ratio: 1.5,
    shapes: [
      ...stripes,
      rect(blue, 0, 0, cw, 5 / 9),
      rect(WHITE, 0, 2 / 9, cw, 3 / 9),
      rect(WHITE, cw / 2 - ((1 / 9) * (2 / 3)) / 2, 0, cw / 2 + ((1 / 9) * (2 / 3)) / 2, 5 / 9),
    ],
  };
}

function northMacedonia(): FlagDef {
  const r = 2;
  const yellow = '#FFE600';
  const c: Point = [0.5, 0.5];
  // 태양 광선 8개: 네 모서리와 네 변 가운데로 퍼지는 쐐기
  const ray = (tx: number, ty: number, spread: number): FlagShape => {
    const ang = Math.atan2(ty - c[1], (tx - c[0]) * r);
    const px = (Math.cos(ang + Math.PI / 2) * spread) / r;
    const py = Math.sin(ang + Math.PI / 2) * spread;
    return poly(yellow, c, [tx + px, ty + py], [tx - px, ty - py]);
  };
  return full(
    '#D20000',
    r,
    ray(0, 0, 0.12),
    ray(1, 0, 0.12),
    ray(0, 1, 0.12),
    ray(1, 1, 0.12),
    ray(0.5, 0, 0.09),
    ray(0.5, 1, 0.09),
    ray(0, 0.5, 0.09),
    ray(1, 0.5, 0.09),
    disc('#D20000', 0.5, 0.5, 0.15, r),
    disc(yellow, 0.5, 0.5, 0.125, r),
  );
}

export const FLAGS: Record<string, FlagDef> = {
  AD: { ratio: 10 / 7, shapes: vStripes(['#10069F', '#FEDD00', '#D50032'], [8, 9, 8]) },
  AL: full('#E41E20', 7 / 5),
  AT: { ratio: 1.5, shapes: hStripes(['#C8102E', WHITE, '#C8102E']) },
  BA: full('#002395', 2, poly('#FECB00', [0.265, 0], [0.735, 0], [0.735, 1])),
  BE: { ratio: 15 / 13, shapes: vStripes([FLAG_BLACK, '#FDDA24', '#EF3340']) },
  BG: { ratio: 5 / 3, shapes: hStripes([WHITE, '#00966E', '#D62612']) },
  CH: full(
    '#DA291C',
    1,
    rect(WHITE, 13 / 32, 6 / 32, 19 / 32, 26 / 32),
    rect(WHITE, 6 / 32, 13 / 32, 26 / 32, 19 / 32),
  ),
  // 섬 윤곽은 단순한 다각형으로 대신
  CY: full(
    WHITE,
    1.5,
    poly(
      '#D57800',
      [0.2, 0.42],
      [0.3, 0.33],
      [0.5, 0.36],
      [0.68, 0.3],
      [0.82, 0.22],
      [0.74, 0.34],
      [0.66, 0.46],
      [0.48, 0.55],
      [0.3, 0.52],
    ),
  ),
  CZ: { ratio: 1.5, shapes: [...hStripes([WHITE, '#D7141A']), poly('#11457E', [0, 0], [0.5, 0.5], [0, 1])] },
  DE: { ratio: 5 / 3, shapes: hStripes([FLAG_BLACK, '#DD0000', '#FFCE00']) },
  DK: nordicCross(37, 28, '#C8102E', { color: WHITE, cross: [12, 16, 12, 16] }),
  EE: { ratio: 11 / 7, shapes: hStripes(['#0072CE', FLAG_BLACK, WHITE]) },
  ES: { ratio: 1.5, shapes: hStripes(['#AA151B', '#F1BF00', '#AA151B'], [1, 2, 1]) },
  FI: nordicCross(18, 11, WHITE, { color: '#002F6C', cross: [5, 8, 4, 7] }),
  FR: { ratio: 1.5, shapes: vStripes(['#002654', WHITE, '#ED2939']) },
  GB: unionJack(),
  GR: greece(),
  HR: { ratio: 2, shapes: hStripes(['#FF0000', WHITE, '#171796']) },
  HU: { ratio: 2, shapes: hStripes(['#CD2A3E', WHITE, '#436F4D']) },
  IE: { ratio: 2, shapes: vStripes(['#169B62', WHITE, '#FF883E']) },
  IS: nordicCross(
    25,
    18,
    '#02529C',
    { color: WHITE, cross: [7, 11, 7, 11] },
    { color: '#DC1E35', cross: [8, 10, 8, 10] },
  ),
  IT: { ratio: 1.5, shapes: vStripes(['#009246', WHITE, '#CE2B37']) },
  LI: { ratio: 5 / 3, shapes: hStripes(['#002B7F', '#CE1126']) },
  LT: { ratio: 5 / 3, shapes: hStripes(['#FDB913', '#006A44', '#C1272D']) },
  LU: { ratio: 5 / 3, shapes: hStripes(['#EA141D', WHITE, '#51ADDA']) },
  LV: { ratio: 2, shapes: hStripes(['#9E3039', WHITE, '#9E3039'], [2, 1, 2]) },
  MC: { ratio: 5 / 4, shapes: hStripes(['#CE1126', WHITE]) },
  ME: full('#D4AF3A', 2, rect('#C40308', 0.025, 0.05, 0.975, 0.95)),
  MK: northMacedonia(),
  MT: { ratio: 1.5, shapes: vStripes([WHITE, '#CF142B']) },
  NL: { ratio: 1.5, shapes: hStripes(['#AE1C28', WHITE, '#21468B']) },
  NO: nordicCross(
    22,
    16,
    '#BA0C2F',
    { color: WHITE, cross: [6, 10, 6, 10] },
    { color: '#00205B', cross: [7, 9, 7, 9] },
  ),
  PL: { ratio: 8 / 5, shapes: hStripes([WHITE, '#DC143C']) },
  PT: { ratio: 1.5, shapes: vStripes(['#046A38', '#DA291C'], [2, 3]) },
  RO: { ratio: 1.5, shapes: vStripes(['#002B7F', '#FCD116', '#CE1126']) },
  RS: { ratio: 1.5, shapes: hStripes(['#C6363C', '#0C4076', WHITE]) },
  SE: nordicCross(16, 10, '#006AA7', { color: '#FECC00', cross: [5, 7, 4, 6] }),
  SI: { ratio: 2, shapes: hStripes([WHITE, '#005DA4', '#ED1C24']) },
  SK: { ratio: 1.5, shapes: hStripes([WHITE, '#0B4EA2', '#EE1C25']) },
  SM: { ratio: 4 / 3, shapes: hStripes([WHITE, '#5EB6E4']) },
  XK: full('#244AA5', 1.4),
};
