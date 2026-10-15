export interface LensSpot {
  cityId: string;
  x: number;
  y: number;
  r: number;
  /** 클수록 먼저 남긴다 (홈 · 많이 간 도시 · 큰 도시) */
  priority: number;
}

/**
 * 렌즈끼리 겹치면 우선순위가 높은 것만 렌즈로 남긴다 (나머지는 점으로).
 * 살짝 닿는 정도(반지름 합의 85%까지)는 허용. 반환: 렌즈로 남길 도시 id
 */
export function declutterLenses(spots: LensSpot[], overlap = 0.85): Set<string> {
  const kept: LensSpot[] = [];
  for (const s of [...spots].sort((a, b) => b.priority - a.priority)) {
    if (kept.some((k) => Math.hypot(k.x - s.x, k.y - s.y) < (k.r + s.r) * overlap)) continue;
    kept.push(s);
  }
  return new Set(kept.map((k) => k.cityId));
}
