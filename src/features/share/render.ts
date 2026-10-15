import { josa } from 'es-hangul';
import { drawStamp } from '../../components/Stamp/drawStamp';
import { getCountry } from '../../data/cities';
import { drawCover, roundRectPath, type Ctx } from '../../lib/canvas';
import { dotDate } from '../../lib/date';
import type { ProjectedPuzzle } from '../map/puzzle/data';
import { puzzleColor } from '../map/puzzle/puzzle';
import type {
  CityCardData,
  CountryCardData,
  MilestoneCardData,
  StampItem,
  SummaryCardData,
  WrapData,
} from './cardData';
import type { CardTheme } from './theme';

/** 카드 크기 (px) */
export const FEED = { w: 1080, h: 1350 } as const;
export const STORY = { w: 1080, h: 1920 } as const;
const PAD = 72;

const num = new Intl.NumberFormat('ko-KR');

interface TextOpts {
  size: number;
  weight?: number;
  color: string;
  align?: CanvasTextAlign;
  family: string;
  /** 넘치면 말줄임 */
  maxWidth?: number;
  spacing?: number;
}

function text(ctx: Ctx, s: string, x: number, y: number, o: TextOpts) {
  ctx.font = `${o.weight ?? 500} ${o.size}px ${o.family}`;
  ctx.fillStyle = o.color;
  ctx.textAlign = o.align ?? 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.letterSpacing = `${o.spacing ?? 0}px`;
  let out = s;
  if (o.maxWidth && ctx.measureText(out).width > o.maxWidth) {
    while (out.length > 1 && ctx.measureText(`${out}…`).width > o.maxWidth) out = out.slice(0, -1);
    out = `${out.trimEnd()}…`;
  }
  ctx.fillText(out, x, y);
  ctx.letterSpacing = '0px';
}

function stamp(
  ctx: Ctx,
  t: CardTheme,
  item: StampItem,
  x: number,
  y: number,
  size: number,
  alpha = 1,
  paper = t.surface,
  outlineOnly = false,
) {
  drawStamp(ctx, {
    outlineOnly,
    city: item.city,
    visit: item.visit,
    nth: item.nth,
    x,
    y,
    size,
    ink: item.city.gem ? t.gold : t.accent,
    paper,
    mono: t.mono,
    alpha,
  });
}

/** 카드 맨 아래 줄: 왼쪽 이름, 오른쪽 날짜 */
function footer(ctx: Ctx, t: CardTheme, w: number, y: number, left: string, date: string) {
  text(ctx, left, PAD, y, { size: 30, weight: 700, color: t.text, family: t.font, maxWidth: w / 2 });
  text(ctx, `Euro Passport · ${dotDate(date)}`, w - PAD, y, {
    size: 26,
    color: t.text2,
    family: t.font,
    align: 'right',
  });
}

/** 숫자 3개 (값 + 이름). 거리는 자릿수가 많아 칸을 넓게 */
function numbers(
  ctx: Ctx,
  t: CardTheme,
  items: [string, string][],
  x: number,
  y: number,
  w: number,
  size: number,
) {
  const weights = items.map((_, i) => (i === items.length - 1 ? 1.6 : 1));
  const unit = w / weights.reduce((a, b) => a + b, 0);
  let cx = x;
  items.forEach(([value, label], i) => {
    const col = unit * weights[i]!;
    text(ctx, value, cx, y, {
      size,
      weight: 700,
      color: t.text,
      family: t.font,
      spacing: -size * 0.02,
      maxWidth: col - 16,
    });
    text(ctx, label, cx, y + size * 0.55, { size: Math.round(size * 0.3), color: t.text2, family: t.font });
    cx += col;
  });
}

