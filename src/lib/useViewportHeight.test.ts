import { describe, expect, it } from 'vitest';
import { keyboardInset } from './useViewportHeight';

describe('키보드 높이', () => {
  it('보이는 화면이 줄어든 만큼이 키보드 (iOS Safari)', () => {
    expect(keyboardInset(844, 508, 0)).toBe(336);
  });

  it('보이는 화면이 위로 밀렸으면 그만큼 뺀다', () => {
    expect(keyboardInset(844, 508, 120)).toBe(216);
  });

  it('키보드가 없거나 레이아웃이 같이 줄어든 브라우저(안드로이드 크롬)는 0', () => {
    expect(keyboardInset(844, 844, 0)).toBe(0);
    expect(keyboardInset(508, 508, 0)).toBe(0);
  });

  it('주소창이 접히는 정도의 작은 차이는 무시', () => {
    expect(keyboardInset(844, 810, 0)).toBe(0);
  });
});
