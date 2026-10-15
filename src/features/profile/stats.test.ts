import { describe, expect, it } from 'vitest';
import type { Visit } from '../../db/types';
import { profileStats, timelineByMonth } from './stats';

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

describe('profileStats', () => {
  it('도시(고유)·나라·총 방문 수', () => {
    const s = profileStats([
      visit('cz-prague', '2025-01-01'),
      visit('cz-prague', '2025-02-01'),
      visit('cz-brno', '2025-03-01'),
      visit('fr-paris', '2025-04-01'),
    ]);
    expect(s).toMatchObject({ cities: 3, countries: 2, visits: 4, days: 4 });
    // 도시 3×10 + 나라 2×50 + 보낸 날 4×5 + 재방문 1×5
    expect(s.score).toBe(30 + 100 + 20 + 5);
  });

  it('가장 많이 간 도시: 2번 이상, 많이 간 순, 같으면 최근 순, 최대 3곳', () => {
    const vs = [
      ...['01', '02', '03'].map((m) => visit('cz-prague', `2025-${m}-01`)),
      visit('fr-paris', '2025-01-05'),
      visit('fr-paris', '2025-01-06'),
      visit('at-vienna', '2025-05-01'),
      visit('at-vienna', '2025-06-01'),
      visit('it-rome', '2024-01-01'),
      visit('it-rome', '2024-02-01'),
      visit('es-madrid', '2025-01-01'),
    ];
    expect(profileStats(vs).top).toEqual([
      { cityId: 'cz-prague', count: 3 },
      { cityId: 'at-vienna', count: 2 },
      { cityId: 'fr-paris', count: 2 },
    ]);
  });
});

describe('timelineByMonth', () => {
  it('최신 달이 위, 같은 도시는 날짜순으로 몇 번째인지', () => {
    const a = visit('cz-prague', '2025-03-10');
    const b = visit('cz-prague', '2025-01-02');
    const c = visit('fr-paris', '2025-03-01');
    const months = timelineByMonth([a, b, c]);
    expect(months.map((m) => m.month)).toEqual(['2025-03', '2025-01']);
    expect(months[0]!.entries.map((e) => [e.visit.id, e.nth])).toEqual([
      [a.id, 2],
      [c.id, 1],
    ]);
    expect(months[1]!.entries[0]).toMatchObject({ visit: b, nth: 1 });
  });
});