/** 도장을 칸에 맞춰 줄지어 놓는다. 넘치면 마지막 칸에 "+N" */
function stampGrid(
  ctx: Ctx,
  t: CardTheme,
  items: StampItem[],
  x: number,
  y: number,
  w: number,
  cols: number,
  rows: number,
  size: number,
  rowGap: number,
  paper = t.surface,
) {
  const cell = w / cols;
  const max = cols * rows;
  const shown = items.length > max ? items.slice(0, max - 1) : items;
  shown.forEach((it, i) => {
    const cx = x + cell * (i % cols) + cell / 2;
    const cy = y + Math.floor(i / cols) * (size + rowGap) + size / 2;
    stamp(ctx, t, it, cx, cy, size, 1, paper);
  });
  if (items.length > max) {
    const i = max - 1;
    const cx = x + cell * (i % cols) + cell / 2;
    const cy = y + Math.floor(i / cols) * (size + rowGap) + size / 2;
    text(ctx, `+${items.length - shown.length}`, cx, cy + size * 0.12, {
      size: Math.round(size * 0.3),
      weight: 700,
      color: t.text2,
      family: t.font,
      align: 'center',
    });
  }
}

/** 안개 지도 스냅샷 (없으면 육지색 바탕) */
function mapBackground(ctx: Ctx, t: CardTheme, map: CanvasImageSource | null, w: number, h: number) {
  ctx.fillStyle = t.land;
  ctx.fillRect(0, 0, w, h);
  if (map) drawCover(ctx, map, 0, 0, w, h);
}

function panel(ctx: Ctx, t: CardTheme, y: number, w: number, h: number) {
  ctx.fillStyle = t.surface;
  roundRectPath(ctx, 0, y, w, h - y + 1, [48, 48, 0, 0]);
  ctx.fill();
}

function summaryNumbers(d: SummaryCardData): [string, string][] {
  return [
    [num.format(d.stats.cities), '도시'],
    [num.format(d.stats.countries), '나라'],
    [num.format(d.stats.km), '이동거리 km'],
  ];
}

/** 피드 4:5 — 위는 안개 지도, 아래 판에 숫자 3개 · 최근 도장 6개 · 이름과 날짜 */
export function drawFeedCard(ctx: Ctx, d: SummaryCardData, t: CardTheme, map: CanvasImageSource | null) {
  const { w, h } = FEED;
  mapBackground(ctx, t, map, w, h);
  const top = 720;
  panel(ctx, t, top, w, h);
  numbers(ctx, t, summaryNumbers(d), PAD, top + 132, w - PAD * 2, 88);
  if (d.stamps.length) stampGrid(ctx, t, d.stamps, PAD, top + 230, w - PAD * 2, 6, 1, 140, 0);
  else emptyStamps(ctx, t, top + 310, w);
  footer(ctx, t, w, h - 64, `${d.name}의 유럽`, d.date);
}

/** 스토리 9:16 — 같은 내용을 세로로: 이름이 위, 도장은 3×2 */
export function drawStoryCard(ctx: Ctx, d: SummaryCardData, t: CardTheme, map: CanvasImageSource | null) {
  const { w, h } = STORY;
  mapBackground(ctx, t, map, w, h);
  const top = 900;
  panel(ctx, t, top, w, h);
  text(ctx, `${d.name}의 유럽`, PAD, top + 120, {
    size: 60,
    weight: 700,
    color: t.text,
    family: t.font,
    maxWidth: w - PAD * 2,
  });
  numbers(ctx, t, summaryNumbers(d), PAD, top + 280, w - PAD * 2, 104);
  if (d.stamps.length) stampGrid(ctx, t, d.stamps, PAD, top + 400, w - PAD * 2, 3, 2, 210, 30);
  else emptyStamps(ctx, t, top + 560, w);
  text(ctx, `Euro Passport · ${dotDate(d.date)}`, PAD, h - 72, { size: 28, color: t.text2, family: t.font });
}

function emptyStamps(ctx: Ctx, t: CardTheme, y: number, w: number) {
  text(ctx, '첫 도장을 기다리는 중', w / 2, y, { size: 36, color: t.text2, family: t.font, align: 'center' });
}

