import { describe, expect, it } from 'vitest';
import { formatLat, formatLon, koreanDate, stampDate, todayISO } from './date';

describe('날짜와 좌표 표기', () => {
  it('오늘은 기기 시간대 기준', () => {
    expect(todayISO(new Date(2026, 9, 3, 23, 59))).toBe('2026-10-03');
  });

  it('도장 날짜는 "13 OCT 2026"', () => {
    expect(stampDate('2026-10-13')).toBe('13 OCT 2026');
    expect(stampDate('2025-01-05')).toBe('5 JAN 2025');
  });

  it('한국어 날짜', () => {
    expect(koreanDate('2026-10-13')).toBe('2026년 10월 13일');
  });

  it('좌표는 소수 4자리 + 방위', () => {
    expect(formatLat(50.0755)).toBe('50.0755° N');
    expect(formatLon(14.4378)).toBe('14.4378° E');
    expect(formatLon(-9.1393)).toBe('9.1393° W');
  });
});
