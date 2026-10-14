// @vitest-environment node
import { computeStats } from './useStats';
import type { Visit } from '../db/types';

const v = (id: string, cityId: string): Visit => ({
  id,
  cityId,
  date: '2026-01-01',
  note: '',
  photos: [],
  createdAt: 0,
  updatedAt: 0,
});

describe('computeStats', () => {
  it('재방문은 도시 수에 한 번만 센다', () => {
    const s = computeStats([
      v('1', 'cz-prague'),
      v('2', 'cz-prague'),
      v('3', 'fr-paris'),
      v('4', 'de-munich'),
    ]);
    expect(s).toMatchObject({ cities: 3, countries: 3, visits: 4 });
    expect(s.countryCodes.sort()).toEqual(['CZ', 'DE', 'FR']);
  });

  it('기록이 없으면 0', () => {
    expect(computeStats([])).toMatchObject({ cities: 0, countries: 0, visits: 0, countryCodes: [] });
    expect(computeStats([]).counts.size).toBe(0);
  });
});
