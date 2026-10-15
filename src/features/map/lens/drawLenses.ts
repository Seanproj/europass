import { rectsOverlap, type Circle, type Rect } from '../tags/collision';

export interface LensItem {
  cityId: string;
  x: number;
  y: number;
  r: number;
  /** maskLens로 만든 원형 이미지. 아직 없으면 null (그리지 않고 태그만) */
  image: HTMLCanvasElement | null;
  name: string;
  visits: number;
  home: boolean;
  /** 다른 렌즈와 겹쳐 렌즈 대신 점으로 그린다 */
  dot?: boolean;
}

export interface TagColors {
  bg: string;
  text: string;
  badge: string;
  home: string;
  font: string;
  /** 겹쳐서 점으로 줄인 도시 */
  dot: string;
}

const TAG_H = 22;
const TAG_PAD = 9;
const BADGE_R = 8;

/**
 * 렌즈와 도시명 태그를 오버레이 캔버스에 그린다. 반환: 태그 충돌 판정용 원.
 * imageAlpha: 렌즈 그림만의 불투명도 (도장 배지에서 렌즈로 바뀌는 중), 태그는 alpha
 */
export function drawLenses(
  ctx: CanvasRenderingContext2D,
  items: LensItem[],
  alpha: number,
  c: TagColors,
  imageAlpha = alpha,
): Circle[] {
  const circles: Circle[] = [];
  if (alpha <= 0) return circles;
  ctx.save();
  ctx.globalAlpha = imageAlpha;
  for (const it of items) {
    if (it.dot) {
      ctx.fillStyle = c.dot;
      ctx.beginPath();
      ctx.arc(it.x, it.y, 4, 0, Math.PI * 2);
      ctx.fill();
    } else if (it.image) ctx.drawImage(it.image, it.x - it.r, it.y - it.r, it.r * 2, it.r * 2);
    circles.push({ x: it.x, y: it.y, r: it.dot ? 8 : it.r });
  }
  ctx.globalAlpha = alpha;
  ctx.font = `600 12px ${c.font}`;
  ctx.textBaseline = 'middle';
  // 태그끼리 겹치면 홈 도시 → 자주 간 도시 → 큰 도시 순으로 남긴다
  const placed: Rect[] = [];
  const order = [...items].sort(
    (a, b) => Number(b.home) - Number(a.home) || b.visits - a.visits || b.r - a.r,
  );
  for (const it of order) {
    const rect = tagRect(ctx, it);
    if (placed.some((p) => rectsOverlap(p, rect, 2))) continue;
    placed.push(rect);
    drawTag(ctx, it, rect, c);
  }
  ctx.restore();
  return circles;
}

// 도시 이름 폭은 매 프레임 재지 않고 기억해 둔다
const textWidth = new Map<string, number>();
function measure(ctx: CanvasRenderingContext2D, text: string): number {
  const key = `${ctx.font}|${text}`;
  let w = textWidth.get(key);
  if (w === undefined) {
    w = ctx.measureText(text).width;
    textWidth.set(key, w);
  }
  return w;
}

function tagRect(ctx: CanvasRenderingContext2D, it: LensItem): Rect {
  const w = TAG_PAD * 2 + measure(ctx, it.name) + (it.visits >= 2 ? BADGE_R * 2 + 5 : 0);
  // 작은 도장 배지·점은 가리지 않게 위에, 렌즈는 렌즈 윗부분에 걸쳐
  const above = it.dot ? 6 + TAG_H / 2 : it.r < 20 ? it.r + 2 + TAG_H / 2 : it.r * 0.62;
  return { x: it.x - w / 2, y: it.y - above - TAG_H / 2, w, h: TAG_H };
}

/** 검정 반투명 알약 (홈 도시는 --accent), 2번 이상 방문하면 오른쪽에 횟수 배지 */
function drawTag(ctx: CanvasRenderingContext2D, it: LensItem, { x, y, w }: Rect, c: TagColors) {
  const badge = it.visits >= 2;
  ctx.fillStyle = it.home ? c.home : c.bg;
  ctx.beginPath();
  ctx.roundRect(x, y, w, TAG_H, TAG_H / 2);
  ctx.fill();
  ctx.fillStyle = c.text;
  ctx.textAlign = 'left';
  ctx.fillText(it.name, x + TAG_PAD, y + TAG_H / 2 + 0.5);
  if (badge) {
    const bx = x + w - TAG_PAD / 2 - BADGE_R - 1;
    const by = y + TAG_H / 2;
    ctx.fillStyle = c.badge;
    ctx.beginPath();
    ctx.arc(bx, by, BADGE_R, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = c.text;
    ctx.textAlign = 'center';
    ctx.font = `700 10px ${c.font}`;
    ctx.fillText(String(it.visits), bx, by + 0.5);
    ctx.font = `600 12px ${c.font}`;
  }
}
