import { describe, expect, it } from 'vitest';
import { declutterLenses } from './declutter';

const spot = (cityId: string, x: number, y: number, priority: number, r = 20) => ({
  cityId,
  x,
  y,
  r,
  priority,
});

describe('렌즈 겹침 정리', () => {
  it('떨어져 있으면 모두 렌즈', () => {
    expect([...declutterLenses([spot('a', 0, 0, 1), spot('b', 100, 0, 1)])].sort()).toEqual(['a', 'b']);
  });

  it('겹치면 우선순위 높은 쪽만 남긴다', () => {
    const kept = declutterLenses([spot('small', 0, 0, 1), spot('big', 10, 0, 5), spot('far', 200, 0, 0)]);
    expect([...kept].sort()).toEqual(['big', 'far']);
  });

  it('살짝 닿는 정도(반지름 합의 85% 이상 떨어짐)는 둘 다 남긴다', () => {
    expect(declutterLenses([spot('a', 0, 0, 1), spot('b', 36, 0, 0)]).size).toBe(2);
    expect(declutterLenses([spot('a', 0, 0, 1), spot('b', 30, 0, 0)]).size).toBe(1);
  });

  it('남긴 렌즈하고만 비교한다 (사슬처럼 이어진 세 개 → 양 끝 둘)', () => {
    const kept = declutterLenses([spot('L', 0, 0, 3), spot('M', 30, 0, 2), spot('R', 60, 0, 1)]);
    expect([...kept].sort()).toEqual(['L', 'R']);
  });
});
