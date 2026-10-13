// @vitest-environment node
import { nearestSnap, nextSnap, PEEK_HEIGHT, snapHeights } from './sheetMath';

describe('바텀시트 단계 계산', () => {
  const h = snapHeights(844);

  it('세 단계 높이는 peek < half < full', () => {
    expect(h.peek).toBe(PEEK_HEIGHT);
    expect(h.half).toBeGreaterThan(h.peek);
    expect(h.full).toBeGreaterThan(h.half);
    expect(h.full).toBe(844 - 68);
  });

  it('홈 인디케이터 영역만큼 peek와 full을 조정한다', () => {
    const notch = snapHeights(844, 47, 34);
    expect(notch.peek).toBe(PEEK_HEIGHT + 34);
    expect(notch.full).toBe(844 - 68 - 47);
  });

  it('아주 작은 화면에서도 peek보다 작아지지 않는다', () => {
    const small = snapHeights(200);
    expect(small.full).toBeGreaterThanOrEqual(small.half);
    expect(small.half).toBeGreaterThanOrEqual(small.peek);
  });

  it('놓은 위치에서 가장 가까운 단계로', () => {
    expect(nearestSnap(h, h.peek + 20, 0)).toBe('peek');
    expect(nearestSnap(h, h.half - 10, 0)).toBe('half');
    expect(nearestSnap(h, h.full - 30, 0)).toBe('full');
  });

  it('빠르게 위로 밀면 한 단계 더 올라간다', () => {
    expect(nearestSnap(h, h.half, -2000)).toBe('full');
    expect(nearestSnap(h, h.half, 2000)).toBe('peek');
  });

  it('손잡이 탭은 peek → half → full → peek 순환', () => {
    expect(nextSnap('peek')).toBe('half');
    expect(nextSnap('half')).toBe('full');
    expect(nextSnap('full')).toBe('peek');
  });
});
