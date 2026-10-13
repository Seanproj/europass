import type { SheetSnap } from '../../app/store';

/** peek 높이: 핸들(28) + 검색창(50) + 국기 줄(16 + 30) + 아래 여백(16). 홈 인디케이터 영역은 따로 더함 */
export const PEEK_HEIGHT = 140;
/** full일 때 위쪽에 남겨둘 여백 (진행률 알약이 보이도록) */
export const TOP_GAP = 68;

export function snapHeights(viewport: number, safeTop = 0, safeBottom = 0): Record<SheetSnap, number> {
  const peek = PEEK_HEIGHT + safeBottom;
  const full = Math.max(peek, viewport - TOP_GAP - safeTop);
  const half = Math.min(full, Math.max(peek + 120, Math.round(viewport * 0.55)));
  return { peek, half, full };
}

/**
 * 드래그를 놓았을 때 갈 단계 — 현재 보이는 높이에 손을 놓는 속도를 더해 가장 가까운 단계로.
 * velocityY는 아래로가 +, 높이는 위로가 + 이므로 부호를 뒤집는다.
 */
export function nearestSnap(
  heights: Record<SheetSnap, number>,
  visible: number,
  velocityY: number,
): SheetSnap {
  const projected = visible - velocityY * 0.18;
  let best: SheetSnap = 'peek';
  let bestDist = Infinity;
  for (const snap of Object.keys(heights) as SheetSnap[]) {
    const d = Math.abs(heights[snap] - projected);
    if (d < bestDist) {
      best = snap;
      bestDist = d;
    }
  }
  return best;
}

export function nextSnap(snap: SheetSnap): SheetSnap {
  return snap === 'peek' ? 'half' : snap === 'half' ? 'full' : 'peek';
}
