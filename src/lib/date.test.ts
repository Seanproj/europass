import { describe, expect, it } from 'vitest';
import {
  addDays,
  formatLat,
  formatLon,
  isCompleteDate,
  koreanDate,
  stampDate,
  stayLabel,
  todayISO,
} from './date';

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

describe('점 표기 날짜', () => {
  it('날짜와 연월', async () => {
    const { dotDate, dotMonth, dateRange } = await import('./date');
    expect(dotDate('2025-12-20')).toBe('2025.12.20');
    expect(dotMonth('2025-04-30')).toBe('2025.04');
    expect(dateRange('2025-12-20')).toBe('2025.12.20');
    expect(dateRange('2025-12-20', '2025-12-23')).toBe('2025.12.20 – 12.23');
    expect(dateRange('2025-12-30', '2026-01-02')).toBe('2025.12.30 – 2026.01.02');
  });
});

describe('날짜 입력', () => {
  it('addDays: 달·해·윤년을 넘어도 달력대로', () => {
    expect(addDays('2014-01-15', 2)).toBe('2014-01-17');
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29');
    expect(addDays('2025-12-31', 1)).toBe('2026-01-01');
  });

  it('isCompleteDate: 연도를 치는 중인 값과 없는 날짜는 저장하지 않는다', () => {
    expect(isCompleteDate('2014-01-15')).toBe(true);
    expect(isCompleteDate('0201-01-15')).toBe(false);
    expect(isCompleteDate('2014-02-30')).toBe(false);
    expect(isCompleteDate('')).toBe(false);
    expect(isCompleteDate('2030-01-01', '2026-10-14')).toBe(false);
  });

  it('머문 기간 표기', () => {
    expect(stayLabel(0)).toBe('당일');
    expect(stayLabel(2)).toBe('2박 3일');
  });
});
