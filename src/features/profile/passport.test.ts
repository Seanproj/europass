import { describe, expect, it } from 'vitest';
import { CITIES } from '../../data/cities';
import type { Visit } from '../../db/types';
import { passport } from './passport';

const visit = (id: string, cityId: string, date: string): Visit => ({
  id,
  cityId,
  date,
  note: '',
  photos: [],
  createdAt: 0,
  updatedAt: 0,
});

describe('내 여권', () => {
  it('도시마다 도장 하나, 첫 방문순. 도장 날짜는 가장 최근 방문', () => {
    const gem = CITIES.find((c) => c.gem)!;
    const p = passport([
      visit('a', 'fr-paris', '2026-05-01'),
      visit('b', 'cz-prague', '2025-01-10'),
      visit('c', 'cz-prague', '2026-03-02'),
      visit('d', gem.id, '2025-06-01'),
      visit('x', 'zz-nowhere', '2024-01-01'),
    ]);
    expect(p.stamps.map((s) => s.city.id)).toEqual(['cz-prague', gem.id, 'fr-paris']);
    expect(p.stamps[0]).toMatchObject({ count: 2, first: '2025-01-10', latest: { id: 'c' } });
    expect(p.all).toEqual({ got: 3, total: CITIES.length });
    expect(p.gold.got).toBe(1);
    expect(p.gold.total).toBe(CITIES.filter((c) => c.gem).length);
    // 프라하·파리는 수도
    expect(p.capitals.got).toBe(2);
  });

  it('기록이 없으면 빈 여권', () => {
    const p = passport([]);
    expect(p.stamps).toEqual([]);
    expect(p.all.got).toBe(0);
  });
});
