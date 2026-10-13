// @vitest-environment node
import { describe, expect, it } from 'vitest';
import type { Visit } from './types';
import {
  stayDays,
  stayNights,
  totalStayDays,
  totalVisits,
  uniqueCityCount,
  uniqueCountryCount,
  visitsByCity,
} from './selectors';

const v = (id: string, cityId: string, date: string, endDate?: string, createdAt = 0): Visit => ({
  id,
  cityId,
  date,
  ...(endDate ? { endDate } : {}),
  note: '',
  photos: [],
  createdAt,
  updatedAt: createdAt,
});

const visits = [
  v('1', 'prague', '2025-04-30', '2025-05-02'),
  v('2', 'paris', '2026-03-14'),
  v('3', 'prague', '2025-12-20', '2025-12-23'),
  v('4', 'prague', '2026-10-13'),
];

describe('selectors', () => {
  it('고유 도시 수와 총 방문 수를 구분한다', () => {
    expect(uniqueCityCount(visits)).toBe(2);
    expect(totalVisits(visits)).toBe(4);
    expect(uniqueCityCount([])).toBe(0);
  });

  it('도시별 방문 목록은 최신순', () => {
    const prague = visitsByCity(visits).get('prague')!;
    expect(prague.map((x) => x.id)).toEqual(['4', '3', '1']);
  });

  it('같은 날짜면 나중에 만든 기록이 먼저', () => {
    const list = visitsByCity([
      v('a', 'x', '2026-01-01', undefined, 1),
      v('b', 'x', '2026-01-01', undefined, 2),
    ]).get('x')!;
    expect(list.map((x) => x.id)).toEqual(['b', 'a']);
  });

  it('머문 일수와 박수', () => {
    expect(stayDays(v('x', 'c', '2026-10-13'))).toBe(1);
    expect(stayNights(v('x', 'c', '2026-10-13'))).toBe(0);
    expect(stayDays(v('x', 'c', '2025-12-20', '2025-12-23'))).toBe(4);
    expect(stayNights(v('x', 'c', '2025-12-20', '2025-12-23'))).toBe(3);
    // 월말·연말을 넘어가는 경우
    expect(stayDays(v('x', 'c', '2025-12-30', '2026-01-02'))).toBe(4);
    // 잘못된 역순 입력은 최소 1일
    expect(stayDays(v('x', 'c', '2026-01-05', '2026-01-01'))).toBe(1);
    expect(totalStayDays(visits.filter((x) => x.cityId === 'prague'))).toBe(3 + 4 + 1);
  });

  it('나라 수는 조회 함수로 계산', () => {
    const countryOf = (id: string) => ({ prague: 'CZ', paris: 'FR' })[id];
    expect(uniqueCountryCount(visits, countryOf)).toBe(2);
    expect(uniqueCountryCount([v('z', 'unknown', '2026-01-01')], countryOf)).toBe(0);
  });
});
