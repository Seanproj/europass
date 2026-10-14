import { describe, expect, it } from 'vitest';
import type { Visit } from '../../db/types';
import { recentStamps, wrapYearFor } from './cardData';

let n = 0;
const visit = (cityId: string, date: string): Visit => ({
  id: `v${++n}`,
  cityId,
  date,
  note: '',
  photos: [],
  createdAt: n,
  updatedAt: n,
});

describe('recentStamps', () => {
  it('같은 도시는 한 번, 최신순, 모르는 도시는 건너뜀', () => {
    const list = recentStamps(
      [
        visit('cz-prague', '2026-01-01'),
        visit('fr-paris', '2026-02-01'),
        visit('cz-prague', '2026-03-01'),
        visit('xx-nowhere', '2026-04-01'),
      ],
      6,
    );
    expect(list.map((s) => [s.city.id, s.visit.date])).toEqual([
      ['cz-prague', '2026-03-01'],
      ['fr-paris', '2026-02-01'],
    ]);
  });
});

describe('wrapYearFor (결산 배너는 12월 1일 ~ 1월 31일)', () => {
  it.each([
    ['2026-12-01', 2026],
    ['2026-12-31', 2026],
    ['2027-01-01', 2026],
    ['2027-01-31', 2026],
    ['2027-02-01', null],
    ['2026-11-30', null],
    ['2026-06-15', null],
  ])('%s → %s', (today, year) => {
    expect(wrapYearFor(today)).toBe(year);
  });
});