function puzzle(ctx: Ctx, t: CardTheme, p: ProjectedPuzzle, painted: Set<string>, x: number, y: number) {
  const path = (rings: [number, number][][]) => {
    ctx.beginPath();
    for (const ring of rings) {
      ring.forEach(([px, py], i) => (i ? ctx.lineTo(x + px, y + py) : ctx.moveTo(x + px, y + py)));
      ctx.closePath();
    }
  };
  ctx.fillStyle = t.land;
  for (const r of p.regions) {
    path(r.rings);
    ctx.fill();
  }
  for (const piece of p.pieces) {
    if (!painted.has(piece.regionId)) continue;
    ctx.fillStyle = puzzleColor(piece.color, t.flagBlack);
    path(piece.rings);
    ctx.fill();
  }
  // 흰 줄무늬 조각도 판 위에서 보이게 조각 경계를 선으로
  ctx.strokeStyle = t.text2;
  ctx.globalAlpha = 0.5;
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  for (const r of p.regions) {
    path(r.rings);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

/** 원형 국기 */
function flagCircle(
  ctx: Ctx,
  img: CanvasImageSource | null,
  cx: number,
  cy: number,
  r: number,
  t: CardTheme,
) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = t.line;
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  if (img) ctx.drawImage(img, cx - r, cy - r, r * 2, r * 2);
  ctx.restore();
}

/** 국가 카드 4:5 — 국기 퍼즐(칠한 조각) + 그 나라 도장 모음. 완성한 나라는 "완성" */
export function drawCountryCard(
  ctx: Ctx,
  d: CountryCardData,
  t: CardTheme,
  assets: { flag: CanvasImageSource | null; puzzle: ProjectedPuzzle | null },
) {
  const { w, h } = FEED;
  ctx.fillStyle = t.bg;
  ctx.fillRect(0, 0, w, h);

  flagCircle(ctx, assets.flag, PAD + 44, 132, 44, t);
  text(ctx, d.name, PAD + 112, 160, { size: 76, weight: 700, color: t.text, family: t.font, maxWidth: 560 });
  if (d.complete) {
    ctx.fillStyle = t.accent;
    roundRectPath(ctx, w - PAD - 150, 100, 150, 64, 32);
    ctx.fill();
    text(ctx, '완성', w - PAD - 75, 143, {
      size: 32,
      weight: 700,
      color: t.onAccent,
      family: t.font,
      align: 'center',
    });
  }
  text(ctx, `도시 ${d.cities}/${d.totalCities} · 국기 조각 ${d.painted.size}/${d.pieces}`, PAD, 236, {
    size: 32,
    color: t.text2,
    family: t.font,
  });

  // 국기 퍼즐 판
  const box = { x: PAD, y: 280, w: w - PAD * 2, h: 540 };
  ctx.fillStyle = t.surface;
  roundRectPath(ctx, box.x, box.y, box.w, box.h, 40);
  ctx.fill();
  if (assets.puzzle) puzzle(ctx, t, assets.puzzle, d.painted, box.x + 48, box.y + 40);

  stampGrid(ctx, t, d.stamps, PAD, 868, w - PAD * 2, 5, 2, 160, 20, t.bg);
  footer(ctx, t, w, h - 64, d.owner, d.date);
}

/** 도시 카드 4:5 — "프라하와 나 · 3번의 방문": 쌓인 도장 + 방문 날짜들 + 사진 1장 */
export function drawCityCard(ctx: Ctx, d: CityCardData, t: CardTheme, photo: CanvasImageSource | null) {
  const { w, h } = FEED;
  ctx.fillStyle = t.bg;
  ctx.fillRect(0, 0, w, h);
  let y = 150;
  if (photo) {
    ctx.save();
    roundRectPath(ctx, PAD, PAD, w - PAD * 2, 470, 40);
    ctx.clip();
    drawCover(ctx, photo, PAD, PAD, w - PAD * 2, 470);
    ctx.restore();
    y = PAD + 470 + 110;
  }
  const country = getCountry(d.city.country)?.name.ko ?? d.city.country;
  text(ctx, `${josa(d.city.name.ko, '와/과')} 나`, PAD, y, {
    size: 80,
    weight: 700,
    color: t.text,
    family: t.font,
    maxWidth: w - PAD * 2,
  });
  text(ctx, `${d.visits.length}번의 방문 · ${country}`, PAD, y + 62, {
    size: 34,
    color: t.text2,
    family: t.font,
  });

  // 쌓인 도장: 최신이 맨 위, 이전 도장은 옅게 아래로 비껴서
  const size = photo ? 330 : 420;
  const cx = PAD + size / 2 + 40;
  const cy = y + 120 + size / 2;
  const shown = d.visits.slice(-5);
  shown.forEach((v, i) => {
    const depth = shown.length - 1 - i;
    stamp(
      ctx,
      t,
      { city: d.city, visit: v, nth: d.visits.length - depth },
      // 도시 상세의 도장 스택과 같은 비율로 좌우 번갈아 비껴 놓는다 (132px 기준 → size 비율)
      cx + (depth === 0 ? 0 : (depth % 2 ? -1 : 1) * (10 + depth * 6) * (size / 132)),
      cy + depth * 5 * (size / 132),
      size,
      depth === 0 ? 1 : Math.max(0.12, 0.34 - depth * 0.07),
      t.bg,
      // 아래 깔린 도장은 테두리만 (글자가 겹쳐 지저분해지지 않게)
      depth > 0,
    );
  });

  // 방문 날짜들 (오래된 순, 많으면 최근 6번)
  const listX = PAD + size + 120;
  const rows = d.visits.length > 6 ? d.visits.slice(-6) : d.visits;
  const skipped = d.visits.length - rows.length;
  rows.forEach((v, i) => {
    const ry = y + 170 + i * (photo ? 50 : 64);
    const nth = skipped + i + 1;
    text(ctx, `${nth}`, listX, ry, { size: 26, weight: 700, color: t.text2, family: t.mono });
    text(ctx, dotDate(v.date), listX + 52, ry, { size: 32, weight: 600, color: t.text, family: t.font });
  });
  footer(ctx, t, w, h - 64, d.owner, d.date);
}

/**
 * 기념 카드 4:5 — 머리글 알약 + 큰 국기(또는 큰 숫자) + 제목 + 그 순간의 도장.
 * 국기 둘레와 숫자 뒤에는 도장 잉크색 빛살
 */
export function drawMilestoneCard(
  ctx: Ctx,
  d: MilestoneCardData,
  t: CardTheme,
  flag: CanvasImageSource | null,
) {
  const { w, h } = FEED;
  const cx = w / 2;
  ctx.fillStyle = t.bg;
  ctx.fillRect(0, 0, w, h);

  // 빛살: 가운데에서 퍼지는 가는 쐐기 24개
  const heroY = 400;
  ctx.save();
  ctx.fillStyle = t.accent;
  ctx.globalAlpha = 0.1;
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, heroY);
    ctx.lineTo(cx + Math.cos(a - 0.05) * 520, heroY + Math.sin(a - 0.05) * 520);
    ctx.lineTo(cx + Math.cos(a + 0.05) * 520, heroY + Math.sin(a + 0.05) * 520);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // 머리글 알약
  ctx.font = `700 32px ${t.font}`;
  const pillW = ctx.measureText(d.text.label).width + 64;
  ctx.fillStyle = t.accent;
  roundRectPath(ctx, cx - pillW / 2, 96, pillW, 64, 32);
  ctx.fill();
  text(ctx, d.text.label, cx, 139, {
    size: 32,
    weight: 700,
    color: t.onAccent,
    family: t.font,
    align: 'center',
  });

  if (d.country) {
    // 국기 둘레 바탕 고리
    ctx.fillStyle = t.surface;
    ctx.beginPath();
    ctx.arc(cx, heroY, 176, 0, Math.PI * 2);
    ctx.fill();
    flagCircle(ctx, flag, cx, heroY, 160, t);
  } else if (d.count !== null) {
    text(ctx, num.format(d.count), cx, heroY + 110, {
      size: 320,
      weight: 800,
      color: t.accent,
      family: t.font,
      align: 'center',
      spacing: -12,
    });
  }

  text(ctx, d.text.title, cx, 700, {
    size: 84,
    weight: 700,
    color: t.text,
    family: t.font,
    align: 'center',
    maxWidth: w - PAD * 2,
  });
  const sub = [d.text.sub, ...d.also].join(' · ');
  text(ctx, sub, cx, 770, {
    size: 36,
    color: t.text2,
    family: t.font,
    align: 'center',
    maxWidth: w - PAD * 2,
  });

  stamp(ctx, t, d.stamp, cx, 1000, 300, 1, t.bg);
  footer(ctx, t, w, h - 64, d.owner, d.date);
}

