export interface Circle {
  x: number;
  y: number;
  r: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function rectsOverlap(a: Rect, b: Rect, pad = 0): boolean {
  return a.x < b.x + b.w + pad && b.x < a.x + a.w + pad && a.y < b.y + b.h + pad && b.y < a.y + a.h + pad;
}

/** 원과 사각형이 겹치는지: 사각형에서 원 중심에 가장 가까운 점까지 거리로 판정 */
export function circleRectOverlap(c: Circle, r: Rect): boolean {
  const nx = Math.max(r.x, Math.min(c.x, r.x + r.w));
  const ny = Math.max(r.y, Math.min(c.y, r.y + r.h));
  return (c.x - nx) ** 2 + (c.y - ny) ** 2 < c.r ** 2;
}

export interface TagBox {
  id: string;
  rect: Rect;
  /** 클수록 먼저 자리를 차지한다 */
  priority: number;
}

/** 원래 자리가 막히면 차례로 시도할 위치 (위·아래·좌·우로 비켜 섬) */
export function candidateOffsets(rect: Rect, lensGap = 0): [number, number][] {
  const dy = rect.h + lensGap;
  const dx = rect.w * 0.75 + lensGap;
  return [
    [0, 0],
    [0, dy],
    [0, -dy],
    [dx, 0],
    [-dx, 0],
  ];
}

/**
 * 보여줄 나라 태그와 위치를 고른다: 렌즈와 겹치면 비켜 보고 그래도 겹치면 숨긴다.
 * 태그끼리 겹치면 우선순위가 높은 쪽만 남긴다. 반환: id → 원래 자리에서 옮긴 거리 [dx, dy]
 */
export function placeTags(tags: TagBox[], lenses: Circle[], gap = 4): Map<string, [number, number]> {
  const placed: Rect[] = [];
  const visible = new Map<string, [number, number]>();
  for (const t of [...tags].sort((a, b) => b.priority - a.priority)) {
    for (const [dx, dy] of candidateOffsets(t.rect, gap)) {
      const rect = { ...t.rect, x: t.rect.x + dx, y: t.rect.y + dy };
      if (lenses.some((l) => circleRectOverlap(l, rect))) continue;
      if (placed.some((p) => rectsOverlap(p, rect, gap))) continue;
      placed.push(rect);
      visible.set(t.id, [dx, dy]);
      break;
    }
  }
  return visible;
}
