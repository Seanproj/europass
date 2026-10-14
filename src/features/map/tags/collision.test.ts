import { describe, expect, it } from 'vitest';
import { circleRectOverlap, placeTags, rectsOverlap } from './collision';
import { lensCacheKey } from '../lens/cacheKey';

describe('라벨 충돌 판정', () => {
  it('사각형끼리', () => {
    const a = { x: 0, y: 0, w: 10, h: 10 };
    expect(rectsOverlap(a, { x: 5, y: 5, w: 10, h: 10 })).toBe(true);
    expect(rectsOverlap(a, { x: 12, y: 0, w: 10, h: 10 })).toBe(false);
    expect(rectsOverlap(a, { x: 12, y: 0, w: 10, h: 10 }, 4)).toBe(true);
  });

  it('원과 사각형: 모서리 근처는 실제 거리로 판정', () => {
    const rect = { x: 0, y: 0, w: 10, h: 10 };
    expect(circleRectOverlap({ x: 5, y: 5, r: 1 }, rect)).toBe(true);
    expect(circleRectOverlap({ x: 15, y: 5, r: 6 }, rect)).toBe(true);
    // 오른쪽 아래 모서리에서 대각선으로 (3,3) 떨어진 원: 거리 4.24
    expect(circleRectOverlap({ x: 13, y: 13, r: 4 }, rect)).toBe(false);
    expect(circleRectOverlap({ x: 13, y: 13, r: 5 }, rect)).toBe(true);
  });

  it('태그끼리 겹치면 우선순위가 높은 쪽이 원래 자리를 차지하고, 낮은 쪽은 비켜 선다', () => {
    const visible = placeTags(
      [
        { id: 'DE', rect: { x: 0, y: 0, w: 60, h: 20 }, priority: 10 },
        { id: 'LU', rect: { x: 40, y: 5, w: 40, h: 20 }, priority: 1 },
      ],
      [],
    );
    expect(visible.get('DE')).toEqual([0, 0]);
    expect(visible.get('LU')).not.toEqual([0, 0]);
  });

  it('렌즈에 가리면 비켜 서고, 어디에도 자리가 없으면 숨긴다', () => {
    const visible = placeTags(
      [
        { id: 'CZ', rect: { x: 200, y: 0, w: 60, h: 20 }, priority: 5 },
        { id: 'XX', rect: { x: 500, y: 500, w: 20, h: 20 }, priority: 1 },
      ],
      [
        { x: 230, y: 10, r: 12 },
        { x: 510, y: 510, r: 200 },
      ],
    );
    // 렌즈(반지름 12) 아래로 비켜 섬: 원래 자리 + 높이 + 간격
    expect(visible.get('CZ')).toEqual([0, 24]);
    expect(visible.has('XX')).toBe(false);
  });
});

describe('렌즈 캐시 키', () => {
  it('도시, 테마, 스타일 버전을 모두 담는다', () => {
    expect(lensCacheKey('cz-prague', 'light')).toBe('cz-prague|light|v1');
    expect(lensCacheKey('cz-prague', 'dark')).not.toBe(lensCacheKey('cz-prague', 'light'));
    expect(lensCacheKey('cz-prague', 'light', 2)).toBe('cz-prague|light|v2');
  });
});