// ── 연말 결산 ─────────────────────────────────────────

export const WRAP_SLIDES = ['numbers', 'farthest', 'country', 'months', 'collection'] as const;
export type WrapSlide = (typeof WRAP_SLIDES)[number];

/** 기록이 없는 해는 첫 장만. 출발지를 정하지 않았으면 "가장 먼 곳"은 뺀다 */
export function wrapSlides(d: WrapData): WrapSlide[] {
  if (d.visits === 0) return ['numbers'];
  return WRAP_SLIDES.filter((s) => s !== 'farthest' || d.farthest);
}

const MONTHS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];

function wrapFrame(ctx: Ctx, t: CardTheme, d: WrapData, title: string, page: number, total: number) {
  const { w, h } = STORY;
  ctx.fillStyle = t.bg;
  ctx.fillRect(0, 0, w, h);
  text(ctx, `MY EURO YEAR ${d.year}`, PAD, 150, {
    size: 30,
    weight: 700,
    color: t.accent,
    family: t.mono,
    spacing: 3,
  });
  text(ctx, title, PAD, 250, { size: 64, weight: 700, color: t.text, family: t.font, maxWidth: w - PAD * 2 });
  text(ctx, `${d.name}`, PAD, h - 90, {
    size: 30,
    weight: 700,
    color: t.text,
    family: t.font,
    maxWidth: 600,
  });
  text(ctx, `${page} / ${total}`, w - PAD, h - 90, {
    size: 28,
    color: t.text2,
    family: t.mono,
    align: 'right',
  });
}

/** 결산 한 장 (9:16) */
export function drawWrapSlide(
  ctx: Ctx,
  slide: WrapSlide,
  d: WrapData,
  t: CardTheme,
  assets: { flag: CanvasImageSource | null },
) {
  const slides = wrapSlides(d);
  const page = slides.indexOf(slide) + 1;
  const { w } = STORY;
  const inner = w - PAD * 2;

  if (slide === 'numbers') {
    wrapFrame(ctx, t, d, `${d.year}년의 여행`, page, slides.length);
    if (d.visits === 0) {
      text(ctx, '올해는 아직 기록이 없어요', PAD, 520, { size: 44, color: t.text2, family: t.font });
      return;
    }
    const cells: [string, string][] = [
      [num.format(d.cities), '도시'],
      [num.format(d.countries), '나라'],
      [num.format(d.visits), '번의 방문'],
      [num.format(d.km), 'km 이동'],
    ];
    // 한 줄에 하나씩 (거리는 자릿수가 많아 반 칸에 안 들어간다)
    cells.forEach(([v, label], i) => {
      const y = 560 + i * 300;
      text(ctx, v, PAD, y, {
        size: 150,
        weight: 700,
        color: t.text,
        family: t.font,
        spacing: -3,
        maxWidth: inner,
      });
      text(ctx, label, PAD, y + 72, { size: 40, color: t.text2, family: t.font });
    });
    return;
  }

  if (slide === 'farthest' && d.farthest) {
    wrapFrame(ctx, t, d, '가장 먼 곳', page, slides.length);
    stamp(ctx, t, d.farthest, w / 2, 820, 560, 1, t.bg);
    text(ctx, d.farthest.city.name.ko, w / 2, 1270, {
      size: 104,
      weight: 700,
      color: t.text,
      family: t.font,
      align: 'center',
      maxWidth: inner,
    });
    const from = d.home ? `${d.home.name}에서 ` : '';
    text(ctx, `${from}${num.format(d.farthest.km)}km`, w / 2, 1350, {
      size: 44,
      color: t.text2,
      family: t.font,
      align: 'center',
    });
    return;
  }

  if (slide === 'country' && d.topCountry) {
    const c = d.topCountry;
    wrapFrame(ctx, t, d, '가장 많이 간 나라', page, slides.length);
    flagCircle(ctx, assets.flag, w / 2, 520, 120, t);
    text(ctx, c.name, w / 2, 790, { size: 112, weight: 700, color: t.text, family: t.font, align: 'center' });
    text(ctx, `${c.visits}번 방문 · 도시 ${c.cities}곳`, w / 2, 870, {
      size: 44,
      color: t.text2,
      family: t.font,
      align: 'center',
    });
    stampGrid(ctx, t, c.stamps, PAD, 1000, inner, 3, 2, 250, 40, t.bg);
    return;
  }

  if (slide === 'months') {
    wrapFrame(ctx, t, d, '달마다 얼마나 떠났나', page, slides.length);
    const max = Math.max(1, ...d.months);
    const best = d.months.indexOf(Math.max(...d.months));
    const chart = { x: PAD, y: 520, w: inner, h: 900 };
    const col = chart.w / 12;
    const bw = col * 0.62;
    d.months.forEach((v, i) => {
      const bh = v === 0 ? 6 : (v / max) * chart.h;
      const x = chart.x + col * i + (col - bw) / 2;
      const y = chart.y + chart.h - bh;
      ctx.fillStyle = i === best && v > 0 ? t.accent : v === 0 ? t.line : t.text2;
      roundRectPath(ctx, x, y, bw, bh, Math.min(12, bw / 2, bh / 2));
      ctx.fill();
      if (v > 0) {
        text(ctx, String(v), x + bw / 2, y - 20, {
          size: 34,
          weight: 700,
          color: i === best ? t.accent : t.text,
          family: t.font,
          align: 'center',
        });
      }
      text(ctx, MONTHS[i]!, x + bw / 2, chart.y + chart.h + 56, {
        size: 30,
        color: t.text2,
        family: t.font,
        align: 'center',
      });
    });
    text(ctx, `가장 바빴던 달은 ${best + 1}월 · ${d.months[best]}번`, PAD, chart.y + chart.h + 180, {
      size: 44,
      weight: 600,
      color: t.text,
      family: t.font,
    });
    return;
  }

  // collection
  wrapFrame(ctx, t, d, `올해의 도장 ${d.collection.length}개`, page, slides.length);
  stampGrid(ctx, t, d.collection, PAD, 360, inner, 4, 6, 200, 26, t.bg);
}

/** 결산 장마다 이미지 대신 읽어 줄 글 */
export function wrapAlt(slide: WrapSlide, d: WrapData): string {
  if (slide === 'numbers') {
    if (d.visits === 0) return `${d.year}년: 아직 기록이 없어요`;
    return `${d.year}년의 여행: 도시 ${d.cities}곳, 나라 ${d.countries}개, 방문 ${d.visits}번, ${num.format(d.km)}km 이동`;
  }
  if (slide === 'farthest' && d.farthest) {
    const from = d.home ? `${d.home.name}에서 ` : '';
    return `가장 먼 곳: ${d.farthest.city.name.ko}, ${from}${num.format(d.farthest.km)}km`;
  }
  if (slide === 'country' && d.topCountry) {
    return `가장 많이 간 나라: ${d.topCountry.name}, ${d.topCountry.visits}번 방문, 도시 ${d.topCountry.cities}곳`;
  }
  if (slide === 'months') {
    return `달마다 방문: ${d.months.map((v, i) => `${i + 1}월 ${v}번`).join(', ')}`;
  }
  return `올해의 도장 ${d.collection.length}개: ${d.collection.map((s) => s.city.name.ko).join(', ')}`;
}
